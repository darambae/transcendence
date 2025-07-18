
from django.http import HttpResponse
from django.core.cache import cache
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
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


class   RequestParsed :
	def __init__(self, apiKey, action) :
		if apiKey in apiKeys or apiKey in apiKeysUnplayable :
			self.apiKey = apiKey
		else :
			self.apiKey = None
		self.action = action


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
	return response

def decodeJWT(request, func=None, encodedJwt=None) :
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
dictApiPlayers = {}
apiKeys = []

def getSimulationState(request):
	apikey = request.GET.get('apikey')
	
	if not apikey:
		return JsonResponse({'error': 'API key manquante'}, status=400)
	
	data = cache.get(f'simulation_state_{apikey}')
	
	if data:
		return JsonResponse(data)
	else:
		return JsonResponse({'error': 'Simulation not found'}, status=404)

async def  checkForUpdates(uriKey, key) :
	try :
		ssl_context = ssl.create_default_context()
		ssl_context.load_verify_locations('/certs/fullchain.crt')
		async with websockets.connect(uriKey, ssl=ssl_context) as ws:
			while True:
				try :
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
	user_data = JWT[0]['payload']
	user_id = user_data.get('user_id') or user_data.get('username') or 'anonymous'
	
	if apikey not in apiKeysUnplayable:
		return JsonResponse({"playable" : f"Room {apikey} doesn't Exists"})
	
	if apikey in apiKeys:
		return JsonResponse({"playable": "Game can start"})
	
	if apikey not in dictApiPlayers:
		dictApiPlayers[apikey] = []
	
	if user_id in dictApiPlayers[apikey]:
		current_count = len(dictApiPlayers[apikey])
	else:
		dictApiPlayers[apikey].append(user_id)
		current_count = len(dictApiPlayers[apikey])
		
		dictApi[apikey] = current_count

	if current_count >= 2 :
		if apikey in apiKeysUnplayable:
			apiKeysUnplayable.remove(apikey)
		if apikey not in apiKeys:
			apiKeys.append(apikey)
		playable = "Game can start"
	else:
		playable = "Need more player"

	return JsonResponse({"playable": playable})

@csrf_exempt
def isGamePlayable(request) :
	JWT = decodeJWT(request, "isGamePlayable")
	if not JWT[0] :
		return HttpResponse401() # Set an error 
	
	apikey = json.loads(request.body).get('apiKey')
	
	if apikey in apiKeys:
		return JsonResponse({"playable": "Game can start"})
	
	if apikey in dictApiPlayers and len(dictApiPlayers[apikey]) >= 2:
		if apikey in apiKeysUnplayable:
			apiKeysUnplayable.remove(apikey)
		if apikey not in apiKeys:
			apiKeys.append(apikey)
		playable = "Game can start"
	else:
		playable = "Need more player"
	
	return JsonResponse({"playable": playable})


def get_api_key(request):
	JWT = decodeJWT(request, "getApiKey")	

	if not JWT[0] :
		return HttpResponseNoContent() 
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
		return HttpResponse(status=400)

	m2 = json.loads(message)
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
		return HttpResponse401()
	apikey = request.GET.get("apikey")
	idplayer = request.GET.get("idplayer")
	rq = RequestParsed(apikey, {})
	if (rq.apiKey) :
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
		return HttpResponse401()
	apikey = request.GET.get("apikey")
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
