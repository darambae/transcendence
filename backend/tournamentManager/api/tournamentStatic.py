import os
import shortuuid
import requests

LOCAL = 1
REMOTE = 2

trnmtDict = {} # Usage : {str : Tournament}

keygame = "https://server_pong:8030/"
jwtUri = "https://auth:4020/"
dbUri = "https://access-postgresql:4000/"

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

    def initValues(self) :
        res = requests.get(f'{jwtUri}jwt-decoder?jwt={p1.jwt}')
        if res.status_code == 200 :
            self.jwtP1 = res.json()
        
        res = requests.get(f'{jwtUri}jwt-decoder?jwt={p2.jwt}')
        if res.status_code == 200 :
            self.jwtP2 = res.json()
        
        if self.jwtP1["related-username"] == self.jwtP2["related-username"] :
            self.gameMode = LOCAL
            if jwtP1["related-username"] == jwtP1["username"] :
                self.mainAccount = p1.jwt
            else:
                self.mainAccount = p2.jwt
        
        if (matchBefore and (matchBefore.jwtP1["related-username"] == self.jwtP1["related-username"]) or (matchBefore.jwtP1["related-username"] == self.jwtP2["related-username"]) or (matchBefore.jwtP2["related-username"] == self.jwtP1["related-username"]) or (matchBefore.jwtP2["related-username"] == self.jwtP2["related-username"])) :
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
            raise TournamentError("Tournament must contain 4 players")
        lstTemp = [self.players.pop(random.randint(0, 3))]
        lstTemp.append(self.players.pop(random.randint(0, 2)))
        self.tournamentPl = [lstTemp, players]
        print(f"self.tournament : {self.tournamentPl}", file=sys.stderr)
        self.match1 = Match(self.tournamentPl[0][0], self.tournamentPl[0][1])
        self.match2 = Match(self.tournamentPl[1][0], self.tournamentPl[1][1], self.match1)
        self.match1.initValues()
        self.match2.initValues()
        self.matchWinnerBracket = Match()
        self.matchLoserBracket = Match()

    
    def listPlayers(self) :
        return [P.toTuple for P in self.players]


def getApiKeyTrnmt() :
    res = requests.get(f"{keygame}server-pong/api-key")
    if (res.status_code == 200) :
        return res.json()["api_key"]

async def supervise_match(tkey) :
    infoResultsMatch = None
    while not infoResultsMatch :
        res = requests.get(f"{dbUri}results?matchkey={tkey}")
        if res.status_code == 200 :
            infoResultsMatch = res.json()
        await asyncio.sleep(2)
    return infoResultsMatch
