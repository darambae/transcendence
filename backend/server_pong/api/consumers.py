import sys
import json
import time
import redis
import random
import asyncio
import requests
from serverPong.Map import Map
from urllib.parse import parse_qs
from django.core.cache import cache
from serverPong.Racket import dictInfoRackets
from serverPong.utilsClasses import Point, Vector
from .tournamentChallenge import dictTournament, Tournament
from channels.generic.websocket import AsyncWebsocketConsumer
from serverPong.ball import Movement, BallData, calcIntersections

urlAI = "https://ai_pong:8020/"

def calcAllIntersections(walls, ptRacket1, ptRacket2) :
	for w in walls:
		if (calcIntersections(w[0], w[1], ptRacket1, ptRacket2) != (None, None)) :
			return True
	return False

async def launchAiGame(url) :
	asyncio.sleep(0.5)
	requests.get(url, verify=False, headers={'Host' : 'localhost'})

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)
		self.t2 = None

		# Extraire le paramètre 'room' de la chaîne de requête
		self.room_group_name = params.get('room', [None])[0]
		self.usrID = int(params.get('userid', [2])[0])

		self.AI = bool(int(params.get("AI", [False])[0]))

		self.map = Map() #None
		self.gameSimulation = Movement(BallData(), self.room_group_name, map=self.map, plnb=2, usrID=self.usrID)

		if not self.room_group_name:
			await self.close()
			return

		cache.set(f'simulation_state_{self.room_group_name}', {"State" : "Waiting for start"}, timeout=None)
		self.game_running = False
		self.task = None
		self.matchReplay = []
		if not self.room_group_name in dictInfoRackets :
			dictInfoRackets[self.room_group_name] = {"playersUsernames" : [None, None], "scoring" : False, "racket1" : [[5, 280], [5,395]], "racket2" : [[995, 280], [995, 395]]}
		
		if self.usrID == 0 :
			u1 = params.get("u1", "Guest")
			u2 = params.get("u2", "Guest")
			dictInfoRackets[self.room_group_name]["playersUsernames"][0] = u1
			dictInfoRackets[self.room_group_name]["playersUsernames"][1] = u2
		
		elif self.usrID == 1 :
			u = params.get("name", "Guest")
			dictInfoRackets[self.room_group_name]["playersUsernames"][0] = u
		else :
			u = params.get("name", "Guest")
			dictInfoRackets[self.room_group_name]["playersUsernames"][1] = u


		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		await self.accept()

		game_stats = cache.get(f'simulation_state_{self.room_group_name}')

		await self.send(text_data=json.dumps({
			'game_stats': game_stats
		}))

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)


	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data.get("action")

		if action == "disconnect":
			await self.disconnectUser(text_data)
		elif action == "forfait" :
			plId = data.get("player")
			stats = cache.get(f'simulation_state_{self.room_group_name}')
			stats[f"team{2 - (plId != 1)}Score"] = 5
			cache.set(f'simulation_state_{self.room_group_name}', stats, timeout=None)
		elif action == "start":
			mapString = data.get("map", "default.json")
			await self.send(text_data=json.dumps({
				"game_stats" : {"State" : "playersInfo",
				"p1" : dictInfoRackets[self.room_group_name]["playersUsernames"][0],
				"p2" : dictInfoRackets[self.room_group_name]["playersUsernames"][1] },
			}))
			if not self.game_running:
				self.game_running = True
				self.task = asyncio.create_task(self.send_game_updates())
		elif action == "stop":
			self.game_running = False
			if self.task:
				self.task.cancel()

	async def tempReceived(self, event) :
		await self.receive(event["text_data"])

	async def disconnectUser(self, event) :
		if (self.usrID <= 1) :
			await self.gameSimulation.stopSimulation()
		if self.t2 is not None :
			self.task.cancel()
			await self.task
			cache.delete(f"simulation_state_{self.room_group_name}")
			await self.close()

	async def game_update(self, event):
		game_stats = event.get('game_stats', {})

		await self.send(text_data=json.dumps({
			'game_stats': game_stats
		}))
	
	async def run_simulation(self):
		try:
			await self.gameSimulation.doSimulation()
		except Exception as e:
			print(f"Simulation crashed: {e}", file=sys.stderr)

	async def send_game_updates(self) -> None:
		try:
			if (self.usrID <= 1) :
				self.t2 = asyncio.create_task(self.run_simulation())

				while self.game_running:
					await asyncio.sleep(0.016)
					try:
						stats = cache.get(f"simulation_state_{self.room_group_name}")
						if self.AI :
							asyncio.create_task(launchAiGame(f"{urlAI}init-ai?apikey={self.room_group_name}"))
							self.AI = False
						if (stats.get("team1Score", 0) >= 5 or stats.get("team2Score", 0) >= 5) and self.usrID <= 1:
							await self.channel_layer.group_send(
								self.room_group_name,
								{
									"type" : "game_update",
									"game_stats" : stats
								}
							)
							if stats['team1Score'] == 5 :
								winnerTeam = 0
							else :
								winnerTeam = 1
							json_data = {
								"matchKey" : self.room_group_name,
								"username1" : dictInfoRackets[self.room_group_name]["playersUsernames"][0][0],
								"score1" : stats['team1Score'],
								"score2" : stats['team2Score'],
								"username2" : dictInfoRackets[self.room_group_name]["playersUsernames"][1][0],
								"winner" : dictInfoRackets[self.room_group_name]["playersUsernames"][winnerTeam][0],
							}
							requests.post("https://access_postgresql:4000/api/addResultGames/", verify=False, json=json_data, headers={'Host': 'localhost'})
							if self.t2 is not None :
								self.task.cancel()
								await self.task
							self.gameSimulation.stopSimulation()
						if self.usrID <= 1 :
							await self.gameSimulation.setRedisCache(self.room_group_name)
							stats = cache.get(f'simulation_state_{self.room_group_name}')
							await self.channel_layer.group_send(
								self.room_group_name,
								{
									"type": "game_update",
									"game_stats": stats,
								}
							)
					except Exception as e:
						pass
		except asyncio.CancelledError:
			self.t2.cancel()
			await self.t2

def checkCache() :
    r = redis.Redis(host='game_redis', port = 6379, db=0)
    cleRedis = r.keys('*')
