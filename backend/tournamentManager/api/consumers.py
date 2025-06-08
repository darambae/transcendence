import sys
import json
import time
import redis
import random
import asyncio
import requests
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from .tournamentStatic import Tournament, Player, trnmtDict, getApiKeyTrnmt, LOCAL, REMOTE


class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)

		self.room_group_name = params.get('tkey', [None])[0]
		self.myJWT = params.get("jwt", [None])[0]

		self.task = None
		self.task2 = None

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
	
	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)


	async def launchGame(self, match) :
		if match.gameMode == REMOTE :
			await self.send(text_data=json.dumps({
				"t_state" : "game-start",
				"mode" : "remote", 
				"key" : match.match1.key
			}))
		else :
			if match.mainAccount == self.myJWT :
				await self.send(text_data=json.dumps({
					"t_state" : "game-start",
					"mode" : "local",
					"key" : match.match1.key
				}))
							
	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data.get("action")
		if action == "create-bracket" :
			if self.myJWT == trnmtDict[self.room_group_name].tournamentPl[0][0].jwt or self.myJWT == trnmtDict[self.room_group_name].tournamentPl[0][1].jwt :
				if trnmtDict[self.room_group_name].match1.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match1)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match1)
				pass # Set for match 1 ........ Need to check if local / online + if launchable
			elif self.myJWT in trnmtDict[self.room_group_name].tournamentPl[1] : 
				if trnmtDict[self.room_group_name].match1.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match2)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match2)
		
		if action == "final-matches" :
			if self.myJWT == trnmtDict[self.room_group_name].final[0][0].jwt or self.myJWT == trnmtDict[self.room_group_name].final[0][1].jwt :
				if trnmtDict[self.room_group_name].match1.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match1)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match1)
				pass # Set for match 1 ........ Need to check if local / online + if launchable
			elif self.myJWT in trnmtDict[self.room_group_name].tournamentPl[1] : 
				if trnmtDict[self.room_group_name].match1.lauchable :
					await self.launchGame(trnmtDict[self.room_group_name].match2)
				else :
					while trnmtDict[self.room_group_name].final == [] :
						asyncio.sleep(1)
					await self.launchGame(trnmtDict[self.room_group_name].match2)
			




	
	