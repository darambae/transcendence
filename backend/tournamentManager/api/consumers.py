import sys
import json
import time
import redis
import random
import asyncio
import requests
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer

keygame = "https://server_pong:8030/"
class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.match1Winner = -1
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)

		# Extraire le paramètre 'room' de la chaîne de requête
		self.room_group_name = params.get('room', [None])[0]

		#print("room :", self.room_group_name, file=sys.stderr)
		#print("user ID : ", self.usrID, file=sys.stderr)

		self.task = None

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
	
	async def send_localGame(self) :
		res = requests.get(f"{keygame}server-pong/api-key")
		if res.status == 200 :
			key = (res.json())["api_key"]
			await self.send(text_data=json.dumps({
				't_state': "send_key",
				'key' : key
			}))
			return key
	
	async def match_sendkey(self, event) :
		message = event["message"]
		await self.send(text_data=json.dumps({
			't_state' : "send_key",
			"key" : message
		}))

	async def send_remoteGame(self, match) :
		res = request.get(f"{keygame}server-pong/api-key")
		if res.status == 200 :
			key = (res.json())["api_key"]
			await self.channel_layer.group_send(match, {
        		"type": "match.sendkey",
        		"message": key
		    })
			return key
		
		
	async def waitUntil1stMatchEnd(self, apiKey) :
		while True :
			res = requests.get(f"{urlRequests}server-pong/api/simulation?apikey={apiKey}")
			if res.status == 200 :
				body = res.json()
				if body["team1Score"] >= 5 :
					self.match1Winner = 1
				elif body["team2Score"] >= 5 :
					self.match1Winner = 2
			asyncio.sleep(1)



	async def disconnect(self, close_code):
		print(f"User disconnected", file=sys.stderr)
	
	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data.get("action")

		if action == "disconnect":
			await self.close()
		elif action == "StartTournament" :
			vs1 = data.get("vs1", None)
			vs2 = data.get("vs2", None)
			relatedUsers = []
			relatedUsers2= []

			# if vs1 :
				# JWT1 = Jwt tokens decoder  (with related account)
				# relatedUsers.append(JWT1["relatedPlayerId"])
				# await self.channel_layer.group_add(f"{self.room_group_name}_match1", self.channel_name)
				# JWT2 = Jwt tokens decoder  (with related account)
				# if JWT2["relatedPlayerId"] in relatedUsers :
					# tournamentKey = await self.send_localGame()
				# else :
				# 	relatedUsers.append(JWT2["relatedPlayerId"])
				# 	await self.channel_layer.group_add(f"{self.room_group_name}_match1", self.channel_name)
				# 	tournamentKey = await self.send_remoteGame()
				# self.task = asyncio.create_task(self.waitUntil1stMatchEnd(tournamentKey))
			if vs2 :
				JWT3 = Jwt tokens decoder (with related account)
				if JWT3["relatedPlayerId"]  in relatedUsers :
					while self.match1Winner < 0 :
						asyncio.sleep(1)
				relatedUsers.append(JWT1["relatedPlayerId"])
				# await self.channel_layer.group_add(f"{self.room_group_name}_match1", self.channel_name)
				# JWT2 = Jwt tokens decoder  (with related account)
				# if JWT2["relatedPlayerId"] in relatedUsers :
					# tournamentKey = await self.send_localGame()
				# else :
				# 	relatedUsers.append(JWT2["relatedPlayerId"])
				# 	await self.channel_layer.group_add(f"{self.room_group_name}_match1", self.channel_name)
				# 	tournamentKey = await self.send_remoteGame()
				
				





			
		

	
