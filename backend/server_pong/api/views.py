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

channel_layer = get_channel_layer()

uri = "wss://server_pong:8030/ws/game/"

uriJwt = "https://access-postgresql:4000/"

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

def decodeJWT(request) :
    print(f"headers : {request.headers}", file=sys.stderr)
    encodedJwt = request.headers.get("Authorization", None)
    print(f"encodedJWT : {encodedJwt}", file=sys.stderr)
    if not encodedJwt :
        return [None]
    
    res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
    if res.status_code != 200 :
        print(f"Not recognized, code = {res.status_code}", file=sys.stderr)
        return [None]
    return [res.json()]

dictActivePlayer = {}
apiKeysUnplayable = []
dictApi = {}
dictApiSp = {}
apiKeys = []
#print("VIEW IMPORTEEE", file=sys.stderr)

def getSimulationState(request):
    #print(f"[DEBUG] En attente de l'apiKey", file=sys.stderr)
    apikey = request.GET.get('apikey')
    #print(f"[DEBUG] API Key reçue : {apikey}", file=sys.stderr)
    
    if not apikey:
        return JsonResponse({'error': 'API key manquante'}, status=400)
    
    data = cache.get(f'simulation_state_{apikey}')
    #print(f"[DEBUG] Données récupérées du cache : {data}", file=sys.stderr)
    
    if data:
        return JsonResponse(data)
    else:
        return JsonResponse({'error': 'Simulation not found'}, status=404)

# Asynchronous generator function('async' + 'yield') to handle WebSocket connections
# -> When it runs, it produces a value (in this case, a formatted string) and pauses 
# the function’s execution. The next time the generator is iterated, execution resumes right after the yield.
async def  checkForUpdates(uriKey, key) :
    try :
        print("0", file=sys.stderr)
        ssl_context = ssl.create_default_context()
        ssl_context.load_verify_locations('/certs/fullchain.crt')
        async with websockets.connect(uriKey, ssl=ssl_context) as ws:
            print("1", file=sys.stderr)
            while True:
                print("2", file=sys.stderr)
                message = await ws.recv()
                print("3", file=sys.stderr)
                yield f"data: {message}\n\n"
    except Exception as e :
        print(f"data: WebSocket stop, error : {e}\n\n", file=sys.stderr)
        yield f"data: WebSocket stop, error : {e}\n\n"


async def sse(request):
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    fil = open('test.txt', 'w+')
    print(f" Jwt : {JWT[0]}", file=fil)
    fil.close()
    apikey=request.GET.get("apikey")
    AI = request.GET.get('ai')
    idplayer = request.GET.get("idplayer")
    if idplayer == 0 :
        idp1 = int(request.GET.get("JWTidP1"))
        idp2 = int(request.GET.get("JWTidP2"))
        if idp1 < 0 :
            username1 = JWT[0]["username"]
        else :
            username1 = JWT[0]["invites"][idp1]

        if idp2 < 0 :
            username2 = JWT[0]["username"]
        else :
            username2 = JWT[0]["invites"][idp2]

    elif idplayer == 1 :
        idp1 = int(requests.GET.get("JWTidP1"))
        if idp1 < 0 :
            username1 = JWT[0]["username"]
        else :
            username1 = JWT[0]["invites"][idp1]
        
        username2 = "None"
    else :
        idp2 = int(requests.GET.get("JWTidP2"))
        if idp2 < 0 :
            username2 = JWT[0]["username"]
        else :
            username2 = JWT[0]["invites"][idp2]
        username1 = "None"
    
    jsonUernames = {"p1" : username1, "p2" :username2}
    rq = RequestParsed(apikey, {})
    if (rq.apiKey) :
        print(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI} JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ", file=sys.stderr)
        return StreamingHttpResponse(checkForUpdates(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}&name={jsonUernames}", rq.apiKey), content_type="text/event-stream")

@csrf_exempt
def setApiKeySp(request):
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    print(f" Jwt : {JWT[0]}", file=sys.stderr)
    apikey = json.loads(request.body).get('apiKey')
    dictApiSp[apikey] = 1
    apiKeys.append(apikey)
    return JsonResponse({"playable": "Game can start"})


@csrf_exempt
def setApiKey(request):
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    fil = open('test.txt', 'w+')
    print(f" Jwt : {JWT[0]}", file=fil)
    fil.close()
    apikey = json.loads(request.body).get('apiKey')
    if apikey not in apiKeysUnplayable:
        return JsonResponse({"playable" : f"Room {apikey} doesn't Exists"})
    if apikey in dictApi :
        dictApi[apikey] += 1
    else :
        dictApi[apikey] = 1

    if (dictApi[apikey] > 1) :
        apiKeysUnplayable.remove(apikey)
        apiKeys.append(apikey)
        playable = "Game can start"
    else :
        playable = "Need more player"

    return JsonResponse({"playable": playable})

@csrf_exempt
def isGamePlayable(request) :
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    print(f" Jwt : {JWT[0]}", file=sys.stderr)
    apikey = json.loads(request.body).get('apiKey')
    if (dictApi[apikey] > 1) :
        apiKeys.append(apikey)
        playable = "Game can start"
    else :
        playable = "Need more player"
    #print(f"playable : {playable}", file=sys.stderr)
    return JsonResponse({"playable": playable})


def get_api_key(request):
    JWT = decodeJWT(request)
    fil = open('test.txt', 'w+')
    print(f" Jwt : {JWT[0]}", file=fil)
    fil.close()
    if not JWT[0] :
        return HttpResponseNoContent() # Set an error 
    api_key = str(uuid.uuid4())
    apiKeysUnplayable.append(api_key)

    return JsonResponse({"api_key": api_key})

@csrf_exempt
async def sendNewJSON(request):
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    print(f" Jwt : {JWT[0]}", file=sys.stderr)
    dictionnaryJson = json.loads(request.body)
    # #print(f"dictio : {dictionnaryJson}")
    rq = RequestParsed(dictionnaryJson.get("apiKey", None), dictionnaryJson.get("message", {}))
    # #print(rq.apiKey, file=sys.stderr)
    if (rq.apiKey) :
        # #print(f"Heyo : {type(rq.action).__name__} | {rq.action}", file=sys.stderr)
        await channel_layer.group_send(
            rq.apiKey,
            {
                "type": "tempReceived",
                "text_data": rq.action
            }
        )
    return HttpResponse(status=204)
    # #print(f"Reiceived Json : {dictionnaryJson}", file=sys.stderr)

async def forfaitUser(request) :
    JWT = decodeJWT(request)
    if not JWT[0] :
        return HttpResponse401() # Set an error 
    print(f" Jwt : {JWT[0]}", file=sys.stderr)
    apikey = request.GET.get("apikey")
    idplayer = request.GET.get("idplayer")
    rq = RequestParsed(apikey, {})
    #print("---------------------6>   ->  -> Trying to disconnect ", file=sys.stderr)
    if (rq.apiKey) :
        print("Yay", file=sys.stderr)
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
                return
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
    print(f" Jwt : {JWT[0]}", file=sys.stderr)
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



