from django.shortcuts import render
import random
import sys
import jwt
import redis
from .tournamentStatic import Tournament, Player, trnmtDict
r = redis.Redis()

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

async def getJWT(request) :
    auth_header = request.headers.get('Authorization', None)
    if not auth_header:
        return None
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]

    return token 

@csrf_exempt
async def launchTournament(request) :
    async def launchTournament(request):
    try:
        body = json.loads(request.body)
        tkey = body["tKey"]
        if tkey not in trnmtDict:
            return JsonResponse({"Error": "Tournament not found"}, status=404)
        trnmtDict[tkey].launchTournament()

        message = json.dumps({
            "event": "tournament_launched",
            "match1" : f'{trnmtDict[tkey].tournamentPl[0][0]}:{trnmtDict[tkey].tournamentPl[0][1]}'
            "match2" : f"{trnmtDict[tkey].tournamentPl[1][0]}:{trnmtDict[tkey].tournamentPl[1][1]}"
        })
        r.publish(f"tournament:{tkey}", message)

        return JsonResponse({"Result": "Tournament launched"})
    except TournamentError as e:
        return JsonResponse({"Error": str(e)}, status=401)
    except Exception:
        return JsonResponse({"error": "Internal server error"}, status=500)

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

        # Fonction qui va écouter Redis pubsub et envoyer les messages en streaming
        async def event_stream():
            pubsub = r.pubsub()
            await pubsub.subscribe(f"tournament:{tKey}")

            try:
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=10)
                    if message:
                        data = message['data']
                        # data peut être bytes, on décode et renvoie JSON
                        if isinstance(data, bytes):
                            data = data.decode('utf-8')
                        yield f"data: {data}\n\n"
                    else:
                        # keep connection alive
                        yield ": keep-alive\n\n"
                    await asyncio.sleep(0.1)
            except asyncio.CancelledError:
                await pubsub.unsubscribe(f"tournament:{tKey}")
                raise
            finally:
                await pubsub.unsubscribe(f"tournament:{tKey}")

        # StreamingHttpResponse en mode SSE (Server Sent Events)
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
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


