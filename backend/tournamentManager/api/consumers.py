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

async def setResults(trnmt, username) :
	if (roundMatch == 1) :
		if trnmt.match1.key == mKey :
			if results[username] == trnmt.match1.p1.username :
				if (trnmt.matchWinnerBracket.p1 == None) :
					trnmt.matchWinnerBracket.p1 = trnmt.match1.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match1.p1
				if (trnmt.matchLoserBracket.p1 == None) :
					trnmt.matchLoserBracket.p1 = trnmt.match1.p2
				else :
					trnmt.matchLoserBracket.p2 = trnmt.match1.p2
		elif trnmt.match2.key == mKey :
			if results[username] == trnmt.match2.p1.username :
				if (trnmt.matchWinnerBracket.p1 == None) :
					trnmt.matchWinnerBracket.p1 = trnmt.match2.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match2.p1
				if (trnmt.matchLoserBracket.p1 == None) :
					trnmt.matchLoserBracket.p1 = trnmt.match2.p2
				else :
					trnmt.matchLoserBracket.p2 = trnmt.match2.p2
	
	else :
		if trnmt.matchWinnerBracket.key == mKey :
			if results[username] == trnmt.matchWinnerBracket.p1.username :
				trnmt.first = trnmt.matchWinnerBracket.p1
				trnmt.second = trnmt.matchWinnerBracket.p2
			else :
				trnmt.first = trnmt.matchWinnerBracket.p2
				trnmt.second = trnmt.matchWinnerBracket.p1
		else :
			if results[username] == trnmt.matchLoserBracket.p1.username :
				trnmt.third = trnmt.matchLoserBracket.p1
				trnmt.fourth = trnmt.matchLoserBracket.p2
			else :
				trnmt.fourth = trnmt.matchLoserBracket.p1
				trnmt.third = trnmt.matchLoserBracket.p2

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)

		self.room_group_name = params.get('tkey', [None])[0]
		print(f"self.room_group_name : {self.room_group_name}", file=sys.stderr)
		self.myJWT = params.get("jwt", [None])[0] #Encoded 

		if not self.room_group_name:
			await self.close()
			return

		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		await self.accept()

		await self.send(text_data=json.dumps({
			't_state': "Succefully joined tournament"
		}))

		user_ws_connections[self.myJWT] = self
	
	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)


	async def launchGame(self, match) :
		if match.gameMode == REMOTE :
			if self.myJWT == match.p1.jwt :
				user = match.p1.username
			else :
				user = match.p2.username
			await self.send(text_data=json.dumps({
				"t_state" : "game-start",
				"mode" : "remote", 
				"player" : user,
				"key" : match.key
			}))
		else :
			await self.send(text_data=json.dumps({
				"t_state" : "game-start",
				"mode" : "local",
				"player1" : match.p1.username,
				"player2" : match.p2.username,
				"key" : match.key
			}))

							
	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data.get("action")
		print(f"ction : {action}", file=sys.stderr)
		if action == "create-bracket" :
			print(f"self.myJWT : {self.myJWT}\ntrnmtDict[self.room_group_name].match1.p1.jwt : {trnmtDict[self.room_group_name].match1.p1.jwt}\ntrnmtDict[self.room_group_name].match1.p2.jwt : {trnmtDict[self.room_group_name].match1.p2.jwt}", file=sys.stderr)
			if self.myJWT == trnmtDict[self.room_group_name].match1.p1.jwt or self.myJWT == trnmtDict[self.room_group_name].match1.p2.jwt :
				if trnmtDict[self.room_group_name].match1.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match1)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						await asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match1)
			elif self.myJWT == trnmtDict[self.room_group_name].match2.p1.jwt or self.myJWT == trnmtDict[self.room_group_name].match2.p2.jwt  : 
				if trnmtDict[self.room_group_name].match2.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match2)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						await asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match2)
		
		elif action == "final-matches" :
			if self.myJWT == trnmtDict[self.room_group_name].matchWinnerBracket.p1.jwt or self.myJWT == trnmtDict[self.room_group_name].matchWinnerBracket.p2.jwt :
				if trnmtDict[self.room_group_name].matchWinnerBracket.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].matchWinnerBracket)
				else :
					while not trnmtDict[self.room_group_name].finished :
						await asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].matchWinnerBracket)
			elif self.myJWT == trnmtDict[self.room_group_name].matchLoserBracket.p1.jwt or self.myJWT == trnmtDict[self.room_group_name].matchLoserBracket.p2.jwt :
				if trnmtDict[self.room_group_name].matchLoserBracket.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].matchLoserBracket)
				else :
					while not trnmtDict[self.room_group_name].finished :
						await asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].matchLoserBracket)
		
		elif action == "supervise" :
			tKey = data.get("tKey", None) 
			roundMatch = data.get("round", 1)
			mKey = data.get("mKey", None)
			if not tKey or not mKey:
				return 
			trnmt = trnmtDict[tKey]
			task = asyncio.create_task(supervise_match(mKey))
			results = await task
			if results["score1"] == 5 :
				await setResults(trnmt, "username1")
			else :
				await setResults(trnmt, "username2")
		
		# elif action == "leave" :
		# 	await self.disconnect(200)
				


					# if results["username1"] == trnmtDict[tKey].match1.p1.username :
					# 	if (trnmtDict[tKey].matchWinnerBracket.p1 == None) :
					# 		trnmtDict[tKey].matchWinnerBracket.p1 = trnmtDict[tKey].match1.p1
					# 	else :
					# 		trnmtDict[tKey].matchWinnerBracket.p2 = trnmtDict[tKey].match1.p1
					# elif results["username1"] == trnmtDict[tKey].match1.p2.username :
					# 	if (trnmtDict[tKey].matchWinnerBracket.p1 == None) :
					# 		trnmtDict[tKey].matchWinnerBracket.p1 = trnmtDict[tKey].match1.p2
					# 	else :
					# 		trnmtDict[tKey].matchWinnerBracket.p2 = trnmtDict[tKey].match1.p1







	async def tempReceived(self, event) :
		print("tempReceived", file=sys.stderr)
		await self.receive(event["text_data"])

	
	