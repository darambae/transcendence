import sys
import json
import time
import redis
import random
import asyncio
import requests
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from .tournamentStatic import Tournament, Player, trnmtDict, getApiKeyTrnmt, LOCAL, REMOTE, supervise_match, Match, user_ws_connections

async def setResults(trnmt, username, roundMatch, mKey) :
	if (int(roundMatch) == 1) :
		if trnmt.match1.key == mKey :
			if not trnmt.match2.launchable :
				nextMatch = "m2"
			else :
				nextMatch = "final-rounds"
			trnmt.match1.played = True
			trnmt.match2.launchable = True
			mId = 1
			if (trnmt.matchWinnerBracket.p1 == None) :
				if username == trnmt.match1.p1.username :
					trnmt.matchWinnerBracket.p1 = trnmt.match1.p1
				else :
					trnmt.matchWinnerBracket.p1 = trnmt.match1.p2
			else :

				if username == trnmt.match1.p1.username :
					trnmt.matchWinnerBracket.p2 = trnmt.match1.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match1.p2
			if (trnmt.matchLoserBracket.p1 == None) :
				if username == trnmt.match1.p1.username :
					trnmt.matchLoserBracket.p1 = trnmt.match1.p2
				else : 
					trnmt.matchLoserBracket.p1 = trnmt.match1.p1
			else :
				if username == trnmt.match1.p1.username :
					trnmt.matchLoserBracket.p2 = trnmt.match1.p2
				else : 
					trnmt.matchLoserBracket.p2 = trnmt.match1.p1

		elif trnmt.match2.key == mKey :
			if not trnmt.match1.launchable :
				nextMatch = "m1"
			else :
				nextMatch = "final-rounds"
			trnmt.match2.played = True
			trnmt.match1.launchable = True
			mId = 2
			if (trnmt.matchWinnerBracket.p1 == None) :
				if username == trnmt.match2.p1.username :
					trnmt.matchWinnerBracket.p1 = trnmt.match2.p1
				else :
					trnmt.matchWinnerBracket.p1 = trnmt.match2.p2
			else :
				if username == trnmt.match2.p1.username :
					trnmt.matchWinnerBracket.p2 = trnmt.match2.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match2.p2
			if (trnmt.matchLoserBracket.p1 == None) :
				if username == trnmt.match2.p1.username :
					trnmt.matchLoserBracket.p1 = trnmt.match2.p2
				else : 
					trnmt.matchLoserBracket.p1 = trnmt.match2.p1
			else :
				if username == trnmt.match2.p1.username :
					trnmt.matchLoserBracket.p2 = trnmt.match2.p2
				else : 
					trnmt.matchLoserBracket.p2 = trnmt.match2.p1
		
		if (trnmt.matchWinnerBracket.p1 and trnmt.matchWinnerBracket.p2) :
			trnmt.matchWinnerBracket.initValues()
			trnmt.matchLoserBracket.initValues(trnmt.matchWinnerBracket)
		
		return (mId, nextMatch)
	
	else :
		if trnmt.matchWinnerBracket.key == mKey :
			if not trnmt.matchLoserBracket.launchable :
				nextMatch = "final-rounds"
			else :
				nextMatch = "set-results"
			trnmt.matchWinnerBracket.played = True
			trnmt.matchLoserBracket.launchable = True
			if username == trnmt.matchWinnerBracket.p1.username :
				trnmt.first = trnmt.matchWinnerBracket.p1
				trnmt.second = trnmt.matchWinnerBracket.p2
			else :
				trnmt.first = trnmt.matchWinnerBracket.p2
				trnmt.second = trnmt.matchWinnerBracket.p1
		else :
			if not trnmt.matchWinnerBracket.launchable :
				nextMatch = "final-rounds"
			else :
				nextMatch = "set-results"
			trnmt.matchLoserBracket.played = True
			trnmt.matchWinnerBracket.launchable = True
			if username == trnmt.matchLoserBracket.p1.username :
				trnmt.third = trnmt.matchLoserBracket.p1
				trnmt.fourth = trnmt.matchLoserBracket.p2
			else :
				trnmt.fourth = trnmt.matchLoserBracket.p1
				trnmt.third = trnmt.matchLoserBracket.p2
	
		return (5, nextMatch)

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)

		self.room_group_name = params.get('tkey', [None])[0]
		self.myJWT = params.get("jwt", [None])[0] #Encoded 
		self.name = params.get("name", [None])[0]
		self.guests = (params.get("guests", ["Nan"])[0]).split(',')


		if not self.room_group_name:
			await self.close()
			return
		
		await self.accept()

		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		await self.send(text_data=json.dumps({
			't_state': "Succefully joined tournament"
		}))

		await self.channel_layer.group_send(
			self.room_group_name,
			{
				"type" : "sendHB",
				"text_data" : {"lorem" : "ipsum"}

			}
		)
	
	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)


	async def launchGame(self, match, roundM) :
		if match.p1.jwt != match.p2.jwt :
			match.gameMode = REMOTE
		if match.gameMode == REMOTE :
			userLst = sorted([match.p1.username, match.p2.username])

			if self.name == match.p1.username or match.p1.username in self.guests:
				user = match.p1.username
				playerId = 1
			else :
				user = match.p2.username
				playerId = 2
			if (self.name == match.p1.username or match.p1.username in self.guests or self.name == match.p2.username or match.p2.username in self.guests) :
				await self.send(text_data=json.dumps({
					"t_state" : "game-start",
					"mode" : "remote",
					"tkey" : self.room_group_name,
					"playerId" : playerId,
					"player" : user,
					"key" : match.key,
					"round" : roundM,
				}))
		else :
			if (self.name == match.p1.username or match.p1.username in self.guests or self.name == match.p2.username or match.p2.username in self.guests) :
				await self.send(text_data=json.dumps({
					"t_state" : "game-start",
					"mode" : "local",
					"tkey" : self.room_group_name,
					"player1" : match.p1.username,
					"player2" : match.p2.username,
					"key" : match.key,
					"round" : roundM,
				}))

							
	async def receive(self, text_data):
		data = text_data
		action = data.get("action")
		if action == "create-bracket" :
			await self.send(text_data=json.dumps({"t_state" : "firsts-match-preview", "tkey" : self.room_group_name, "match1" : {"player1" : trnmtDict[self.room_group_name].match1.p1.username, "player2" : trnmtDict[self.room_group_name].match1.p2.username}, "match2" : {"player1" : trnmtDict[self.room_group_name].match2.p1.username, "player2" : trnmtDict[self.room_group_name].match2.p2.username}}))
			if trnmtDict[self.room_group_name].match1.launchable and not trnmtDict[self.room_group_name].match1.played:
				await self.launchGame(trnmtDict[self.room_group_name].match1, 1)
			if trnmtDict[self.room_group_name].match2.launchable and not trnmtDict[self.room_group_name].match2.played:
				await self.launchGame(trnmtDict[self.room_group_name].match2, 1)
		
		elif action == "final-matches" :
			await self.send(text_data=json.dumps({"t_state" : "final-match-preview", "tkey" : self.room_group_name, "matchWinner" : {"player1" : trnmtDict[self.room_group_name].matchWinnerBracket.p1.username, "player2" : trnmtDict[self.room_group_name].matchWinnerBracket.p2.username}, "matchLooser" : {"player1" : trnmtDict[self.room_group_name].matchLoserBracket.p1.username, "player2" : trnmtDict[self.room_group_name].matchLoserBracket.p2.username}}))
			if trnmtDict[self.room_group_name].matchWinnerBracket.launchable and not trnmtDict[self.room_group_name].matchWinnerBracket.played:
				await self.launchGame(trnmtDict[self.room_group_name].matchWinnerBracket, 2)
			if trnmtDict[self.room_group_name].matchLoserBracket.launchable and not trnmtDict[self.room_group_name].matchLoserBracket.played:
				await self.launchGame(trnmtDict[self.room_group_name].matchLoserBracket, 2)
	
		elif action == "update-guest": 
			jwt_l = data.get("jwt-list")
			
			for elem in jwt_l :
				if (self.name == elem["username"] or self.name in elem["invites"]) :
					self.guests = elem["invites"]
		elif action == "ShowResults" :
			dicoInfo = {
				"t_state" : "results",
				"tkey" : self.room_group_name,
				"first" : trnmtDict[self.room_group_name].first.username,
				"second" : trnmtDict[self.room_group_name].second.username,
				"third" : trnmtDict[self.room_group_name].third.username,
				"fourth" : trnmtDict[self.room_group_name].fourth.username
			}
			await self.send(text_data=json.dumps(dicoInfo))

			await asyncio.sleep(5)

			trnmtDict.pop(self.room_group_name)

			await asyncio.sleep(2)

			await self.sendReload(text_data)

		elif action == "supervise" and self.name == data.get("player", None):
			roundMatch = data.get("round", 1)
			mKey = data.get("mKey", None)
			tkey = data.get("tkey", None)
			if not mKey:
				return 

			trnmt = trnmtDict[tkey]
			task = asyncio.create_task(supervise_match(mKey))
			results = await task
			if int(roundMatch) == 1 : 
				if int(results["score1"]) == 5 : 
					matchId, nextToLaunch = await setResults(trnmt, results["username1"], roundMatch, results['matchKey'])
				else :
					matchId, nextToLaunch = await setResults(trnmt, results["username2"], roundMatch, results['matchKey'])
			elif int(roundMatch) == 2 :
				if int(results["score1"]) == 5 : 
					matchId, nextToLaunch = await setResults(trnmt, results["username1"], roundMatch, results['matchKey'])
				else :
					matchId, nextToLaunch = await setResults(trnmt, results["username2"], roundMatch, results['matchKey'])
			
			dicoInfo = {
				"t_state" : "game-finished",
				"matchId" : matchId,
                "mkey": results['matchKey'],
				"next" : nextToLaunch,
				"tkey" : self.room_group_name
			}
			if trnmt.first and trnmt.second and trnmt.third and trnmt.fourth :

				dicoInfo2 = {
					"t_state" : "results",
					"tkey" : self.room_group_name,
					"first" : trnmtDict[self.room_group_name].first.username,
					"second" : trnmtDict[self.room_group_name].second.username,
					"third" : trnmtDict[self.room_group_name].third.username,
					"fourth" : trnmtDict[self.room_group_name].fourth.username
				}

				await self.channel_layer.group_send(
					self.room_group_name,
					{
						"type": "tempReceived",
						"text_data": {"action" : "ShowResults"}
					}
				)

			await self.send(text_data=json.dumps(dicoInfo))



	async def tempReceived(self, event) :
		await self.receive(event["text_data"])

	async def sendHB(self, event) :
		await self.send(text_data=json.dumps({"t_state" : "Someone-joined-left"}))

	async def sendReload(self, event) :
		await self.send(text_data=json.dumps({"t_state" : "Back-to-main"}))

	
	
