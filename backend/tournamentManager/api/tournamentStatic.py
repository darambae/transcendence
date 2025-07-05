import os
import shortuuid
import sys
import requests
from django.http import JsonResponse, StreamingHttpResponse
import asyncio
import random


LOCAL = 1
REMOTE = 2

trnmtDict = {} # Usage : {str : Tournament}
dictJwt = {}

keygame = "https://server_pong:8030/"
jwtUri = "https://auth:4020/"
dbUri = "https://access_postgresql:4000/"

user_ws_connections = {}

class Match() :
    def __init__(self, cookies, p1=None, p2=None, matchBefore=None) :
        print(f"match-class", file=sys.stderr)
        self.key = getApiKeyTrnmt(cookies)
        print(f"match-class : {self.key}", file=sys.stderr)
        self.p1 = p1
        print(f"match-class", file=sys.stderr)
        self.p2 = p2
        print(f"match-class", file=sys.stderr)
        self.jwtP1 = None
        print(f"match-class", file=sys.stderr)
        self.jwtP2 = None
        print(f"match-class", file=sys.stderr)
        self.gameMode = REMOTE
        print(f"match-class", file=sys.stderr)
        self.launchable = True
        print(f"match-class", file=sys.stderr)
        self.mainAccount = -1
        print(f"match-class", file=sys.stderr)

        self.first = None
        print(f"match-class", file=sys.stderr)
        self.second = None
        print(f"match-class", file=sys.stderr)
        self.third = None
        print(f"match-class", file=sys.stderr)
        self.fourth = None
        print(f"match-class", file=sys.stderr)
        self.matchBefore = matchBefore

    def initValues(self) :
        print("match-init", file=sys.stderr)
        self.jwtP1 = self.p1.jwt
        self.jwtP2 = self.p2.jwt

        if self.jwtP1["username"] == self.jwtP2["username"] :
            print("match-init", file=sys.stderr)
            self.gameMode = LOCAL
            print("match-init", file=sys.stderr)
            if self.jwtP1["username"] == self.p1.username:
                print("match-init-p1", file=sys.stderr)
                self.mainAccount = self.p1
            else:
                print("match-init-p2", file=sys.stderr)
                self.mainAccount = self.p2
        print("match-init", file=sys.stderr)
        print(self.matchBefore, file=sys.stderr)
        # print
        if (self.matchBefore and ((self.matchBefore.p1.username in self.jwtP1["invites"]) or (self.matchBefore.p1.username in self.jwtP2["invites"]) or (self.matchBefore.p2.username in self.jwtP1["invites"]) or (self.matchBefore.p2.username in self.jwtP2["invites"]))) :
            self.launchable = False
        print("match-init", file=sys.stderr)
        


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
            self.players = playerUpdate(self.players, playerClass.jwt)
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
    def launchTournament(self, cookies) :
        print("launch-tr", file=sys.stderr)
        if self.nbPl != 4 :
            print("launch-tr-end-1", file=sys.stderr)
            return (False, "Tournament must contain 4 players")
        print(f"launch-tr : {self.players}", file=sys.stderr)
        lstTemp = [self.players.pop(random.randint(0, 3))]
        print("launch-tr", file=sys.stderr)
        lstTemp.append(self.players.pop(random.randint(0, 2)))
        print("launch-tr", file=sys.stderr)
        print(lstTemp, file=sys.stderr)
        print(self.players, file=sys.stderr)
        
        self.tournamentPl = [lstTemp, self.players]
        print(f"self.tournament : {self.tournamentPl}", file=sys.stderr)
        self.match1 = Match(cookies,self.tournamentPl[0][0], self.tournamentPl[0][1])
        print("launch-tr", file=sys.stderr)
        self.match1.initValues()
        print("launch-tr", file=sys.stderr)
        self.match2 = Match(cookies,self.tournamentPl[1][0], self.tournamentPl[1][1], self.match1)
        print("launch-tr", file=sys.stderr)
        self.match2.initValues()
        print("launch-tr", file=sys.stderr)
        self.matchWinnerBracket = Match(cookies)
        print("launch-tr", file=sys.stderr)
        self.matchLoserBracket = Match(cookies)
        print("launch-tr", file=sys.stderr)
        return (True, None)

    def listJWT(self) :
        return [elem.jwt for elem in self.players]
    
    def listJWTPlayers(self) :
        return [elem.jwt["username"] for elem in self.players]

    def listPlayers(self) :
        return [P.toTuple for P in self.players]


def playerUpdate(lstPlayer, jwt) :
    for elem in lstPlayer :
        if elem.jwt["username"] == jwt["username"] :
            elem.jwt = jwt
    return lstPlayer

def getApiKeyTrnmt(cookies) :
    print("get-api-key-trnmt", file=sys.stderr)
    res = requests.get(f"{keygame}server-pong/api-key", verify=False, cookies=cookies, headers={"Host": "localhost"})
    print(f"get-api-key-trnmt\nres status code : {res.status_code}\nres.content : {res.json()}", file=sys.stderr)
    if (res.status_code == 200 or res.status_code == 204) :
        print(f"get-api-key-trnmt", file=sys.stderr)
        return res.json()["api_key"]
    print("get-api-key-trnmt", file=sys.stderr)
    return (JsonResponse({"Error" : f"Status code {res.status_code}"}, status=res.status_code))

async def supervise_match(tkey) :
    infoResultsMatch = None
    print(f"AAA : {infoResultsMatch} ", file=sys.stderr)
    while not infoResultsMatch :
        print("BBBB", file=sys.stderr)
        res = requests.get(f"{dbUri}api/game/{tkey}/", verify=False)
        print(f"CCCC : {res.status_code}", file=sys.stderr)
        if res.status_code == 200 :
            infoResultsMatch = res.json()
            print(f"DDDDD : {infoResultsMatch}", file=sys.stderr)
        await asyncio.sleep(2)
    print("EEEEEEEE", file=sys.stderr)
    return infoResultsMatch
