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
from http import HTTPStatus

channel_layer = get_channel_layer()

uri = "wss://server_pong:8030/ws/game/"

class HttpResponseNoContent(HttpResponse):
    status_code = HTTPStatus.NO_CONTENT

# apiKey is a string that identifies the game room

class   RequestParsed :
    def __init__(self, apiKey, action) :
        if apiKey in apiKeys or apiKey in apiKeysUnplayable :
            self.apiKey = apiKey
        else :
            self.apiKey = None
        self.action = action

# Create your views here.

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
    apikey=request.GET.get("apikey")
    AI = request.GET.get('ai')
    idplayer = request.GET.get("idplayer")
    rq = RequestParsed(apikey, {})
    if (rq.apiKey) :
        print(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI} JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ", file=sys.stderr)
        return StreamingHttpResponse(checkForUpdates(f"{uri}?room={rq.apiKey}&userid={idplayer}&AI={AI}", rq.apiKey), content_type="text/event-stream")

@csrf_exempt
def setApiKeySp(request):
    apikey = json.loads(request.body).get('apiKey')
    dictApiSp[apikey] = 1
    apiKeys.append(apikey)
    return JsonResponse({"playable": "Game can start"})


@csrf_exempt
def setApiKey(request):
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
    apikey = json.loads(request.body).get('apiKey')
    if (dictApi[apikey] > 1) :
        apiKeys.append(apikey)
        playable = "Game can start"
    else :
        playable = "Need more player"
    #print(f"playable : {playable}", file=sys.stderr)
    return JsonResponse({"playable": playable})


def get_api_key(request):
    api_key = str(uuid.uuid4())

    apiKeysUnplayable.append(api_key)

    return JsonResponse({"api_key": api_key})

@csrf_exempt
async def sendNewJSON(request):
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
    apikey = request.GET.get("apikey")
    idplayer = request.GET.get("idplayer")
    rq = RequestParsed(apikey, {})
    #print("---------------------6>   ->  -> Trying to disconnect ", file=sys.stderr)
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
                return
        try :
            apiKeys.remove(apikey)
        except Exception :
            apiKeysUnplayable.remove(apikey)
            return HttpResponseNoContent()
    return HttpResponseNoContent()

async def disconnectUsr(request) :
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



