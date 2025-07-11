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
	print(f"RoundM : {roundMatch} | type : {type(roundMatch).__name__}", file=sys.stderr)
	if (int(roundMatch) == 1) :
		print("---------------------------------! Firsts match !---------------------------------")
		if trnmt.match1.key == mKey :
			print("Soooo -> ", trnmt.match2.launchable, file=sys.stderr)
			if not trnmt.match2.launchable :
				nextMatch = "m2"
			else :
				nextMatch = "final-rounds"
			trnmt.match1.played = True
			trnmt.match2.launchable = True
			mId = 1
			print(f"=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=> :  winner bracket : {trnmt.matchWinnerBracket.p1} | {trnmt.matchWinnerBracket.p2}", file=sys.stderr)
			if (trnmt.matchWinnerBracket.p1 == None) :
				print(f"========================================================================> WINNERBRACEKT P1", file=sys.stderr)
				if username == trnmt.match1.p1.username :
					trnmt.matchWinnerBracket.p1 = trnmt.match1.p1
				else :
					trnmt.matchWinnerBracket.p1 = trnmt.match1.p2
			else :
				print(f"========================================================================> WINNERBRACEKT P2", file=sys.stderr)

				if username == trnmt.match1.p1.username :
					trnmt.matchWinnerBracket.p2 = trnmt.match1.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match1.p2
			if (trnmt.matchLoserBracket.p1 == None) :
				print(f"========================================================================> LOSER BRACEKT P1", file=sys.stderr)
				if username == trnmt.match1.p1.username :
					trnmt.matchLoserBracket.p1 = trnmt.match1.p2
				else : 
					trnmt.matchLoserBracket.p1 = trnmt.match1.p1
			else :
				print(f"========================================================================> LOSER BRACEKT P2", file=sys.stderr)
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
			print(f"=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=> :  winner bracket : {trnmt.matchWinnerBracket.p1} | {trnmt.matchWinnerBracket.p2}", file=sys.stderr)
			if (trnmt.matchWinnerBracket.p1 == None) :
				print(f"========================================================================> WINNERBRACEKT P1", file=sys.stderr)
				if username == trnmt.match2.p1.username :
					trnmt.matchWinnerBracket.p1 = trnmt.match2.p1
				else :
					trnmt.matchWinnerBracket.p1 = trnmt.match2.p2
			else :
				print(f"========================================================================> WINNERBRACEKT P2", file=sys.stderr)
				if username == trnmt.match2.p1.username :
					trnmt.matchWinnerBracket.p2 = trnmt.match2.p1
				else :
					trnmt.matchWinnerBracket.p2 = trnmt.match2.p2
			if (trnmt.matchLoserBracket.p1 == None) :
				print(f"========================================================================> LOSER BRACEKT P1", file=sys.stderr)
				if username == trnmt.match2.p1.username :
					trnmt.matchLoserBracket.p1 = trnmt.match2.p2
				else : 
					trnmt.matchLoserBracket.p1 = trnmt.match2.p1
			else :
				print(f"========================================================================> LOSER BRACEKT P2", file=sys.stderr)
				if username == trnmt.match2.p1.username :
					trnmt.matchLoserBracket.p2 = trnmt.match2.p2
				else : 
					trnmt.matchLoserBracket.p2 = trnmt.match2.p1
		
		if (trnmt.matchWinnerBracket.p1 and trnmt.matchWinnerBracket.p2) :
			print("-------------------------------------------------------------------------------------------------------------> Goes to finalMatches !", file=sys.stderr)
			trnmt.matchWinnerBracket.initValues()
			trnmt.matchLoserBracket.initValues(trnmt.matchWinnerBracket)
		
		return (mId, nextMatch)
	
	else :
		print("---------------------------------! Final match !---------------------------------")
		if trnmt.matchWinnerBracket.key == mKey :
			print("Soooo -> ", trnmt.matchLoserBracket.launchable, file=sys.stderr)
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
			print("Soooo -> ", trnmt.matchWinnerBracket.launchable, file=sys.stderr)
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
		print(f"self.room_group_name : {self.room_group_name}", file=sys.stderr)
		self.myJWT = params.get("jwt", [None])[0] #Encoded 
		self.name = params.get("name", [None])[0]
		self.guests = (params.get("guests", ["Nan"])[0]).split(',')
		print(f"self.name : {self.name}\nguests : {self.guests}", file=sys.stderr)


		if not self.room_group_name:
			await self.close()
			return
		
		await self.accept()

		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		print(f"ChanelLayer : {self.channel_layer}", file=sys.stderr)

		await self.send(text_data=json.dumps({
			't_state': "Succefully joined tournament"
		}))

		# user_ws_connections[self.myJWT] = self
	
	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)


	async def launchGame(self, match, roundM) :
		print(f"roundMatch lauchGame : {roundM}", file=sys.stderr)
		if match.gameMode == REMOTE :
			userLst = sorted([match.p1.username, match.p2.username])
			with open("response.txt", 'a+') as f :
				print(f"--=REMOTE=--\n\nself.name : {self.name} | self.guests : {self.guests}\nmatch.p1.username : {match.p1.username}\nmatch.p2.username : {match.p2.username}\n", file=f)

			if self.name == match.p1.username or match.p1.username in self.guests:
				user = match.p1.username
				playerId = 1
			else :
				user = match.p2.username
				playerId = 2
			if (self.name == match.p1.username or self.name == match.p2.username) :
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
			with open("response.txt", 'a+') as f :
				print(f"--=LOCAL=--\n\nmatch.p1.username : {match.p1.username}\nmatch.p2.username : {match.p2.username}\nmatch.key : {match.key}\n", file=f)
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
		print(f"data : {text_data}", file=sys.stderr)
		data = text_data # json.loads(text_data)
		action = data.get("action")
		print(f"ction : {action}", file=sys.stderr)
		if action == "create-bracket" :
			with open("response.txt", 'a+') as f:
				print(f"--=Create-Bracket=--\nself.myJWT : {self.myJWT}\ntrnmtDict[self.room_group_name].match1.p1.jwt : {trnmtDict[self.room_group_name].match1.p1.jwt}\ntrnmtDict[self.room_group_name].match1.p2.jwt : {trnmtDict[self.room_group_name].match1.p2.jwt}", file=f)
			if trnmtDict[self.room_group_name].match1.launchable and not trnmtDict[self.room_group_name].match1.played:
				await self.launchGame(trnmtDict[self.room_group_name].match1, 1)
			if trnmtDict[self.room_group_name].match2.launchable and not trnmtDict[self.room_group_name].match2.played:
				await self.launchGame(trnmtDict[self.room_group_name].match2, 1)
		
		elif action == "final-matches" :
			print(f"finals matches consumer |\n trnmtDict[self.room_group_name].matchLoserBracket.launchable : {trnmtDict[self.room_group_name].matchLoserBracket.launchable} ||\n trnmtDict[self.room_group_name].matchWinnerBracket.launchable {trnmtDict[self.room_group_name].matchWinnerBracket.launchable} ||\n trnmtDict[self.room_group_name].matchWinnerBracket.played : {trnmtDict[self.room_group_name].matchWinnerBracket.played} ||\n trnmtDict[self.room_group_name].matchLoserBracket.played {trnmtDict[self.room_group_name].matchLoserBracket.played} ", file=sys.stderr)
			if trnmtDict[self.room_group_name].matchWinnerBracket.launchable and not trnmtDict[self.room_group_name].matchWinnerBracket.played:
					await self.launchGame(trnmtDict[self.room_group_name].matchWinnerBracket, 2)
			if trnmtDict[self.room_group_name].matchLoserBracket.launchable and not trnmtDict[self.room_group_name].matchLoserBracket.played:
				await self.launchGame(trnmtDict[self.room_group_name].matchLoserBracket, 2)
	
		elif action == "update-guest": 
			jwt_l = data.get("jwt-list")
			with open("response.txt", 'a+') as f :
				print(f"--=Update guest=--\nguests : {jwt_l} , type : {type(jwt_l).__name__}\n\n", file=f)
			
			for elem in jwt_l :
				with open("response.txt", 'a+') as f :
					print(f'--=LOOP jwt_l=--\nself.name : {self.name}\nelem["username"] : {elem["username"]}\nelem["invites"] : {elem["invites"]}\n\nCondition : {self.name == elem["username"] or self.name in elem["invites"]}', file=f)
				if (self.name == elem["username"] or self.name in elem["invites"]) :
					self.guests == elem["invites"]
		elif action == "supervise" :
			print(f"A0 - {action}", file=sys.stderr)
			roundMatch = data.get("round", 1)
			print(f"A1 - {roundMatch}", file=sys.stderr)
			mKey = data.get("mKey", None)
			tkey = data.get("tkey", None)
			print(f"A2 - {mKey}", file=sys.stderr)
			if not mKey:
				print(f"A3 - END", file=sys.stderr)
				return 
			print(f"A4 - ", file=sys.stderr)

			trnmt = trnmtDict[tkey]
			print(f"A5 - {trnmt}", file=sys.stderr)
			task = asyncio.create_task(supervise_match(mKey))
			results = await task
			print(f"A6 - {results}", file=sys.stderr)
			if results["score1"] == 5 : ########################################################################################################################################################################################################################################################################################################################################################################
				print(f"A7 - res1 [{results} | {trnmt}]", file=sys.stderr)
				matchId, nextToLaunch = await setResults(trnmt, results["username1"], roundMatch, results['matchKey'])
			else :
				print(f"A8 - res2", file=sys.stderr)
				matchId, nextToLaunch = await setResults(trnmt, results["username2"], roundMatch, results['matchKey'])
			
			print("TOURNAMENT MATCH FINISHED !!!!!!!!!!!!!!!!!!!!!!!!!!!", file=sys.stderr)
			await self.send(text_data=json.dumps({
				"t_state" : "game-finished",
				"matchId" : matchId,
				"next" : nextToLaunch,
				"tkey" : self.room_group_name
			}))
		
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
		print(f"tempReceived : {event}", file=sys.stderr)
		await self.receive(event["text_data"])

	
	
