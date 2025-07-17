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
from .logging_utils import log_tournament_event, log_tournament_match, log_tournament_api_request

channel_layer = get_channel_layer()

consumerUri = "wss://tournament:8050/ws/game/"

class HttpResponseNoContent(HttpResponse):
	status_code = HTTPStatus.NO_CONTENT

# Create your views here.

class TournamentError(Exception) :
	pass

async def  checkForUpdates(uriKey) :
	connection_id = str(uuid.uuid4())[:8]
	log_tournament_event('SSE_CONNECTION_ATTEMPT', connection_id=connection_id, uri=uriKey)
	
	try :
		ssl_context = ssl.create_default_context()
		ssl_context.load_verify_locations('/certs/fullchain.crt')
		
		async with websockets.connect(uriKey, ssl=ssl_context) as ws:
			log_tournament_event('SSE_CONNECTION_ESTABLISHED', connection_id=connection_id, uri=uriKey)
			
			while True:
				try:
					message = await asyncio.wait_for(ws.recv(), timeout=20)
					yield f"data: {message}\n\n"
				except asyncio.TimeoutError:
					yield "data: heartbeat\n\n"
	except Exception as e :
		log_tournament_event('SSE_CONNECTION_ERROR', connection_id=connection_id, 
		                    error_type=type(e).__name__, error_message=str(e))
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
	# 	# print(f"body : {response}\naccess : {access}\nrefresh : {refresh}", file=f)
	return response

async def decodeJWT(request, func=None, encodedJwt=None) :
	if not encodedJwt :
		encodedJwt = request.COOKIES.get("access_token", None)
	if not encodedJwt :
		log_tournament_event('JWT_DECODE_FAILED', reason='missing_token', function=func)
		return [None] * 3
	
	try:
		res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', 
		                  headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, 
		                  verify=False, timeout=10)
		res_json = res.json()
		
		if res.status_code != 200 :
			if (res_json.get('error') == "Token expired"):
				log_tournament_event('JWT_TOKEN_EXPIRED', function=func, attempting_refresh=True)
				refresh_res = requests.get(f'https://access_postgresql:4000/api/token/refresh', 
				                         headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, 
				                         verify=False, timeout=10)
				if refresh_res.status_code == 200:
					new_access_token = refresh_res.json().get('access')
					res2 = requests.post('https://access_postgresql:4000/api/DecodeJwt',
					                   headers={"Authorization": f"bearer {new_access_token}", 'Host': 'localhost'}, 
					                   verify=False, timeout=10)
					res2 = await setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
					log_tournament_event('JWT_TOKEN_REFRESHED', function=func)
					return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
				log_tournament_event('JWT_REFRESH_FAILED', function=func)
				return [None] * 3
			log_tournament_event('JWT_DECODE_FAILED', function=func, status_code=res.status_code, 
			                   error=res_json.get('error', 'unknown'))
			return [None] * 3
		return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]
	except requests.RequestException as e:
		log_tournament_event('JWT_DECODE_NETWORK_ERROR', function=func, error_message=str(e))
		return [None] * 3


@csrf_exempt
@log_tournament_api_request(action_type='LAUNCH_TOURNAMENT_MATCH')
async def launchMatch(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		
		log_tournament_match('MATCH_LAUNCH_REQUEST', tournament_id=tkey)
		
		if tkey not in trnmtDict:
			log_tournament_event('TOURNAMENT_NOT_FOUND', tournament_id=tkey, action='launch_match')
			return JsonResponse({"Error": "Tournament not found"}, status=404)
			
		if trnmtDict[tkey].launched :
			log_tournament_event('TOURNAMENT_ALREADY_LAUNCHED', tournament_id=tkey)
			return JsonResponse({"Error" : "Tournament already launched"}, status=403)
			
		trStart = trnmtDict[tkey].launchTournament(request.COOKIES)
		
		if not trStart[0] :
			log_tournament_event('TOURNAMENT_LAUNCH_FAILED', tournament_id=tkey, reason=trStart[1])
			return JsonResponse({"Info" : trStart[1]})
			
		log_tournament_event('TOURNAMENT_LAUNCHED_SUCCESSFULLY', tournament_id=tkey, 
		                   player_count=trnmtDict[tkey].nbPl)
		
		try :
			lsTrnmtJwt = trnmtDict[tkey].listJWT()
		except Exception as e :
			log_tournament_event('JWT_LIST_ERROR', tournament_id=tkey, error_message=str(e))

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "update-guest", "jwt-list" : lsTrnmtJwt}
			}
		)
		
		log_tournament_event('GUEST_UPDATE_SENT', tournament_id=tkey, jwt_count=len(lsTrnmtJwt))
		
		asyncio.sleep(1000)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "create-bracket"}
			}
		)
		
		log_tournament_match('BRACKET_CREATION_TRIGGERED', tournament_id=tkey)
		
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		log_tournament_event('TOURNAMENT_ERROR', tournament_id=tkey if 'tkey' in locals() else None, 
		                   error_message=str(e), error_type='TournamentError')
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		log_tournament_event('LAUNCH_MATCH_UNEXPECTED_ERROR', 
		                   tournament_id=tkey if 'tkey' in locals() else None,
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='LAUNCH_TOURNAMENT_FINALS')
async def launchFinals(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		
		log_tournament_match('FINALS_LAUNCH_REQUEST', tournament_id=tkey)
		
		if tkey not in trnmtDict:
			log_tournament_event('TOURNAMENT_NOT_FOUND', tournament_id=tkey, action='launch_finals')
			return JsonResponse({"Error": "Tournament not found"}, status=404)

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "final-matches"}
			}
		)
		
		log_tournament_match('FINALS_BRACKET_SENT', tournament_id=tkey)
		
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		log_tournament_event('TOURNAMENT_ERROR', tournament_id=tkey if 'tkey' in locals() else None, 
		                   error_message=str(e), error_type='TournamentError', action='launch_finals')
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		log_tournament_event('LAUNCH_FINALS_UNEXPECTED_ERROR', 
		                   tournament_id=tkey if 'tkey' in locals() else None,
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='LAUNCH_NEXT_MATCH')
async def launchNextMatch(request) :
	try:
		body = json.loads(request.body)
		tkey = body["tKey"]
		
		log_tournament_match('NEXT_MATCH_REQUEST', tournament_id=tkey)
		
		if tkey not in trnmtDict:
			log_tournament_event('TOURNAMENT_NOT_FOUND', tournament_id=tkey, action='launch_next_match')
			return JsonResponse({"Error": "Tournament not found"}, status=404)
			
		if trnmtDict[tkey].nbPl != 4 :
			log_tournament_event('INVALID_PLAYER_COUNT', tournament_id=tkey, 
			                   player_count=trnmtDict[tkey].nbPl, required_count=4)
			return JsonResponse({"Error": "Forbidden"}, status=200)
			
		if trnmtDict[tkey].launched == False :
			log_tournament_event('TOURNAMENT_NOT_LAUNCHED', tournament_id=tkey, action='launch_next_match')
			return JsonResponse({"Error": "Forbidden"}, status=403)
			
		# Check if tournament is complete
		if (trnmtDict[tkey].first and trnmtDict[tkey].second and trnmtDict[tkey].third and trnmtDict[tkey].fourth) :
			log_tournament_event('TOURNAMENT_COMPLETED', tournament_id=tkey,
			                   first=trnmtDict[tkey].first.username,
			                   second=trnmtDict[tkey].second.username,
			                   third=trnmtDict[tkey].third.username,
			                   fourth=trnmtDict[tkey].fourth.username)
			return JsonResponse({"Info" : "Results", "first" : trnmtDict[tkey].first.username, "second" : trnmtDict[tkey].second.username, "third" : trnmtDict[tkey].third.username, "fourth" : trnmtDict[tkey].fourth.username})
			
		if not trnmtDict[tkey].match1.played or not trnmtDict[tkey].match2.played :
			log_tournament_match('SENDING_SEMIFINAL_BRACKET', tournament_id=tkey,
			                   match1_played=trnmtDict[tkey].match1.played,
			                   match2_played=trnmtDict[tkey].match2.played)
			await channel_layer.group_send(
				tkey,
				{
					"type": "tempReceived",
					"text_data": {"action" : "create-bracket"}
				}
			)
		else :
			log_tournament_match('SENDING_FINAL_BRACKET', tournament_id=tkey)
			await channel_layer.group_send(
				tkey,
				{
					"type": "tempReceived",
					"text_data": {"action" : "final-matches"}
				}
			)
			
		return JsonResponse({"Info" : "Ready to start"})
	except TournamentError as e:
		log_tournament_event('TOURNAMENT_ERROR', tournament_id=tkey if 'tkey' in locals() else None, 
		                   error_message=str(e), error_type='TournamentError', action='launch_next_match')
		return JsonResponse({"Error": str(e)}, status=401)
	except Exception as e:
		log_tournament_event('LAUNCH_NEXT_MATCH_UNEXPECTED_ERROR', 
		                   tournament_id=tkey if 'tkey' in locals() else None,
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='CHECK_SSE_ACCESS')
async def checkSSE(request) :
	try:
		jwt = await decodeJWT(request, "checkSSE")
		if not jwt[0] :
			log_tournament_event('SSE_CHECK_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
			
		jwt_payload = jwt[0]['payload']
		username = jwt_payload["username"]
		guests = jwt_payload["invites"]
		
		log_tournament_event('SSE_CHECK_SUCCESS', username=username, 
		                   guest_count=len(guests), guests=guests)
		
		return JsonResponse({"key" : username, "guests" : ','.join(guests)})
	except Exception as e :
		log_tournament_event('SSE_CHECK_ERROR', error_message=str(e), 
		                   error_type=type(e).__name__,
		                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)


@csrf_exempt
@log_tournament_api_request(action_type='JOIN_GUEST_TO_TOURNAMENT')
async def joinGuest(request) :
	try:
		jwt_token = await decodeJWT(request, "joinGuest")
		if not jwt_token[0] :
			log_tournament_event('GUEST_JOIN_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		try :
			jwt_payload = jwt_token[0]["payload"]
			username = jwt_payload["username"]
			guest = jwt_payload["invites"][-1]
		except Exception :
			log_tournament_event('GUEST_JOIN_INVALID_JWT', username=username if 'username' in locals() else 'unknown')
			return JsonResponse({"Error": "Unauthorized"}, status=401)
			
		# Find tournament containing the user
		tKey = None
		for elem in trnmtDict :
			if username in trnmtDict[elem].listUsr() :
				tKey = elem
				break

		if tKey not in trnmtDict:
			log_tournament_event('GUEST_JOIN_TOURNAMENT_NOT_FOUND', username=username, guest=guest)
			return JsonResponse({"Error": "Tournament not found"}, status=404)
			
		player = Player(jwt_payload, guest)
		trnmtDict[tKey].addPlayers(player)
		
		log_tournament_event('GUEST_JOINED_TOURNAMENT', tournament_id=tKey, 
		                   username=username, guest=guest, 
		                   player_count=trnmtDict[tKey].nbPl)
		
		return JsonResponse({"Success" : f"{guest} added as a guest"})

	except Exception as e :
		log_tournament_event('GUEST_JOIN_UNEXPECTED_ERROR', 
		                   username=username if 'username' in locals() else 'unknown',
		                   guest=guest if 'guest' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error : {e}"}, status=500)

@log_tournament_api_request(action_type='JOIN_TOURNAMENT')
async def joinTournament(request):
	try:
		body = json.loads(request.body)
		jwt_token = await decodeJWT(request, "joinTournament")
		if not jwt_token[0] :
			log_tournament_event('JOIN_TOURNAMENT_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		try :
			jwt_payload = jwt_token[0]["payload"]
			username = jwt_payload["username"]
		except Exception :
			log_tournament_event('JOIN_TOURNAMENT_INVALID_JWT')
			return JsonResponse({"Error": "Unauthorized"}, status=401)
			
		tKey = body["tKey"]

		if tKey not in trnmtDict:
			log_tournament_event('JOIN_TOURNAMENT_NOT_FOUND', tournament_id=tKey, username=username)
			return JsonResponse({"Error": "Tournament not found"}, status=404)

		# Check if player already in a tournament
		try :
			for elem in trnmtDict :
				if username in trnmtDict[elem].listUsr() : 
					log_tournament_event('PLAYER_ALREADY_IN_TOURNAMENT', 
					                   username=username, existing_tournament=elem, requested_tournament=tKey)
					return JsonResponse({"Error" : "player already in a tournament"}, status=403)
		except Exception as e :
			log_tournament_event('JOIN_TOURNAMENT_CHECK_ERROR', username=username, 
			                   error_message=str(e))
			
		player = Player(jwt_payload, username)
		trnmtDict[tKey].addPlayers(player)
		
		log_tournament_event('PLAYER_JOINED_TOURNAMENT', tournament_id=tKey, 
		                   username=username, player_count=trnmtDict[tKey].nbPl)

		return JsonResponse({"key" : tKey, "main" : username})		

	except Exception as e:
		log_tournament_event('JOIN_TOURNAMENT_UNEXPECTED_ERROR', 
		                   tournament_id=tKey if 'tKey' in locals() else 'unknown',
		                   username=username if 'username' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error {e}"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='SSE_STREAM_REQUEST')
async def sse(request) :
	tKey = request.GET.get("tKey", None)
	name = request.GET.get("name", None)
	
	log_tournament_event('SSE_STREAM_REQUESTED', tournament_id=tKey, player_name=name,
	                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
	
	return StreamingHttpResponse(checkForUpdates(f'{consumerUri}?tkey={tKey}&name={name}'), content_type='text/event-stream')


@csrf_exempt
@log_tournament_api_request(action_type='GET_PLAYER_IDS')
async def getIds(request) :
	try:
		jwt = await decodeJWT(request, "getIds")
		if not jwt[0]:
			log_tournament_event('GET_IDS_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error": "Unauthorized"}, status=401)
			
		jwt_payload = jwt[0]['payload']
		body = json.loads(request.body)
		tkey = body.get("tkey")
		u1 = body.get("u1")
		u2 = body.get("u2")

		listPl = [jwt_payload["username"]] + jwt_payload["invites"]

		i1 = listPl.index(u1) - 1
		i2 = listPl.index(u2) - 1
		
		log_tournament_event('PLAYER_IDS_RETRIEVED', tournament_id=tkey,
		                   username=jwt_payload["username"], user1=u1, user2=u2, 
		                   id1=i1, id2=i2)
		
		return JsonResponse({"id1" : i1, "id2" : i2})
	except Exception as e:
		log_tournament_event('GET_IDS_ERROR', 
		                   tournament_id=tkey if 'tkey' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error": f"Internal server error: {e}"}, status=500)

@log_tournament_api_request(action_type='LEAVE_TOURNAMENT')
async def leaveTournament(request):
	try :
		body = json.loads(request.body)
		jwt_token = await decodeJWT(request, "leaveTournament")
		if not jwt_token[0] :
			log_tournament_event('LEAVE_TOURNAMENT_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error" : "Unauthorized"}, status=401)
		encoded = request.COOKIES.get("access_token", None)
		
		try :
			jwt_payload = jwt_token[0]["payload"]
			username = jwt_payload["username"]
		except Exception :
			log_tournament_event('LEAVE_TOURNAMENT_INVALID_JWT')
			return JsonResponse({"Error": "Unauthorized"}, status=401)
			
		tKey = body["tKey"]
		
		if tKey in trnmtDict :
			listJWT = trnmtDict[tKey].listJWT()
			listUsername = trnmtDict[tKey].listUsr()
			
			original_count = trnmtDict[tKey].nbPl
			
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
				log_tournament_event('WEBSOCKET_CONNECTION_CLOSED', tournament_id=tKey, username=username)
				
			trnmtDict[tKey].players = lsTmp
			trnmtDict[tKey].nbPl = len(lsTmp)
			
			log_tournament_event('PLAYER_LEFT_TOURNAMENT', tournament_id=tKey, username=username,
			                   previous_count=original_count, new_count=trnmtDict[tKey].nbPl)

			response = requests.delete("https://access_postgresql:4000/api/guest/", 
			                         headers={"Authorization" : f"bearer {encoded}", 'Host': 'localhost'}, 
			                         verify=False, timeout=10)
			                         
			if response.status_code == 200 :
				res_json = response.json()
				access = res_json.get("access", "None")
				refresh = res_json.get("refresh", "None")
				
				log_tournament_event('GUEST_CLEANUP_SUCCESS', tournament_id=tKey, username=username)

				return await setTheCookie(JsonResponse({"Result" : "Player removed from lobby"}), access, refresh)
			else:
				log_tournament_event('GUEST_CLEANUP_FAILED', tournament_id=tKey, username=username,
				                   status_code=response.status_code)
				
		log_tournament_event('LEAVE_TOURNAMENT_NOT_FOUND', tournament_id=tKey, username=username)
		return JsonResponse({"Error" : "Tournament not found"}, status=404)
	except Exception as e:
		log_tournament_event('LEAVE_TOURNAMENT_UNEXPECTED_ERROR', 
		                   tournament_id=tKey if 'tKey' in locals() else 'unknown',
		                   username=username if 'username' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"error" : f"Internal server errrrror : {e}"}, status=500)

@log_tournament_api_request(action_type='CREATE_TOURNAMENT')
async def createTournament(request) :
	try :
		tr = Tournament()
		trnmtDict[tr.tKey] = tr
		
		log_tournament_event('TOURNAMENT_CREATED', tournament_id=tr.tKey, 
		                   max_players=4, current_players=0)
		
		return JsonResponse({"Result" : "Tournament succefully created"})
	except Exception as e :
		log_tournament_event('TOURNAMENT_CREATION_FAILED', error_message=str(e), 
		                   error_type=type(e).__name__)
		return JsonResponse({"error" : "Internal server error"}, status=500)

@log_tournament_api_request(action_type='LIST_TOURNAMENTS')
async def listTournament(request) :
	try :
		trnmtList = {}
		for elem in trnmtDict :
			trnmtList[elem] = f"{trnmtDict[elem].nbPl} / 4"
		
		log_tournament_event('TOURNAMENTS_LISTED', tournament_count=len(trnmtDict),
		                   tournaments=list(trnmtDict.keys()))

		return JsonResponse({"list" : trnmtList})
	except Exception as e :
		log_tournament_event('LIST_TOURNAMENTS_ERROR', error_message=str(e), 
		                   error_type=type(e).__name__)
		return JsonResponse({"error" : "Internal server error"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='TOURNAMENT_MANAGER')
async def tournamentManager(request) :
	try :
		if request.method == "GET" :
			log_tournament_event('TOURNAMENT_MANAGER_GET_REQUEST')
			return await listTournament(request)
		elif request.method == "POST" :
			data = json.loads(request.body.decode('utf-8'))
			action = data.get("action", "unknown")
			
			log_tournament_event('TOURNAMENT_MANAGER_POST_REQUEST', action=action)
			
			if action == "create" :
				return await createTournament(request)
			elif action == "leave" :
				return await leaveTournament(request)
			else :
				return await joinTournament(request)
	except Exception as e :
		log_tournament_event('TOURNAMENT_MANAGER_UNEXPECTED_ERROR', 
		                   method=request.method, error_message=str(e), 
		                   error_type=type(e).__name__)
		return JsonResponse({"error" : f"Internal server error {e}"}, status=500)

@csrf_exempt
@log_tournament_api_request(action_type='SUPERVISE_MATCH')
async def Supervise(request) :
	try :
		jwt = await decodeJWT(request, "Supervise")
		if not jwt[0]:
			log_tournament_event('SUPERVISE_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error": "Unauthorized"}, status=401)
			
		jwt_payload = jwt[0]['payload']
		username = jwt_payload["username"]
		tkey = request.GET.get("tkey")
		mkey = request.GET.get("key")
		roundM = request.GET.get("round", 1) 

		await channel_layer.group_send(
			tkey,
			{
				"type": "tempReceived",
				"text_data": {"action" : "supervise", "round" : roundM, "mKey" : mkey, "tkey" : tkey, "player" : username}
			}
		)
		
		log_tournament_event('SUPERVISE_REQUEST_SENT', tournament_id=tkey, 
		                   match_key=mkey, round_number=roundM, supervisor=username)
		
		return JsonResponse({"Success" : "Done"})
	except Exception as e :
		log_tournament_event('SUPERVISE_UNEXPECTED_ERROR', 
		                   tournament_id=tkey if 'tkey' in locals() else 'unknown',
		                   username=username if 'username' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return HttpResponseNoContent()

@csrf_exempt
@log_tournament_api_request(action_type='CHECK_PLAYER_IN_TOURNAMENT')
async def amIinTournament(request) :
	try :
		jwt = await decodeJWT(request, "amIinTournament")
		if not jwt[0]:
			log_tournament_event('CHECK_TOURNAMENT_UNAUTHORIZED', 
			                   ip=request.META.get('REMOTE_ADDR', 'unknown'))
			return JsonResponse({"Error" : "Unauthorized"}, status=401)

		jwt_payload = jwt[0]['payload']
		username = jwt_payload["username"]
		
		for elem in trnmtDict : 
			lsJwt = trnmtDict[elem].listJWTPlayers()
			if (username in lsJwt) :
				lsPlayer = trnmtDict[elem].listUsr()
				
				log_tournament_event('PLAYER_FOUND_IN_TOURNAMENT', tournament_id=elem, 
				                   username=username, player_count=trnmtDict[elem].nbPl,
				                   all_players=lsPlayer)
				                   
				return JsonResponse({"Tournament" : elem, "number" : trnmtDict[elem].nbPl, "players" : lsPlayer})
				
		log_tournament_event('PLAYER_NOT_IN_ANY_TOURNAMENT', username=username)
		return JsonResponse({"Tournament" : "None"})
	except Exception as e :
		log_tournament_event('CHECK_TOURNAMENT_UNEXPECTED_ERROR', 
		                   username=username if 'username' in locals() else 'unknown',
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"Error" : "Unauthorized"}, status=401)
	
@csrf_exempt
@log_tournament_api_request(action_type='GET_TOURNAMENT_RESULTS')
async def getResults(request, tkey) :
	try:
		if tkey not in trnmtDict:
			log_tournament_event('RESULTS_TOURNAMENT_NOT_FOUND', tournament_id=tkey)
			return JsonResponse({"Error": "Tournament not found"}, status=404)
			
		tournament = trnmtDict[tkey]
		if not (tournament.first and tournament.second and tournament.third and tournament.fourth):
			log_tournament_event('RESULTS_NOT_READY', tournament_id=tkey, 
			                   has_first=bool(tournament.first), has_second=bool(tournament.second),
			                   has_third=bool(tournament.third), has_fourth=bool(tournament.fourth))
			return JsonResponse({"Error": "Tournament results not ready"}, status=400)
		
		results = {
			"first": tournament.first.username,
			"second": tournament.second.username, 
			"third": tournament.third.username,
			"fourth": tournament.fourth.username
		}
		
		log_tournament_event('TOURNAMENT_RESULTS_RETRIEVED', tournament_id=tkey, **results)
		
		return JsonResponse({"Info" : "Results", **results})
	except Exception as e:
		log_tournament_event('GET_RESULTS_UNEXPECTED_ERROR', tournament_id=tkey,
		                   error_message=str(e), error_type=type(e).__name__)
		return JsonResponse({"Error": "Internal server error"}, status=500)