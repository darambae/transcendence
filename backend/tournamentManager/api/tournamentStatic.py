import os
import shortuuid
import sys
import requests
from django.http import JsonResponse, StreamingHttpResponse
import asyncio
import random


LOCAL = 1
REMOTE = 2

trnmtDict = {}
dictJwt = {}

keygame = "https://server_pong:8030/"
jwtUri = "https://auth:4020/"
dbUri = "https://access_postgresql:4000/"

user_ws_connections = {}

class Match() :
    def __init__(self, cookies, p1=None, p2=None, matchBefore=None) :
        self.key = getApiKeyTrnmt(cookies)
        self.p1 = p1
        self.p2 = p2
        self.jwtP1 = None
        self.jwtP2 = None
        self.gameMode = REMOTE
        self.launchable = True
        self.mainAccount = -1
        self.played = False

        self.first = None
        self.second = None
        self.third = None
        self.fourth = None
        self.matchBefore = matchBefore

    def initValues(self, previousM=None) :
        if previousM :
            self.matchBefore = previousM
        if (not self.p1 or not self.p2) :
            return False
        self.jwtP1 = self.p1.jwt
        self.jwtP2 = self.p2.jwt


        if self.jwtP1["username"] == self.jwtP2["username"] :
            self.gameMode = LOCAL
            if self.jwtP1["username"] == self.p1.username:
                self.mainAccount = self.p1
            else:
                self.mainAccount = self.p2
        if (self.matchBefore and ((self.matchBefore.p1.username in self.jwtP1["invites"]) or (self.matchBefore.p1.username in self.jwtP2["invites"]) or (self.matchBefore.p2.username in self.jwtP1["invites"]) or (self.matchBefore.p2.username in self.jwtP2["invites"]))) :
            self.launchable = False
        return True
        


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
        self.first = None
        self.second = None
        self.third = None
        self.fourth = None
        self.launched = False
        

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
        if self.nbPl != 4 :
            return (False, "Tournament must contain 4 players")
        lstTemp = [self.players.pop(random.randint(0, 3))]
        lstTemp.append(self.players.pop(random.randint(0, 2)))

        self.tournamentPl = [lstTemp, self.players]
        self.players += lstTemp
        self.match1 = Match(cookies,self.tournamentPl[0][0], self.tournamentPl[0][1])
        self.match1.initValues()
        self.match2 = Match(cookies,self.tournamentPl[1][0], self.tournamentPl[1][1], self.match1)
        self.match2.initValues()
        self.matchWinnerBracket = Match(cookies)
        self.matchLoserBracket = Match(cookies)
        self.launched = True
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
    res = requests.get(f"{keygame}server-pong/api-key", verify=False, cookies=cookies, headers={"Host": "localhost"})
    if (res.status_code == 200 or res.status_code == 204) :
        return res.json()["api_key"]
    return (JsonResponse({"Error" : f"Status code {res.status_code}"}, status=res.status_code))

async def supervise_match(tkey) :
    infoResultsMatch = None
    while not infoResultsMatch :
        res = requests.get(f"{dbUri}api/game/{tkey}/", verify=False, headers={"Host": "localhost"})
        if res.status_code == 200 :
            infoResultsMatch = res.json()
        await asyncio.sleep(2)
    return infoResultsMatch
