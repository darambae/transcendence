from django.shortcuts import render
import random
import sys
import requests
from django.http import HttpResponse
from http import HTTPStatus
from django.views.decorators.csrf import csrf_exempt
import uuid
import ssl
import websockets
import asyncio
import redis
from .tournamentStatic import Tournament, Player, trnmtDict, user_ws_connections, dictJwt
from channels.layers import get_channel_layer
from django.http import JsonResponse, StreamingHttpResponse
import json

channel_layer = get_channel_layer()

consumerUri = "wss://tournament:8050/ws/game/"

class HttpResponseNoContent(HttpResponse):
	status_code = HTTPStatus.NO_CONTENT


class TournamentError(Exception) :
	pass

async def  checkForUpdates(uriKey) :
	try :
		ssl_context = ssl.create_default_context()
		ssl_context.load_verify_locations('/certs/fullchain.crt')
		async with websockets.connect(uriKey, ssl=ssl_context) as ws:
			while True:
				try:
					message = await asyncio.wait_for(ws.recv(), timeout=20)
					yield f"data: {message}\n\n"
				except asyncio.TimeoutError:
					yield "data: hearthbeat-Tournament\n\n"
	except Exception as e :
		yield f"data: WebSocket stop, error : {e}\n\n"


async def setTheCookie(response, access=None, refresh=None) :
	if access :
		response.set_cookie(
			key="access_token",
			value=access,
			httponly=True,
			samesite='Lax'
		)
	if refresh :
		response.set_cookie(
			key="refresh_token",
			value=refresh,
			httponly=True,
			samesite='Lax'
		)
	return response

async def decodeJWT(request, func=None, encodedJwt=None) :
	if not encodedJwt :
		encodedJwt = request.COOKIES.get("access_token", None)
	if not encodedJwt :
		return [None] * 3

	res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
	res_json = res.json()
	if res.status_code != 200 :
		if (res_json.get('error') == "Token expired"):
			refresh_res = requests.get(f'https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
			if refresh_res.status_code == 200:
				new_access_token = refresh_res.json().get('access')
				res2 = requests.post('https://access_postgresql:4000/api/DecodeJwt',headers={"Authorization": f"bearer {new_access_token}", 'Host': 'localhost'}, verify=False)
				res2 = await setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
				return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
			return [None] * 3
		return [None] * 3
	return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]


@csrf_exempt
async def launchMatch(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		if trnmtDict[tkey].launched :
			return JsonResponse({"Error" : "Tournament already launched"}, status=403)
		trStart = trnmtDict[tkey].launchTournament(request.COOKIES)
		if not trStart[0] :
			return JsonResponse({"Info" : trStart[1]})
		lsTrnmtJwt = trnmtDict[tkey].listJWT()

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "update-guest", "jwt-list" : lsTrnmtJwt}
			}
		)

		asyncio.sleep(5)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "create-bracket"}
			}
		)
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
async def launchFinals(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "final-matches"}
			}
		)
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
async def launchNextMatch(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		if trnmtDict[tkey].nbPl != 4 :
			return JsonResponse({"Error": "Forbidden"}, status=200)
		if trnmtDict[tkey].launched == False :
			return JsonResponse({"Error": "Forbidden"}, status=403)
		if (trnmtDict[tkey].first and trnmtDict[tkey].second and trnmtDict[tkey].third and trnmtDict[tkey].fourth) :
			return JsonResponse({"Info" : "Results", "first" : trnmtDict[tkey].first.username, "second" : trnmtDict[tkey].second.username, "third" : trnmtDict[tkey].third.username, "fourth" : trnmtDict[tkey].fourth.username})
		if not trnmtDict[tkey].match1.played or not trnmtDict[tkey].match2.played :
			await channel_layer.group_send(
				tkey,
				{
					"type": "tempReceived",
					"text_data": {"action" : "create-bracket"}
				}
			)
		else :
			await channel_layer.group_send(
				tkey,
				{
					"type": "tempReceived",
					"text_data": {"action" : "final-matches"}
				}
			)
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
async def checkSSE(request) :
	try:
		jwt = await decodeJWT(request)
		if not jwt[0] :
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		jwt = jwt[0]['payload']
		return JsonResponse({"userId" : jwt["user_id"], "key" : jwt["username"], "guests" : ','.join(jwt["invites"])})
	except Exception as e :
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)


@csrf_exempt
async def joinGuest(request) :
	try:
		jwt_token = await decodeJWT(request)
		if not jwt_token[0] :
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		try :
			jwt_token = jwt_token[0]
			jwt_token = jwt_token["payload"]
			username = jwt_token["username"]
			guest = jwt_token["invites"][-1]
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		for elem in trnmtDict :
			if username in trnmtDict[elem].listUsr() :
				tKey = elem

		if tKey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		lsTrnmtJwt = trnmtDict[tKey].listJWT()
		await channel_layer.group_send(
			tKey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "update-guest", "jwt-list" : lsTrnmtJwt}
			}
		)

		asyncio.sleep(0.5)

		player = Player(jwt_token, guest)
		trnmtDict[tKey].addPlayers(player)
		return JsonResponse({"Success" : f"{guest} added as a guest"})

	except Exception as e :
		print(f"Error : {e}", file=sys.stderr)



async def joinTournament(request):
	try:
		body = json.loads(request.body)
		jwt_token = await decodeJWT(request)
		if not jwt_token[0] :
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		try :
			jwt_token = jwt_token[0]
			jwt_token = jwt_token["payload"]
			username = jwt_token["username"]
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		tKey = body["tKey"]

		if tKey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)

		try :
			for elem in trnmtDict :
				if username in trnmtDict[elem].listUsr() :
					return JsonResponse({"Error" : "player already in a tournament"}, status=403)
		except Exception as e :
			print(f"Error : {e}", file=sys.stderr)
		player = Player(jwt_token, username)
		trnmtDict[tKey].addPlayers(player)

		return JsonResponse({"key" : tKey, "main" : username})

	except Exception as e:
		return JsonResponse({"error": f"Internal server error {e}"}, status=500)

@csrf_exempt
async def sse(request) :
	tKey = request.GET.get("tKey", None)
	name = request.GET.get("name", None)
	return StreamingHttpResponse(checkForUpdates(f'{consumerUri}?tkey={tKey}&name={name}'), content_type='text/event-stream')


@csrf_exempt
async def getIds(request) :
	jwt = await decodeJWT(request)
	jwt = jwt[0]['payload']
	body = json.loads(request.body)
	tkey = body.get("tkey")
	u1 = body.get("u1")
	u2 = body.get("u2")

	listPl = [jwt["username"]] + jwt["invites"]

	i1 = listPl.index(u1) - 1
	i2 = listPl.index(u2) - 1
	return JsonResponse({"id1" : i1, "id2" : i2})

async def leaveTournament(request):
	try :
		body = json.loads(request.body)
		jwt_token = await decodeJWT(request)
		if not jwt_token[0] :
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		encoded = request.COOKIES.get("access_token", None)
		try :
			jwt_token = jwt_token[0]
			jwt_token = jwt_token["payload"]
			username = jwt_token["username"]
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		tKey = body["tKey"]
		if tKey in trnmtDict :
			listJWT = trnmtDict[tKey].listJWT()
			listUsername = trnmtDict[tKey].listUsr()
			lsTmp = []
			for i in range(len(listJWT)) :
				if listJWT[i]["username"] != username:
					lsTmp.append(trnmtDict[tKey].players[i])
			await channel_layer.group_send(
				tKey,
				{
					"type" : "sendHB",
					"text_data" : {"lorem" : "ipsum"}
				}
			)
			ws = user_ws_connections.get(username)
			if ws:
				await ws.close()
				user_ws_connections.pop(username, None)
			trnmtDict[tKey].players = lsTmp
			trnmtDict[tKey].nbPl = len(lsTmp)

			response = requests.delete("https://access_postgresql:4000/api/guest/", headers={"Authorization" : f"bearer {encoded}", 'Host': 'localhost'}, verify=False)
			if response.status_code == 200 :
				res_json = response.json()
				access = res_json.get("access", "None")
				refresh = res_json.get("refresh", "None")

				return await setTheCookie(JsonResponse({"Result" : "Player removed from lobby"}), access, refresh)
		return JsonResponse({"Error" : "Tournament not found"}, status=404)
	except Exception as e:
		return JsonResponse({"error" : f"Internal server errrrror : {e}"}, status=500)

async def createTournament(request) :
	try :
		if (len(list(trnmtDict.keys())) > 9) :
			return JsonResponse({"Error" : "Already 10 tournaments"}, status=403)
		tr = Tournament()
		trnmtDict[tr.tKey] = tr
		return JsonResponse({"Result" : "Tournament succefully created"})
	except Exception :
		return JsonResponse({"error" : "Internal server error"}, status=500)

async def listTournament(request) :
	try :
		trnmtList = {}
		for elem in trnmtDict :
			trnmtList[elem] = f"{trnmtDict[elem].nbPl} / 4"

		return JsonResponse({"list" : trnmtList})
	except Exception as e :
		return JsonResponse({"error" : "Internal server error"}, status=500)

@csrf_exempt
async def tournamentManager(request) :
	try :
		if request.method == "GET" :
			return await listTournament(request)
		elif request.method == "POST" :
			data = json.loads(request.body.decode('utf-8'))
			if data["action"] == "create" :
				return await createTournament(request)
			elif data["action"] == "leave" :
				return await leaveTournament(request)
			else :
				return await joinTournament(request)
	except Exception as e :
		return JsonResponse({"error" : f"Internal server error {e}"}, status=500)

@csrf_exempt
async def Supervise(request) :
	try :
		channel_layer = get_channel_layer()
		jwt = await decodeJWT(request)
		jwt = jwt[0]['payload']
		tkey = request.GET.get("tkey")
		mkey = request.GET.get("key")
		roundM = request.GET.get("round", 1)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "supervise", "round" : roundM, "mKey" : mkey, "tkey" : tkey, "player" : jwt["username"]}
			}
		)
		return JsonResponse({"Success" : "Done"})
	except Exception as e :
		return HttpResponseNoContent()

@csrf_exempt
async def amIinTournament(request) :
	try :
		jwt = await decodeJWT(request)

		jwt = jwt[0]['payload']
		for elem in trnmtDict :
			lsJwt = trnmtDict[elem].listJWTPlayers()
			if (jwt["username"] in lsJwt) :
				lsPlayer = trnmtDict[elem].listUsr()
				return JsonResponse({"Tournament" : elem, "number" : trnmtDict[elem].nbPl, "players" : lsPlayer})
		return JsonResponse({"Tournament" : "None"})
	except Exception as e :
		return JsonResponse({"Error" : "Unauthorized"}, status=401)

@csrf_exempt
async def getResults(request, tkey) :
	return JsonResponse({"Info" : "Results", "first" : trnmtDict[tkey].first.username, "second" : trnmtDict[tkey].second.username, "third" : trnmtDict[tkey].third.username, "fourth" : trnmtDict[tkey].fourth.username})

@csrf_exempt
async def clearGuests(request) :
	jwt_token = await decodeJWT(request)
	if not jwt_token[0] :
		return JsonResponse({"Error" : "Unauthorized"}, status=401)
	encoded = request.COOKIES.get("access_token", None)
	try :
		jwt_token = jwt_token[0]
		jwt_token = jwt_token["payload"]
		username = jwt_token["username"]
	except Exception :
		return JsonResponse({"Error": "Unauthorized"}, status=401)
	
	response = requests.delete("https://access_postgresql:4000/api/guest/", headers={"Authorization" : f"bearer {encoded}", 'Host': 'localhost'}, verify=False)
	if response.status_code == 200 :
		res_json = response.json()
		access = res_json.get("access", "None")
		refresh = res_json.get("refresh", "None")

		return await setTheCookie(JsonResponse({"Result" : "Guests cleared"}), access, refresh)
	else :
		return JsonResponse({"Result" : "No guests to delete"})