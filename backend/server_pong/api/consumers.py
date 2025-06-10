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
	#print("ai game", file=sys.stderr)
	requests.get(url)
	#print("ai game2", file=sys.stderr)

class GameConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		query_string = self.scope['query_string'].decode('utf-8')
		params = parse_qs(query_string)
		self.t2 = None

		# Extraire le paramètre 'room' de la chaîne de requête
		self.room_group_name = params.get('room', [None])[0]
		self.usrID = int(params.get('userid', [2])[0])
		self.usernames = json.loads(params.get("name", "{}"))

		self.AI = bool(int(params.get("AI", [False])[0]))
		print(self.AI, file=sys.stderr)
		print("AI sys.stderr connect", file=sys.stderr)

		#print("room :", self.room_group_name, file=sys.stderr)
		#print("user ID : ", self.usrID, file=sys.stderr)

		if not self.room_group_name:
			await self.close()
			return

		cache.set(f'simulation_state_{self.room_group_name}', {"State" : "Waiting for start"}, timeout=None)
		#print("6", file=sys.stderr)
		self.game_running = False
		self.task = None
		# self.scoring = False
		self.map = Map() #None
		self.matchReplay = []
		if not self.room_group_name in dictInfoRackets :
			dictInfoRackets[self.room_group_name] = {"playersUsernames" : [None, None], "scoring" : False, "racket1" : [[5, 300], [5,395]], "racket2" : [[995, 300], [995, 395]]}
		
		if self.usrID == 0 :
			dictInfoRackets[self.room_group_name]["playersUsernames"][0] = self.usernames["p1"]
			dictInfoRackets[self.room_group_name]["playersUsernames"][1] = self.usernames["p2"]
		
		elif self.usrID == 1 :
			dictInfoRackets[self.room_group_name]["playersUsernames"][0] = self.usernames["p1"]
		else :
			dictInfoRackets[self.room_group_name]["playersUsernames"][1] = self.usernames["p2"]

		# #print(dictInfoRackets, file=sys.stderr)

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
			print(f"cache : {cache.get(f'simulation_state_{self.room_group_name}')}", file=sys.stderr)
		elif action == "start":
			mapString = data.get("map", "default.json")
			await self.send(text_data=json.dumps({
				"game_stats" : "playersInfo",
				"p1" : dictInfoRackets[self.room_group_name]["playersUsernames"][0],
				"p2" : dictInfoRackets[self.room_group_name]["playersUsernames"][1]
			}))
			if not self.game_running:
				self.game_running = True
				self.task = asyncio.create_task(self.send_game_updates())
		elif action == "stop":
			self.game_running = False
			if self.task:
				self.task.cancel()
		elif action == "move" and not dictInfoRackets[self.room_group_name]["scoring"]:
			try :
				player1Move:str = data.get("player1", "None")
				player2Move:str = data.get("player2", "None")
				if (player1Move == "down") :
					if (calcAllIntersections(self.map.walls, Point(dictInfoRackets[self.room_group_name]["racket1"][0][0], dictInfoRackets[self.room_group_name]["racket1"][0][1] + 5), Point(dictInfoRackets[self.room_group_name]["racket1"][1][0], dictInfoRackets[self.room_group_name]["racket1"][1][1] + 5)) == False) : # Need to check if it hits a wall
						dictInfoRackets[self.room_group_name]["racket1"][0][1] += 5
						dictInfoRackets[self.room_group_name]["racket1"][1][1] += 5
				elif (player1Move == "up") :
					if (calcAllIntersections(self.map.walls, Point(dictInfoRackets[self.room_group_name]["racket1"][0][0], dictInfoRackets[self.room_group_name]["racket1"][0][1] - 5), Point(dictInfoRackets[self.room_group_name]["racket1"][1][0], dictInfoRackets[self.room_group_name]["racket1"][1][1] - 5)) == False) : # Need to check if it hits a wall
						dictInfoRackets[self.room_group_name]["racket1"][0][1] -= 5
						dictInfoRackets[self.room_group_name]["racket1"][1][1] -= 5
				if (player2Move == "down") :
					if (calcAllIntersections(self.map.walls, Point(dictInfoRackets[self.room_group_name]["racket2"][0][0], dictInfoRackets[self.room_group_name]["racket2"][0][1] + 5), Point(dictInfoRackets[self.room_group_name]["racket2"][1][0], dictInfoRackets[self.room_group_name]["racket2"][1][1] + 5)) == False) : # Need to check if it hits a wall
						dictInfoRackets[self.room_group_name]["racket2"][0][1] += 5
						dictInfoRackets[self.room_group_name]["racket2"][1][1] += 5
				elif (player2Move == "up") :
					if (calcAllIntersections(self.map.walls, Point(dictInfoRackets[self.room_group_name]["racket2"][0][0], dictInfoRackets[self.room_group_name]["racket2"][0][1] - 5), Point(dictInfoRackets[self.room_group_name]["racket2"][1][0], dictInfoRackets[self.room_group_name]["racket2"][1][1] - 5)) == False) : # Need to check if it hits a wall
						dictInfoRackets[self.room_group_name]["racket2"][0][1] -= 5
						dictInfoRackets[self.room_group_name]["racket2"][1][1] -= 5
			except Exception as e :
				print(f"ERROR : {e}")

	async def tempReceived(self, event) :
		await self.receive(event["text_data"])

	async def disconnectUser(self, event) :
		if (self.usrID <= 1) :
			#print("yikes", file=sys.stderr)
			await self.gameSimulation.stopSimulation()
		#print("Disconnecteed from game !",file=sys.stderr)
		if self.t2 is not None :
			self.task.cancel()
			#print("Yes t2 cancel", file=sys.stderr)
			await self.task
			cache.delete(f"simulation_state_{self.room_group_name}")
			await self.close()

	async def game_update(self, event):
		game_stats = event.get('game_stats', {})
		# print("game_stats type: ", type(game_stats).__name__, file=sys.stderr)
		self.matchReplay.append(game_stats)

		await self.send(text_data=json.dumps({
			'game_stats': game_stats
		}))
	
	async def run_simulation(self):
		try:
			# #print("==> Inside run_simulation()", file=sys.stderr)
			await self.gameSimulation.doSimulation()
		except Exception as e:
			print(f"Simulation crashed: {e}", file=sys.stderr)

	async def send_game_updates(self) -> None:
		try:
			#print("usrID send_game_update :", type(self.usrID).__name__, file=sys.stderr)
			if (self.usrID <= 1) :
				#print("Yes !!!", file=sys.stderr)
				self.gameSimulation = Movement(BallData(), self.room_group_name, map=self.map, plnb=2, usrID=self.usrID) # Change informations if game module
				self.t2 = asyncio.create_task(self.run_simulation())

				while self.game_running:
					await asyncio.sleep(0.2)
					try:
						stats = cache.get(f"simulation_state_{self.room_group_name}")
						print(f"self.ai : {self.AI}", file=sys.stderr)
						if self.AI :
							print("Create ai ;", file=sys.stderr)
							asyncio.create_task(launchAiGame(f"{urlAI}init-ai?apikey={self.room_group_name}"))
							print("Task created, setting AI to false", file=sys.stderr)
							self.AI = False
							print("Self.ai put to false", file=sys.stderr)
						# #print(f"statissssss : {stats}", file=sys.stderr)
						if (stats.get("team1Score", 0) >= 5 or stats.get("team2Score", 0) >= 5) and self.usrID <= 1:
							#print("Yaaaaay stoping game", file=sys.stderr)
							await self.channel_layer.group_send(
								self.room_group_name,
								{
									"type" : "game_update",
									"game_stats" : stats
								}
							)
######################################### Writing into a file, waiting for Db #########################################
							# outfile = open(f"replay_{self.room_group_name}.json", 'w')
							# json.dump(self.matchReplay, outfile)
							# outfile.close()
######################################### Writing into a file, waiting for Db #########################################
							if self.t2 is not None :
								self.task.cancel()
								await self.task
							self.gameSimulation.stopSimulation()
						if self.usrID <= 1 :
							await self.gameSimulation.setRedisCache(self.room_group_name)
						r = redis.Redis(host='game_redis', port=6379, db=0)
						cles_redis = r.keys('*')
						# #print([clé.decode('utf-8') for clé in cles_redis], file=sys.stderr)
						stats = cache.get(f'simulation_state_{self.room_group_name}')
						# #print(f"caches: {str(cache)}", file=sys.stderr)
						# #print(f"usrID : {self.usrID}\nstats: {stats}", file=sys.stderr)
						await self.channel_layer.group_send(
							self.room_group_name,
							{
								"type": "game_update",
								"game_stats": stats,
							}
                        )
					except Exception as e:
						print(f"!!! Failed to send update: {e}", file=sys.stderr)
		except asyncio.CancelledError:
			# #print("Task send_game_update Cancelled", file=sys.stderr)
			self.t2.cancel()
			await self.t2

def checkCache() :
    r = redis.Redis(host='game_redis', port = 6379, db=0)
    cleRedis = r.keys('*')
    #print([c.decode('utf-8') for c in cleRedis], file=sys.stderr)
