import os
import shortuuid
import sys
import requests
from django.http import JsonResponse, StreamingHttpResponse


LOCAL = 1
REMOTE = 2

trnmtDict = {} # Usage : {str : Tournament}

keygame = "https://server-pong:8030/"
jwtUri = "https://auth:4020/"
dbUri = "https://access-postgresql:4000/"

user_ws_connections = {}

class Match() :
    def __init__(self, p1=None, p2=None, matchBefore=None) :
        self.key = getApiKeyTrnmt()
        self.p1 = p1
        self.p2 = p2
        self.jwtP1 = None
        self.jwtP2 = None
        self.gameMode = REMOTE
        self.launchable = True
        self.mainAccount = -1

        self.first = None
        self.second = None
        self.third = None
        self.fourth = None

    def initValues(self) :
        self.jwtP1 = requests.get(f"{jwtUri}api/DecodeJwt", headers={"Authorization" : f"bearer {self.p1.jwt}"})
        
        self.jwtP2 = requests.get(f"{jwtUri}api/DecodeJwt", headers={"Authorization" : f"bearer {self.p2.jwt}"})
        
        if self.jwtP1 == self.jwtP2 :
            self.gameMode = LOCAL
            if self.jwtP1["username"] == self.p1.username:
                self.mainAccount = p1
            else:
                self.mainAccount = p2
        
        if (matchBefore and (matchBefore.p1.username in self.jwtP1["invites"]) or (matchBefore.p1.username in self.jwtP2["invites"]) or (matchBefore.p2.username in self.jwtP1["invites"]) or (matchBefore.p2.username in self.jwtP2["invites"])) :
            self.launchable = False
        


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
        self.match1 = None
        self.match2 = None
        self.matchWinnerBracket = None
        self.matchLoserBracket = None
        self.finished = False

    def addPlayers(self, playerClass) :
        if self.nbPl < 4 :
            self.players.append(playerClass)
            self.nbPl += 1
            return True
        else :
            return False
    def listUsr(self) :
        return [i.username for i in self.players]
    def removePlayer(self, playerClass) :
        if self.nbPl > 0 :
            self.players.remove(playerClass)
            self.nbPl -= 1
            return True
        return False
    def launchTournament(self) :
        print("launch-tr", file=sys.stderr)
        if self.nbPl != 4 :
            print("launch-tr-end-1", file=sys.stderr)
            return (False, "Tournament must contain 4 players")
        print("launch-tr", file=sys.stderr)
        lstTemp = [self.players.pop(random.randint(0, 3))]
        print("launch-tr", file=sys.stderr)
        lstTemp.append(self.players.pop(random.randint(0, 2)))
        print("launch-tr", file=sys.stderr)
        self.tournamentPl = [lstTemp, players]
        print(f"self.tournament : {self.tournamentPl}", file=sys.stderr)
        self.match1 = Match(self.tournamentPl[0][0], self.tournamentPl[0][1])
        print("launch-tr", file=sys.stderr)
        self.match2 = Match(self.tournamentPl[1][0], self.tournamentPl[1][1], self.match1)
        print("launch-tr", file=sys.stderr)
        self.match1.initValues()
        print("launch-tr", file=sys.stderr)
        self.match2.initValues()
        print("launch-tr", file=sys.stderr)
        self.matchWinnerBracket = Match()
        print("launch-tr", file=sys.stderr)
        self.matchLoserBracket = Match()
        print("launch-tr", file=sys.stderr)
        return (True, None)

    def listJWT(self) :
        return [elem.jwt for elem in self.players]

    def listPlayers(self) :
        return [P.toTuple for P in self.players]


def getApiKeyTrnmt() :
    res = requests.get(f"{keygame}server-pong/api-key")
    if (res.status_code == 200) :
        return res.json()["api_key"]

async def supervise_match(tkey) :
    infoResultsMatch = None
    while not infoResultsMatch :
        res = requests.get(f"{dbUri}results?matchKey={tkey}")
        if res.status_code == 200 :
            infoResultsMatch = res.json()
        await asyncio.sleep(2)
    return infoResultsMatch
