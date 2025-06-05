import os
import shortuuid

trnmtDict = {} # Usage : {str : Tournament}

keygame = "https://server_pong:8030/"

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
        self.match1 = getApiKeyTrnmt()
        self.match2 = getApiKeyTrnmt()
        self.matchWinnerBracket = getApiKeyTrnmt()
        self.matchLoserBracket = getApiKeyTrnmt()
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
    
    def listPlayers(self) :
        return [P.toTuple for P in self.players]


def getApiKeyTrnmt() :
    res = requests.get(f"{keygame}server-pong/api-key")
    if (res.status_code == 200) :
        return res.json()["api_key"]