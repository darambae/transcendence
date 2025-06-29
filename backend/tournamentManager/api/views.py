from django.shortcuts import render
import random
import sys
import requests
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

# Create your views here.

class TournamentError(Exception) :
	pass

async def  checkForUpdates(uriKey) :
	try :
		print("0", file=sys.stderr)
		ssl_context = ssl.create_default_context()
		print("0.1", file=sys.stderr)
		ssl_context.load_verify_locations('/certs/fullchain.crt')
		print(f"0.2 : {uriKey}", file=sys.stderr)
		async with websockets.connect(uriKey, ssl=ssl_context) as ws:
			print("1", file=sys.stderr)
			while True:
				try:
					message = await asyncio.wait_for(ws.recv(), timeout=20)
					print(f"data: {message}\n\n", file=sys.stderr)
					yield f"data: {message}\n\n"
				except asyncio.TimeoutError:
					# Do something else on timeout
					print("No message received within timeout.", file=sys.stderr)
					yield "data: hearthbeat\n\n"  # or any other fallback action
	except Exception as e :
		print(f"data: WebSocket stop, error : {e}\n\n", file=sys.stderr)
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
	# with open("log-auth-cookie.txt", "w+") as f :
	# 	print(f"body : {response}\naccess : {access}\nrefresh : {refresh}", file=f)
	return response

async def decodeJWT(request, func=None, encodedJwt=None) :
	# with open(f"{func}_decodeJWT.txt", "a+") as f :
	#     tm = datetime.now()
	#     print(f"--------------------------\nBeginning : {tm.hour}:{tm.minute}:{tm.second} ", file=f) 
	# with open(f"{func}_decodeJWT.txt", "a") as f : 
	if not encodedJwt :
		encodedJwt = request.COOKIES.get("access_token", None)
	if not encodedJwt :
		# print("Error 1", file=f)
		return [None] * 3
	
	# print(f"encoded: {encodedJwt}", file=f)
	res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
	# print(f"res : {res}", file=f)
	res_json = res.json()
	# print(f"res.json() : {res_json}", file=f)
	if res.status_code != 200 :
		# print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=f)
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

# # @csrf_exempt
async def launchFinals(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		trnmtDict[tkey].launchTournament()
	except Exception :
		return JsonResponse({"error": "Internal server error"}, status=500)

# # @csrf_exempt
async def launchMatch(request) :
	try:
		print("lm-1", file=sys.stderr)
		body = json.loads(request.body)
		print("lm-1", file=sys.stderr)
		tkey = body["tKey"]
		print(f"tkey : {tkey}, tr : {trnmtDict[tkey]}", file=sys.stderr)
		print("lm-1", file=sys.stderr)
		if tkey not in trnmtDict:
			print("lm-1-end", file=sys.stderr)
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		print("lm-1", file=sys.stderr)
		trStart = trnmtDict[tkey].launchTournament()
		print("lm-1", file=sys.stderr)
		if not trStart[0] :
			print("lm-1-end3", file=sys.stderr)
			return JsonResponse({"Info" : trStart[1]})
		print(f"lm-1, tkey : {tkey}", file=sys.stderr)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "create-bracket"}
			}
		)
		print("lm-1", file=sys.stderr)
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		print("lm-2-end", file=sys.stderr)
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

# @csrf_exempt
async def launchFinals(request) :
	try :
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict :
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		await channel_layer.group_send(
			tkey,
			{
				"type" : "tempReceived",
				"text_data" : "final-matches"
			}
		)
	
	except Exception as e:
		return JsonResponse({"error": "Internal server error"}, status=500)

async def checkSSE(request) :
	try:
		jwt = decodeJWT(request)[0]
		vlue = uuid.uuid4()
		dictJwt[vlue] = jwt
		return JsonResponse({"key" : vlue})



async def joinGuest(request) :
	try:
		print(f"111", file=sys.stderr)
		jwt_token = await decodeJWT(request)
		try :
			print(f"223 : {jwt_token}")
			jwt_token = jwt_token[0]
			print(f"333 : {jwt_token}", file=sys.stderr)
			jwt_token = jwt_token["payload"]
			print(f"334 : {jwt_token}", file=sys.stderr)
			username = jwt_token["username"]
			guest = jwt_token["invites"][-1]
			print(f"444 : {username}", file=sys.stderr)
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		for elem in trnmtDict :
			if username in trnmtDict[elem].listUsr() :
				tKey = elem
		print(f"555 : {tKey}", file=sys.stderr)

		if tKey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		print(666, file=sys.stderr)
		player = Player(jwt_token, guest)
		print(777, file=sys.stderr)
		trnmtDict[tKey].addPlayers(player)
		return JsonResponse({"Success" : f"{guest} added as a guest"})

	except Exception as e :
		print(f"Error : {e}", file=sys.stderr)

# @csrf_exempt
async def joinTournament(request):
	try:
		print(f"111", file=sys.stderr)
		body = json.loads(request.body)
		print(f"222 : {body}", file=sys.stderr)
		jwt_token = await decodeJWT(request)
		try :
			print(f"223 : {jwt_token}")
			jwt_token = jwt_token[0]
			print(f"333 : {jwt_token}", file=sys.stderr)
			jwt_token = jwt_token["payload"]
			print(f"334 : {jwt_token}", file=sys.stderr)
			username = jwt_token["username"]
			print(f"444 : {username}", file=sys.stderr)
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		tKey = body["tKey"]
		print(f"555 : {tKey}", file=sys.stderr)

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
		# response['Cache-Control'] = 'no-cache'
		# return response

	except Exception as e:
		return JsonResponse({"error": "Internal server error"}, status=500)


async def sse(request) :
	tKey = request.GET.get("tKey", None)
	print(f"sse - tKey : {tKey}", file=sys.stderr)
	jwt = request.GET.get("jwt", None)
	jwt = dictJwt.get(jwt, None)
	return StreamingHttpResponse(checkForUpdates(f'{consumerUri}?tkey={tKey}&jwt={jwt}'), content_type='text/event-stream')
# @csrf_exempt

async def leaveTournament(request):
	try :
		print("11", file=sys.stderr)
		body = json.loads(request.body)
		print("22", file=sys.stderr)
		jwt_token = await decodeJWT(request)
		encoded = request.COOKIES.get("access_token", None)
		print("33", file=sys.stderr)
		try :
			print("44", file=sys.stderr)
			jwt_token = jwt_token[0]
			print("55", file=sys.stderr)
			jwt_token = jwt_token["payload"]
			print("66", file=sys.stderr)
			username = jwt_token["username"]
			print("77", file=sys.stderr)
		except Exception :
			return JsonResponse({"Error": "Unauthorized"}, status=401)
		print("88", file=sys.stderr)
		tKey = body["tKey"]
		print(f"99 : {tKey}", file=sys.stderr)
		if tKey in trnmtDict :
			listJWT = trnmtDict[tKey].listJWT()
			listUsername = trnmtDict[tKey].listUsr()
			print(f"111 : {listJWT} | {listUsername}", file=sys.stderr)
			lsTmp = []
			for i in range(len(listJWT)) :
				print(f"222 : {i}", file=sys.stderr)
				if listJWT[i]["username"] != username:
					print(f'333 : {listJWT[i]["username"]}', file=sys.stderr)
					lsTmp.append(trnmtDict[tKey].players[i])
			ws = user_ws_connections.get(username)
			if ws:
				await ws.close()
				user_ws_connections.pop(username, None)
			print("444", file=sys.stderr)
			trnmtDict[tKey].players = lsTmp
			print("555", file=sys.stderr)
			trnmtDict[tKey].nbPl = len(lsTmp)
			print("666", file=sys.stderr)
			print("777", file=sys.stderr)

			response = requests.delete("https://access_postgresql:4000/api/guest/", headers={"Authorization" : f"bearer {encoded}", 'Host': 'localhost'}, verify=False)
			print("888", file=sys.stderr)
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


async def tournamentManager(request) :
	try :
		print(f"action : {request.method}", file=sys.stderr)
		if request.method == "GET" :
			return await listTournament(request)
		elif request.method == "POST" :
			data = json.loads(request.body.decode('utf-8'))
			print(f"action posted", file=sys.stderr)
			print(f"action : {data['action']}", file=sys.stderr)
			if data["action"] == "create" :
				return await createTournament(request)
			elif data["action"] == "leave" :
				return await leaveTournament(request)
			else :
				return await joinTournament(request)
		# elif request.method == "DELETE" :
	except Exception as e :
		return JsonResponse({"error" : "Internal server error"}, status=500)
