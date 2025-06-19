from django.shortcuts import render
import random
import sys
import requests
import ssl
import websockets
import redis
from .tournamentStatic import Tournament, Player, trnmtDict, user_ws_connections
from channels.layers import get_channel_layer
from django.http import JsonResponse, StreamingHttpResponse
import json

channel_layer = get_channel_layer()

consumerUri = "wss://tournament:8050/ws/game/"

############ JWT ghost player #########
'''
{
	idPlayer : u_int
	username: str 
	isGost: 0/1 [0 : real player / 1 : ghost player ]
	idConnectedPlayer: u_int [ == idPlayer if isGhost : 0 ]
}
'''
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
				print("2", file=sys.stderr)
				message = await ws.recv()
				print(f"data: {message}\n\n", file=sys.stderr)
				yield f"data: {message}\n\n"
	except Exception as e :
		print(f"data: WebSocket stop, error : {e}\n\n", file=sys.stderr)
		yield f"data: WebSocket stop, error : {e}\n\n"


async def decodeJWT(request, encodedJwt=None) :
	if not encodedJwt :
		encodedJwt = request.headers.get("Authorization", None)
	if not encodedJwt :
		return (None, [None])
	
	# res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
	print(f"encoded: {encodedJwt}", file=sys.stderr)
	try :
		res = requests.get(f'https://access-postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"{encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
	except Exception as e :
		print(f"Error : {e}", file=sys.stderr)
	print(f"res : {res.status_code}", file=sys.stderr)
	if res.status_code != 200 :
		print(f"Not recognized, code = {res.status_code} Body : ", file=sys.stderr)
		return (None, [None])
	return (encodedJwt, [res.json()])

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
async def launchFirstRound(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		if tkey not in trnmtDict:
			return JsonResponse({"Error": "Tournament not found"}, status=404)
		await trnmtDict[tkey].launchTournament()

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": "create-bracket"
			}
		)
	except TournamentError as e:
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception:
		return JsonResponse({"error": "Internal server error"}, status=500)

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


# @csrf_exempt
async def joinTournament(request):
	try:
		print(f"111", file=sys.stderr)
		body = json.loads(request.body)
		print(f"222 : {body}", file=sys.stderr)
		encoded, jwt_token = await decodeJWT(request)
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
	tKey = request.GET.get("tkey", None)
	jwt = request.GET.get("jwt", None)
	return StreamingHttpResponse(checkForUpdates(f'{consumerUri}?tkey={tKey}&jwt={jwt}'), content_type='text/event-stream')
# @csrf_exempt

async def leaveTournament(request):
	try :
		print("11", file=sys.stderr)
		body = json.loads(request.body)
		print("22", file=sys.stderr)
		encoded, jwt_token = await decodeJWT(request)
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
			print(f"111 : {listJWT}", file=sys.stderr)
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

			return JsonResponse({"Result" : "Player removed from lobby"})
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
