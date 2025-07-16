from django.shortcuts import render
from django.http import HttpResponse
from django.core.cache import cache
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import sys
import ssl
import uuid
import websockets
import json
from channels.layers import get_channel_layer
from datetime import datetime
import requests
from http import HTTPStatus
import asyncio
from serverPong.Racket import dictInfoRackets, wall1, wall2
from serverPong.ball import calcIntersections

channel_layer = get_channel_layer()

uri = "wss://server_pong:8030/ws/game/"

uriJwt = "https://access_postgresql:4000/"

class HttpResponseNoContent(HttpResponse):
	status_code = HTTPStatus.NO_CONTENT

class HttpResponse401(HttpResponse):
	status_code = 401


# apiKey is a string that identifies the game room

class   RequestParsed :
	def __init__(self, apiKey, action) :
		if apiKey in apiKeys or apiKey in apiKeysUnplayable :
			self.apiKey = apiKey
		else :
			self.apiKey = None
		self.action = action

# Create your views here.

def setTheCookie(response, access=None, refresh=None) :
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

def decodeJWT(request, func=None, encodedJwt=None) :
	# Use a default function name if none provided
	log_func = func if func else "unknown"
	
	# Ensure the log file can be created, handle any potential errors
	try:
		with open(f"/app/{log_func}_decodeJWT.txt", "a+") as f :
			tm = datetime.now()
			print(f"--------------------------\nBeginning : {tm.hour}:{tm.minute}:{tm.second} ", file=f) 
	except (OSError, IOError) as e:
		# If file creation fails, print to stderr instead
		print(f"Warning: Could not create log file for {log_func}: {e}", file=sys.stderr)
	
	try:
		with open(f"/app/{log_func}_decodeJWT.txt", "a+") as f : 
			if not encodedJwt :
				encodedJwt = request.COOKIES.get("access_token", None)
			if not encodedJwt :
				print("Error 1", file=f)
				return [None] * 3
			
			print(f"encoded: {encodedJwt}", file=f)
			res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
			print(f"res : {res}", file=f)
			res_json = res.json()
			print(f"res.json() : {res_json}", file=f)
			if res.status_code != 200 :
				print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=f)
				if (res_json.get('error') == "Token expired"):
					refresh_res = requests.get(f'https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
					if refresh_res.status_code == 200:
						new_access_token = refresh_res.json().get('access')
						res2 = requests.post('https://access_postgresql:4000/api/DecodeJwt',headers={"Authorization": f"bearer {new_access_token}", 'Host': 'localhost'}, verify=False)
						res2 = setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
						return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
					return [None] * 3
				return [None] * 3
			return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]
	except (OSError, IOError) as e:
		# If file operations fail, continue without logging
		print(f"Warning: Could not write to log file for {log_func}: {e}", file=sys.stderr)
		# Continue with the JWT decoding logic without file logging
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
					res2 = setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
					return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
				return [None] * 3
			return [None] * 3
		return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]

dictActivePlayer = {}
apiKeysUnplayable = []
dictApi = {}
dictApiSp = {}
dictApiPlayers = {}  # Track players per room: {apikey: [player1_id, player2_id]}
apiKeys = []
#print("VIEW IMPORTEEE", file=sys.stderr)

def getSimulationState(request):
	#print(f"[DEBUG] En attente de l'apiKey", file=sys.stderr)
	apikey = request.GET.get('apikey')
	#print(f"[DEBUG] API Key reçue : {apikey}", file=sys.stderr)
	
	if not apikey:
		return JsonResponse({'error': 'API key manquante'}, status=400)
	
	data = cache.get(f'simulation_state_{apikey}')
	print(f"[DEBUG] Données récupérées du cache : {data}", file=sys.stderr)
	
	if data:
		return JsonResponse(data)
	else:
		return JsonResponse({'error': 'Simulation not found'}, status=404)

# Asynchronous generator function('async' + 'yield') to handle WebSocket connections
# -> When it runs, it produces a value (in this case, a formatted string) and pauses 
# the function’s execution. The next time the generator is iterated, execution resumes right after the yield.
async def  checkForUpdates(uriKey, key) :
	try :
		ssl_context = ssl.create_default_context()
		ssl_context.load_verify_locations('/certs/fullchain.crt')
		async with websockets.connect(uriKey, ssl=ssl_context) as ws:
			while True:
				try:
					message = await asyncio.wait_for(ws.recv(), timeout=20)
					yield f"data: {message}\n\n"
				except asyncio.TimeoutError:
					yield "data: hearthbeat-ServerPong\n\n"
	except Exception as e :
		yield f"data: WebSocket stop, error : {e}\n\n"

async def sseCheck(request) :
	JWT = decodeJWT(request, "sseCheck")
	if not JWT[0] :
		return HttpResponse401()
	return JsonResponse({"username" : JWT[0]['payload']["username"], "guest" : JWT[0]["payload"]["invites"]})

async def sse(request):
	apikey=request.GET.get("apikey")
	AI = request.GET.get('ai')
	idplayer = int(request.GET.get("idplayer"))
	rq = RequestParsed(apikey, {})

	if idplayer == 0 :
		idp1 = int(request.GET.get("JWTidP1"))
		idp2 = int(request.GET.get("JWTidP2"))
		if idp1 < 0 :
			username1 = request.GET.get("username", "Guest")
		else :
			username1 = request.GET.get(f"guest{idp1 + 1}", "Guest")

		if idp2 < 0 :
			username2 = request.GET.get("username", "Guest")
		else :
			username2 = request.GET.get(f"guest{idp2 + 1}", "Guest")
		
		if (rq.apiKey) :
			return StreamingHttpResponse(checkForUpdates(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&u1={username1}&u2={username2}", rq.apiKey), content_type="text/event-stream")

	elif idplayer == 1 :
		idp1 = int(request.GET.get("JWTid"))
		if idp1 < 0 :
			username1 = request.GET.get("username", "Guest")
		else :
			username1 = request.GET.get(f"guest{idp1 + 1}", "Guest")

		if (rq.apiKey) :
			return StreamingHttpResponse(checkForUpdates(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&name={username1}", rq.apiKey), content_type="text/event-stream")
		
	else :
		idp2 = int(request.GET.get("JWTid"))
		if idp2 < 0 :
			username2 = request.GET.get("username", "Guest")
		else :
			username2 = request.GET.get(f"guest{idp2 + 1}", "Guest")

		if (rq.apiKey) :
			return StreamingHttpResponse(checkForUpdates(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&name={username2}", rq.apiKey), content_type="text/event-stream")

@csrf_exempt
def setApiKeySp(request):
	JWT = decodeJWT(request, "setApiKeySp")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
	# print(f" Jwt : {JWT[0]}", file=sys.stderr)
	body = json.loads(request.body)
	apikey = body.get('apiKey')
	dictApiSp[apikey] = 1
	apiKeys.append(apikey)
	return JsonResponse({"playable": "Game can start"})


@csrf_exempt
def setApiKey(request):
	JWT = decodeJWT(request, "setApiKey")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
	
	apikey = json.loads(request.body).get('apiKey')
	# Get user identifier - use user_id if available, otherwise use username or a combination
	user_data = JWT[0]['payload']
	user_id = user_data.get('user_id') or user_data.get('username') or 'anonymous'
	
	# Debug logging
	try:
		with open("/app/setApiKey_decodeJWT.txt", "a+") as f:
			print(f"[DEBUG] setApiKey called - apikey: {apikey}, user_id: {user_id}, user_data: {user_data}", file=f)
			print(f"[DEBUG] Current dictApiPlayers: {dictApiPlayers}", file=f)
			print(f"[DEBUG] Current apiKeys: {apiKeys}", file=f)
			print(f"[DEBUG] Current apiKeysUnplayable: {apiKeysUnplayable}", file=f)
	except Exception as e:
		print(f"Debug logging error: {e}", file=sys.stderr)
	
	if apikey not in apiKeysUnplayable:
		# Debug: Check if it's in other states
		try:
			with open("/app/setApiKey_decodeJWT.txt", "a+") as f:
				print(f"[DEBUG] API key {apikey} not in apiKeysUnplayable!", file=f)
				print(f"[DEBUG] Is in apiKeys: {apikey in apiKeys}", file=f)
				print(f"[DEBUG] Is in dictApiPlayers: {apikey in dictApiPlayers}", file=f)
				if apikey in dictApiPlayers:
					print(f"[DEBUG] Players in room: {dictApiPlayers[apikey]}", file=f)
		except Exception as e:
			print(f"Debug logging error: {e}", file=sys.stderr)
		return JsonResponse({"playable" : f"Room {apikey} doesn't Exists"})
	
	# Check if this room already has enough players
	if apikey in apiKeys:
		return JsonResponse({"playable": "Game can start"})
	
	# Initialize player tracking for this room if not exists
	if apikey not in dictApiPlayers:
		dictApiPlayers[apikey] = []
	
	# Check if this user is already in the room (prevent duplicate joins)
	if user_id in dictApiPlayers[apikey]:
		# User already joined, return current status
		current_count = len(dictApiPlayers[apikey])
	else:
		# Add new player to the room
		dictApiPlayers[apikey].append(user_id)
		current_count = len(dictApiPlayers[apikey])
		
		# Update dictApi for backward compatibility
		dictApi[apikey] = current_count

	# Debug logging
	try:
		with open("/app/setApiKey_decodeJWT.txt", "a+") as f:
			print(f"[DEBUG] After processing - current_count: {current_count}, dictApiPlayers[{apikey}]: {dictApiPlayers.get(apikey, [])}", file=f)
	except Exception as e:
		print(f"Debug logging error: {e}", file=sys.stderr)

	if current_count >= 2 :
		# Room is full, move to playable
		if apikey in apiKeysUnplayable:
			apiKeysUnplayable.remove(apikey)
		if apikey not in apiKeys:
			apiKeys.append(apikey)
		playable = "Game can start"
	else:
		# Waiting for more players
		playable = "Need more player"

	return JsonResponse({"playable": playable})

@csrf_exempt
def isGamePlayable(request) :
	JWT = decodeJWT(request, "isGamePlayable")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
	
	apikey = json.loads(request.body).get('apiKey')
	
	# Debug logging
	try:
		with open("/app/isGamePlayable_decodeJWT.txt", "a+") as f:
			print(f"[DEBUG] isGamePlayable called - apikey: {apikey}", file=f)
			print(f"[DEBUG] dictApiPlayers: {dictApiPlayers}", file=f)
			print(f"[DEBUG] apiKeys: {apiKeys}", file=f)
			print(f"[DEBUG] apiKeysUnplayable: {apiKeysUnplayable}", file=f)
			if apikey in dictApiPlayers:
				print(f"[DEBUG] dictApiPlayers[{apikey}]: {dictApiPlayers[apikey]} (length: {len(dictApiPlayers[apikey])})", file=f)
	except Exception as e:
		print(f"Debug logging error: {e}", file=sys.stderr)
	
	# Check if this room is already playable
	if apikey in apiKeys:
		return JsonResponse({"playable": "Game can start"})
	
	# Use the new player tracking logic
	if apikey in dictApiPlayers and len(dictApiPlayers[apikey]) >= 2:
		# Move to playable if not already there
		if apikey in apiKeysUnplayable:
			apiKeysUnplayable.remove(apikey)
		if apikey not in apiKeys:
			apiKeys.append(apikey)
		playable = "Game can start"
	else:
		playable = "Need more player"
	
	# Debug logging
	try:
		with open("/app/isGamePlayable_decodeJWT.txt", "a+") as f:
			print(f"[DEBUG] Returning playable: {playable}", file=f)
	except Exception as e:
		print(f"Debug logging error: {e}", file=sys.stderr)
	
	return JsonResponse({"playable": playable})


def get_api_key(request):
	JWT = decodeJWT(request, "getApiKey")
	try:
		with open("/app/test.txt", "a+") as f:
			print(f"[DEBUG] get_api_key called - JWT: {JWT[0]}", file=f)
	except Exception as e:
		print(f"Debug logging error: {e}", file=sys.stderr)
	

	if not JWT[0] :
		return HttpResponseNoContent() # Set an error 
	api_key = str(uuid.uuid4())
	apiKeysUnplayable.append(api_key)

	return JsonResponse({"api_key": api_key})

locks = {}

@csrf_exempt
async def sendNewJSON(request):
	dictionnaryJson = json.loads(request.body)
	api_key = dictionnaryJson.get("apiKey", None)
	message = dictionnaryJson.get("message", {})

	if not api_key:
		return HttpResponse(status=400)  # apiKey manquant

	m2 = json.loads(message)
	# Obtenir ou créer un lock pour cette apiKey

	# print(f"message : {message}", file=sys.stderr)
	speed = 15
	if m2["action"] == 'move' :
		try :
			if m2["player1"] == "up" and calcIntersections([dictInfoRackets[api_key]["racket1"][0][0], dictInfoRackets[api_key]["racket1"][0][1] - speed] ,[dictInfoRackets[api_key]["racket1"][1][0], dictInfoRackets[api_key]["racket1"][1][1] - speed], wall1[0], wall1[1]) == (None, None): 
				dictInfoRackets[api_key]["racket1"][0][1] -= speed
				dictInfoRackets[api_key]["racket1"][1][1] -= speed
			elif m2["player1"] == "down" and calcIntersections([dictInfoRackets[api_key]["racket1"][0][0], dictInfoRackets[api_key]["racket1"][0][1] + speed] ,[dictInfoRackets[api_key]["racket1"][1][0], dictInfoRackets[api_key]["racket1"][1][1] + speed], wall2[0], wall2[1]) == (None, None): 
				dictInfoRackets[api_key]["racket1"][0][1] += speed
				dictInfoRackets[api_key]["racket1"][1][1] += speed
		except KeyError :
			try :
				if m2["player2"] == "up" and calcIntersections([dictInfoRackets[api_key]["racket2"][0][0], dictInfoRackets[api_key]["racket2"][0][1] - speed] ,[dictInfoRackets[api_key]["racket2"][1][0], dictInfoRackets[api_key]["racket2"][1][1] - speed], wall1[0], wall1[1]) == (None, None): 
					dictInfoRackets[api_key]["racket2"][0][1] -= speed
					dictInfoRackets[api_key]["racket2"][1][1] -= speed
				elif m2["player2"] == "down" and calcIntersections([dictInfoRackets[api_key]["racket2"][0][0], dictInfoRackets[api_key]["racket2"][0][1] + speed] ,[dictInfoRackets[api_key]["racket2"][1][0], dictInfoRackets[api_key]["racket2"][1][1] + speed], wall2[0], wall2[1]) == (None, None): 
					dictInfoRackets[api_key]["racket2"][0][1] += speed
					dictInfoRackets[api_key]["racket2"][1][1] += speed
			except Exception :
				return HttpResponse(status=500)

	else :
		rq = RequestParsed(api_key, message)
		await channel_layer.group_send(
			rq.apiKey,
			{
				"type": "tempReceived",
				"text_data": rq.action
			}
		)

	return HttpResponse(status=204)

async def forfaitUser(request) :
	
	JWT = decodeJWT(request, "forfeitUser")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
   # print(f" Jwt : {JWT[0]}", file=sys.stderr)
	apikey = request.GET.get("apikey")
	idplayer = request.GET.get("idplayer")
	rq = RequestParsed(apikey, {})
	#print("---------------------6>   ->  -> Trying to disconnect ", file=sys.stderr)
	if (rq.apiKey) :
	   # print("Yay", file=sys.stderr)
		await channel_layer.group_send(
			rq.apiKey,
			{
				"type" : "tempReceived",
				"text_data" : f'{{"action" : "forfait", "player" : {idplayer}}}'
			}
		)
		try :
			dictApi.pop(apikey)
		except KeyError :
			try :
				dictApiSp.pop(apikey)
			except KeyError :
				return HttpResponseNoContent()
		
		# Clean up player tracking
		try:
			dictApiPlayers.pop(apikey)
		except KeyError:
			pass
			
		try :
			apiKeys.remove(apikey)
		except Exception :
			try:
				apiKeysUnplayable.remove(apikey)
			except ValueError:
				pass
			return HttpResponseNoContent()
	return HttpResponseNoContent()

async def disconnectUsr(request) :
	JWT = decodeJWT(request, "disconnectUsr")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
   # print(f" Jwt : {JWT[0]}", file=sys.stderr)
	apikey = request.GET.get("apikey")
	#print("disco usr", file=sys.stderr)
	await channel_layer.group_send(
		apikey,
		{
			"type" : "tempReceived",
			"text_data" : '{"action" : "disconnect"}'
		}
	)
	try :
		dictApi.pop(apikey)
	except KeyError :
		try :
			dictApiSp.pop(apikey)
		except KeyError :
			return
	
	# Clean up player tracking
	try:
		dictApiPlayers.pop(apikey)
	except KeyError:
		pass
		
	try :
		apiKeys.remove(apikey)
	except Exception :
		try:
			apiKeysUnplayable.remove(apikey)
		except ValueError:
			pass
		return HttpResponseNoContent()
	return HttpResponseNoContent()

@csrf_exempt
def apiKeyManager(request) :
	if request.method == 'GET' :
		return get_api_key(request)
	elif request.method == 'POST' :
		return setApiKey(request)


@csrf_exempt
def destroyKey(request, key) :
	try :
		dictApi.pop(key)
		return JsonResponse({"Success" : "Key deleted"})
	except Exception as e :
		return JsonResponse({"Error" : "Not found"}, status=404)
