from django.shortcuts import render
import random
import sys
import jwt
import redis
from .tournamentStatic import Tournament, Player, trnmtDict
from channels.layers import get_channel_layer

channel_layer = get_channel_layer()

consumerUri = "wss://tournament_manager:8050/ws/game/"

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


async def getJWT(request) :
    auth_header = request.headers.get('Authorization', None)
    if not auth_header:
        return None
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]

    return token 

@csrf_exempt
async def launchFinals(request) :
    try:
        body = json.loads(request.body)
        tkey = body["tKey"]
        if tkey not in trnmtDict:
            return JsonResponse({"Error": "Tournament not found"}, status=404)
        trnmtDict[tkey].launchTournament()

@csrf_exempt
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

@csrf_exempt
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

@csrf_exempt
async def joinTournament(request):
    try:
        body = json.loads(request.body)
        jwt_token = await getJWT(request)
        encodedJwt = 
        username = body["username"]
        tKey = body["tKey"]

        if tKey not in trnmtDict:
            return JsonResponse({"Error": "Tournament not found"}, status=404)

        player = Player(jwt_token, username)
        trnmtDict[tKey].addPlayers(player)

        response = StreamingHttpResponse(checkForUpdates(f'{consumerUri}?tkey={tKey}&jwt={jwt_token}'), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        return response

    except Exception as e:
        return JsonResponse({"error": "Internal server error"}, status=500)


@csrf_exempt
async def leaveTournament(request):
    try :
        body = json.loads(request.body)
        jwt = await getJWT(request)
        username = body["username"]
        tKey = body["tKey"]
        if tKey in trnmtDict :
            if (username, jwt) in trnmtDict[tKey].listPlayers() :
                trnmtDict[tKey].removePlayer(Player(jwt, username))
                return JsonResponse({"Result" : "Player removed from lobby"})
            else :
                return JsonResponse({"Error" : "Player not found"}, status=404)
        else :
            return JsonResponse({"Error" : "Tournament not found"}, status=404)
    except Exception :
        return JsonResponse({"error" : "Internal server error"}, status=500)

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
            trnmtDict[elem] = f"{trnmtDict[elem].nbPl} / 4"

        return JsonResponse(trnmtList)
    except Exception as e :
        return JsonResponse({"error" : "Internal server error"}, status=500)


