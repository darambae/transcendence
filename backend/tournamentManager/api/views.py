from django.shortcuts import render
import shortuuid
import random
import sys
import jwt

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


trnmtDict = {} # Usage : {str : Tournament}

class Player() :
    def __init__(self, jwt, username):
        self.jwt = jwt
        self.username = username

    def __eq__(self, other) :
        if type(other).__name__ != "Player" :
            return False
        if other.jwt != self.jwt or other.username != self.username :
            return False
        return True

    def toTuple(self) :
        return (self.username, self.jwt)
    
class Tournament() :
    def __init__(self) :
        self.tKey = "Trnmt_" + shortuuid.ShortUUID().random(length=9)
        self.players = []
        self.tournamentPl = []
        self.final = []
        self.nbPl = 0
    def addPlayers(self, playerClass) :
        if self.nbPl < 4 :
            self.players.append(playerClass)
            self.nbPl += 1
            return True
        else :
            return False
    def removePlayer(self, playerClass) :
        if self.nbPl > 0 :
            self.players.remove(playerClass)
            self.nbPl -= 1
            return True
        return False
    def launchTournament(self) :
        if self.nbPl != 4 :
            raise TournamentError("Tournament ;ust contain 4 players")
        lstTemp = [self.players.pop(random.randint(0, 3))]
        lstTemp.append(self.players.pop(random.randint(0, 2)))
        self.tournamentPl = [lstTemp, players]
        print(f"self.tournament : {self.tournamentPl}", file=sys.stderr)
    
    def listPlayers(self) :
        return [P.toTuple for P in self.players]

async def getJWT(request) :
    auth_header = request.headers.get('Authorization', None)
    if not auth_header:
        return None
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]

    return token 

# Routes
# Decode JWT (Auth)

# setTournamentResult (Acces postgre)


@csrf_exempt
async def launchTournament(request) :
    try :
        body = json.loads(request.body)
        tkey = body["tKey"]
        if tkey in trnmtDict :
            trnmtDict[tkey].launchTournament()
        else :
            return JsonResponse({"Error" : "Tournament not found"}, status=404)
        #Tournament logic in consumer
    except TournamentError as e:
        return JsonResponse({"Error" : e}, status=401)
    except Exception :
        return JsonResponse({"error" : "Internal server error"}, status=500)


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



@csrf_exempt
async def joinTournament(request):
    try :
        body = json.loads(request.body)
        jwt = await getJWT(request)
        username = body["username"]
        tKey = body["tKey"]
        if tKey in trnmtDict :
            trnmtDict[tKey].addPlayers(Player(jwt, username))
        else :
            return JsonResponse({"Error" : "Tournament not found"}, status=404)
    except Exception as e :
        return JsonResponse({"error" : "Internal server error"}, status=500)


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


