import sys
import json
import time
import redis
import random
import asyncio
import requests
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)

		# Extraire le paramètre 'room' de la chaîne de requête
		self.room_group_name = params.get('room', [None])[0]

		#print("room :", self.room_group_name, file=sys.stderr)
		#print("user ID : ", self.usrID, file=sys.stderr)

		if not self.room_group_name:
			await self.close()
			return

		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		await self.accept()

		game_stats = cache.get(f'simulation_state_{self.room_group_name}')

		await self.send(text_data=json.dumps({
			't_state': "Succefully joined tournament"
		}))
	
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

			# if vs1 :
				# JWT1 = Jwt tokens decoder  (with related account)
				# relatedUsers.append(JWT1["relatedPlayerId"])
				# JWT2 = Jwt tokens decoder  (with related account)
				if JWT2["relatedPlayerId"] in relatedUsers





	
