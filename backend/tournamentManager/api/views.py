from django.shortcuts import render
import shortuuid
import random

# Create your views here.

trnmtDict = {} # Usage : {str : Tournament}

class Player() :
    def __init__(self, jwt, username):
        self.jwt = jwt
        self.username = username
    
class Tournament() :
    def __init__(self) :
        self.tKey = "Trnmt_" + shortuuid.ShortUUID().random(length=9)
        self.players = []
        self.tournamentPl = []
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
            return False
        lstTemp = [self.players.pop(random.randint(0, 3))]
        lstTemp.append(self.players.pop(random.randint(0, 2)))

        

