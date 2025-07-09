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
from .logging_utils import (
    log_game_api_request, log_game_event, log_game_error,
    log_player_action, log_server_event, log_websocket_game_event,
    log_game_state_change, log_player_disconnect, log_matchmaking_event,
    game_logger
)

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
    with open(f"/app/{func}_decodeJWT.txt", "a+") as f :
        tm = datetime.now()
        print(f"--------------------------\nBeginning : {tm.hour}:{tm.minute}:{tm.second} ", file=f) 
    with open(f"/app/{func}_decodeJWT.txt", "a+") as f : 
        if not encodedJwt :
            encodedJwt = request.COOKIES.get("access_token", None)
        if not encodedJwt :
            print("Error 1", file=f)
            return [None] * 3
        
        print(f"encoded: {encodedJwt}", file=f)
        res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
        print(f"res : {res}", file=f)
        try:
            res_json = res.json()
            print(f"res.json() : {res_json}", file=f)
            
            if res.status_code != 200:
                print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=f)
                if (res_json.get('error') == "Token expired"):
                    try:
                        refresh_res = requests.get(f'https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
                        if refresh_res.status_code == 200:
                            try:
                                refresh_json = refresh_res.json()
                                new_access_token = refresh_json.get('access')
                                if new_access_token:
                                    res2 = requests.post('https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization": f"bearer {new_access_token}", 'Host': 'localhost'}, verify=False)
                                    res2 = setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
                                    try:
                                        return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
                                    except:
                                        print(f"Error parsing JSON from res2", file=f)
                                        return [None] * 3
                                else:
                                    print(f"No access token in refresh response", file=f)
                                    return [None] * 3
                            except:
                                print(f"Error parsing refresh response JSON", file=f)
                                return [None] * 3
                    except Exception as e:
                        print(f"Error refreshing token: {str(e)}", file=f)
                        return [None] * 3
                return [None] * 3
        except Exception as e:
            print(f"Error parsing JSON: {str(e)}, response text: {res.text[:200]}", file=f)
            return [None] * 3
        return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]

dictActivePlayer = {}
apiKeysUnplayable = []
dictApi = {}
dictApiSp = {}
apiKeys = []
#print("VIEW IMPORTEEE", file=sys.stderr)

@log_game_api_request(action_type='GET_SIMULATION_STATE')
def getSimulationState(request):
    apikey = request.GET.get('apikey')
    
    log_game_event('SIMULATION_STATE_REQUEST', game_id=apikey)
    
    if not apikey:
        log_game_error('MISSING_API_KEY', error_details='API key not provided in request')
        return JsonResponse({'error': 'API key manquante'}, status=400)
    
    data = cache.get(f'simulation_state_{apikey}')
    
    if data:
        log_game_event('SIMULATION_STATE_FOUND', game_id=apikey)
        return JsonResponse(data)
    else:
        log_game_error('SIMULATION_NOT_FOUND', game_id=apikey, 
                     error_details='No simulation data in cache for the provided API key')
        return JsonResponse({'error': 'Simulation not found'}, status=404)

# Asynchronous generator function('async' + 'yield') to handle WebSocket connections
# -> When it runs, it produces a value (in this case, a formatted string) and pauses 
# the function’s execution. The next time the generator is iterated, execution resumes right after the yield.
async def  checkForUpdates(uriKey, key) :
    connection_id = str(uuid.uuid4())[:8]  # Generate a short connection ID for logging
    
    try:
        log_websocket_game_event('WS_CONNECT_ATTEMPT', connection_id=connection_id, 
                               game_id=key, uri=uriKey)
                               
        ssl_context = ssl.create_default_context()
        ssl_context.load_verify_locations('/certs/fullchain.crt')
        
        async with websockets.connect(uriKey, ssl=ssl_context) as ws:
            log_websocket_game_event('WS_CONNECTED', connection_id=connection_id,
                                   game_id=key, uri=uriKey)
            
            while True:
                message = await ws.recv()
                
                # Log only periodically to avoid excessive logging
                if "gameState" in message:
                    try:
                        msg_data = json.loads(message)
                        if msg_data.get("type") == "gameState":
                            log_game_state_change(key, 
                                                old_state=None, 
                                                new_state=msg_data.get("state"),
                                                trigger="websocket_update")
                    except:
                        # Don't crash if message parsing fails
                        pass
                
                yield f"data: {message}\n\n"
                
    except Exception as e:
        log_websocket_game_event('WS_ERROR', connection_id=connection_id,
                               game_id=key, error_type=type(e).__name__,
                               error_message=str(e))
        yield f"data: WebSocket stop, error : {e}\n\n"
        
    finally:
        log_websocket_game_event('WS_DISCONNECTED', connection_id=connection_id,
                               game_id=key)

async def sseCheck(request) :
    log_server_event('SSE_CHECK_REQUEST', 
                    server_id=request.META.get('REMOTE_ADDR', 'unknown'))
    
    JWT = decodeJWT(request, "sseCheck")
    
    if not JWT[0]:
        log_server_event('SSE_CHECK_AUTH_FAILED', 
                        server_id=request.META.get('REMOTE_ADDR', 'unknown'),
                        status='unauthorized')
        return HttpResponse401() # Set an error
        
    username = JWT[0]['payload'].get("username", "unknown")
    invites = JWT[0]['payload'].get("invites", [])
    
    log_server_event('SSE_CHECK_SUCCESS', 
                    server_id=request.META.get('REMOTE_ADDR', 'unknown'),
                    username=username,
                    guest_count=len(invites))
                    
    return JsonResponse({"username": username, "guest": invites})

async def sse(request):
    apikey = request.GET.get("apikey")
    AI = request.GET.get('ai')
    idplayer = int(request.GET.get("idplayer"))
    
    log_game_event('SSE_CONNECTION_REQUEST', 
                 game_id=apikey, 
                 player_id=idplayer, 
                 is_ai_game=bool(AI and AI != '0'))
    
    rq = RequestParsed(apikey, {})
    
    if not rq.apiKey:
        log_game_error('INVALID_API_KEY', 
                     error_details='API key not found or invalid',
                     api_key_provided=apikey)
        return JsonResponse({'error': 'Invalid API key'}, status=400)

    if idplayer == 0:  # Observer mode
        idp1 = int(request.GET.get("JWTidP1"))
        idp2 = int(request.GET.get("JWTidP2"))
        
        if idp1 < 0:
            username1 = request.GET.get("username", "Guest")
        else:
            username1 = request.GET.get(f"guest{idp1 + 1}", "Guest")

        if idp2 < 0:
            username2 = request.GET.get("username", "Guest")
        else:
            username2 = request.GET.get(f"guest{idp2 + 1}", "Guest")
        
        log_game_event('OBSERVER_CONNECTED', 
                     game_id=rq.apiKey,
                     player1_id=username1, 
                     player2_id=username2)
        
        if rq.apiKey:
            conn_uri = f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&u1={username1}&u2={username2}"
            return StreamingHttpResponse(
                checkForUpdates(conn_uri, rq.apiKey), 
                content_type="text/event-stream"
            )

    elif idplayer == 1:  # Player 1
        idp1 = int(request.GET.get("JWTid"))
        
        if idp1 < 0:
            username1 = request.GET.get("username", "Guest")
        else:
            username1 = request.GET.get(f"guest{idp1 + 1}", "Guest")

        log_player_action('PLAYER_CONNECTED', 
                        game_id=rq.apiKey, 
                        player_id=username1, 
                        action_data={'player_number': 1})
        
        if rq.apiKey:
            conn_uri = f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&name={username1}"
            return StreamingHttpResponse(
                checkForUpdates(conn_uri, rq.apiKey), 
                content_type="text/event-stream"
            )
        
    else:  # Player 2
        idp2 = int(request.GET.get("JWTid"))
        
        if idp2 < 0:
            username2 = request.GET.get("username", "Guest")
        else:
            username2 = request.GET.get(f"guest{idp2 + 1}", "Guest")

        log_player_action('PLAYER_CONNECTED', 
                        game_id=rq.apiKey, 
                        player_id=username2, 
                        action_data={'player_number': 2})

        if rq.apiKey:
            conn_uri = f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&name={username2}"
            return StreamingHttpResponse(
                checkForUpdates(conn_uri, rq.apiKey), 
                content_type="text/event-stream"
            )

@csrf_exempt  # This exempts the view from CSRF verification
@log_game_api_request(action_type='SET_API_KEY_SP')
def setApiKeySp(request):
    # Log the request details to help debug cross-origin issues
    game_logger.info(f"Processing setApiKeySp request", 
                    extra={
                        'path': request.path,
                        'method': request.method,
                        'origin': request.META.get('HTTP_ORIGIN', 'unknown'),
                        'referer': request.META.get('HTTP_REFERER', 'unknown'),
                        'content_type': request.content_type or 'none',
                    })
    
    # Ensure we have a proper request object
    if not request:
        log_game_error('MISSING_REQUEST', 
                     error_details='Request object missing in setApiKeySp',
                     error_type='TypeError')
        return JsonResponse({'error': 'Internal server error: Missing request'}, status=500)
    
    # Debug logging to track the issue
    game_logger.info(f"setApiKeySp called with request method: {request.method}", 
                    extra={'path': request.path, 'method': request.method})
    
    JWT = decodeJWT(request, "setApiKeySp")
    
    if not JWT[0]:
        log_game_error('UNAUTHORIZED_API_KEY_REQUEST', 
                     error_details='Missing or invalid JWT',
                     ip=request.META.get('REMOTE_ADDR'))
        return HttpResponse401() # Set an error
        
    user_id = JWT[0]['payload'].get('username', 'unknown')
    
    try:
        body = json.loads(request.body)
        apikey = body.get('apiKey')
        
        if not apikey:
            log_game_error('INVALID_API_KEY_REQUEST', 
                         error_details='Missing API key in request body',
                         user_id=user_id)
            return JsonResponse({'error': 'Missing API key'}, status=400)
        
        # Register the API key
        dictApiSp[apikey] = 1
        apiKeys.append(apikey)
        
        log_game_event('API_KEY_REGISTERED', 
                     game_id=apikey, 
                     player1_id=user_id,
                     event_type='single_player')
        
        return JsonResponse({"playable": "Game can start"})
        
    except json.JSONDecodeError:
        log_game_error('MALFORMED_REQUEST', 
                     error_details='Invalid JSON in request body',
                     user_id=user_id)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        log_game_error('API_KEY_REGISTRATION_FAILED',
                     error_details=str(e),
                     error_type=type(e).__name__,
                     user_id=user_id)
        return JsonResponse({'error': 'Internal server error'}, status=500)


@csrf_exempt
@log_game_api_request(action_type='SET_API_KEY')
def setApiKey(request):
    JWT = decodeJWT(request, "setApiKey")
    
    if not JWT[0]:
        log_game_error('UNAUTHORIZED_API_KEY_REQUEST', 
                     error_details='Missing or invalid JWT',
                     ip=request.META.get('REMOTE_ADDR'))
        return HttpResponse401() # Set an error
        
    user_id = JWT[0]['payload'].get('username', 'unknown')
    
    try:
        body = json.loads(request.body)
        apikey = body.get('apiKey')
        
        if not apikey:
            log_game_error('INVALID_API_KEY_REQUEST', 
                         error_details='Missing API key in request body',
                         user_id=user_id)
            return JsonResponse({'error': 'Missing API key'}, status=400)
            
        if apikey not in apiKeysUnplayable:
            log_game_error('ROOM_NOT_FOUND',
                         error_details=f'Room {apikey} does not exist',
                         user_id=user_id, 
                         api_key=apikey)
            return JsonResponse({"playable": f"Room {apikey} doesn't Exists"})
            
        # Update player count
        if apikey in dictApi:
            dictApi[apikey] += 1
            log_game_event('PLAYER_JOINED_EXISTING_GAME',
                         game_id=apikey,
                         player2_id=user_id,
                         player_count=dictApi[apikey])
        else:
            dictApi[apikey] = 1
            log_game_event('PLAYER_JOINED_NEW_GAME',
                         game_id=apikey,
                         player1_id=user_id,
                         player_count=1)

        # Check if we have enough players
        if (dictApi[apikey] > 1):
            apiKeysUnplayable.remove(apikey)
            apiKeys.append(apikey)
            playable = "Game can start"
            
            log_matchmaking_event('GAME_READY',
                                player_id=user_id,
                                queue_time=None,
                                game_id=apikey)
        else:
            playable = "Need more player"
            
            log_matchmaking_event('WAITING_FOR_OPPONENT',
                                player_id=user_id,
                                game_id=apikey)

        return JsonResponse({"playable": playable})
        
    except json.JSONDecodeError:
        log_game_error('MALFORMED_REQUEST', 
                     error_details='Invalid JSON in request body',
                     user_id=user_id)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        log_game_error('API_KEY_REGISTRATION_FAILED',
                     error_details=str(e),
                     error_type=type(e).__name__,
                     user_id=user_id)
        return JsonResponse({'error': 'Internal server error'}, status=500)

@csrf_exempt
@log_game_api_request(action_type='CHECK_GAME_PLAYABLE')
def isGamePlayable(request):
    JWT = decodeJWT(request, "isGamePlayable")
    
    if not JWT[0]:
        log_game_error('UNAUTHORIZED_GAME_CHECK', 
                     error_details='Missing or invalid JWT',
                     ip=request.META.get('REMOTE_ADDR'))
        return HttpResponse401() # Set an error
        
    user_id = JWT[0]['payload'].get('username', 'unknown')
    
    try:
        body = json.loads(request.body)
        apikey = body.get('apiKey')
        
        if not apikey:
            log_game_error('INVALID_GAME_CHECK', 
                         error_details='Missing API key in request body',
                         user_id=user_id)
            return JsonResponse({'error': 'Missing API key'}, status=400)
            
        # Check if we have enough players
        if apikey in dictApi and dictApi[apikey] > 1:
            apiKeys.append(apikey)
            playable = "Game can start"
            
            log_game_event('GAME_READY_CHECK_SUCCESS',
                         game_id=apikey,
                         player_id=user_id,
                         player_count=dictApi[apikey])
        else:
            playable = "Need more player"
            
            log_game_event('GAME_WAITING_FOR_PLAYERS',
                         game_id=apikey,
                         player_id=user_id,
                         player_count=dictApi.get(apikey, 0))
            
        return JsonResponse({"playable": playable})
        
    except json.JSONDecodeError:
        log_game_error('MALFORMED_REQUEST', 
                     error_details='Invalid JSON in request body',
                     user_id=user_id)
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except KeyError:
        log_game_error('GAME_NOT_FOUND',
                     error_details=f'No game data for API key: {apikey}',
                     user_id=user_id,
                     api_key=apikey)
        return JsonResponse({'error': f'Game with key {apikey} not found'}, status=404)
    except Exception as e:
        log_game_error('GAME_CHECK_FAILED',
                     error_details=str(e),
                     error_type=type(e).__name__,
                     user_id=user_id,
                     api_key=apikey if 'apikey' in locals() else None)
        return JsonResponse({'error': 'Internal server error'}, status=500)


def get_api_key(request):
    JWT = decodeJWT(request, "getApiKey")
    # fil = open('test.txt', 'w+')
    fil = open('/app/test.txt', 'a+')
    print(f" Jwt : {JWT[0]}", file=fil)
    fil.close()
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
        try :
            apiKeys.remove(apikey)
        except Exception :
            apiKeysUnplayable.remove(apikey)
            return HttpResponseNoContent()
    return HttpResponseNoContent()

async def disconnectUsr(request) :
    JWT = decodeJWT(request)
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
    try :
        apiKeys.remove(apikey)
    except Exception :
        apiKeysUnplayable.remove(apikey)
        return HttpResponseNoContent()
    return HttpResponseNoContent()

@csrf_exempt
def apiKeyManager(request) :
    if request.method == 'GET' :
        return get_api_key(request)
    elif request.method == 'POST' :
        return setApiKey(request)



