import math
import os
from .utilsClasses import Vector, Point
import time
from .Map import Map
import sys
from .Racket import dictInfoRackets
import random
import asyncio
from django.core.cache import cache

def convertToJsonList(elem) :
	return [[elem[0].x, elem[0].y], [elem[1].x, elem[1].y]]

def determineRandomStart() :
	startingAngle = random.choice([-90, -60, -30, -10, 10, 30, 60, 90])
	angle = math.atan2(startingAngle, 90)

	magnitude = math.hypot(110, startingAngle)

	new_vx = magnitude * math.cos(angle)
	new_vy = magnitude * math.sin(angle)

	return Vector(new_vx, new_vy)

def calcIntersections(A1 : Point, A2 : Point, B1 : Point, B2 : Point):
	if type(A1).__name__ == "Point" :
		x1, y1 = A1.toTuple()
	else :
		x1, y1 = A1
	if type(A2).__name__ == "Point" :
		x2, y2 = A2.toTuple()
	else :
		x2,y2 = A2
	if type(B1).__name__ == "Point" :
		x3, y3 = B1.toTuple()
	else :
		x3,y3 = B1
	if type(B2).__name__ == "Point" :
		x4, y4 = B2.toTuple()
	else :
		x4,y4 = B2

	dXSpeed = x2 - x1
	dYSpeed = y2 - y1

	dXWall = x4 - x3
	dYWall = y4 - y3

	originDiffX = x3 - x1
	originDiffY = y3 - y1
	determinant = dXSpeed * dYWall - dYSpeed * dXWall


	if abs(determinant) < 1e-3 :
		return None, None
	
	timePercent = (originDiffX * dYWall - originDiffY * dXWall) / determinant
	wallPercent = (originDiffX * dYSpeed - originDiffY * dXSpeed) / determinant

	if ( 0 <= timePercent <= 1 and 0 <= wallPercent <= 1 ) :
		interX = x3 + wallPercent * (x4 - x3)
		interY = y3 + wallPercent * (y4 - y3)
		return (Point(interX, interY), timePercent)

	return (None, None)

def	normalizeNormalVector(vector:Vector) :
	norm = math.sqrt(vector.x**2 + vector.y**2)
	return Vector(-(round(vector.y / norm, 2)), round(vector.x / norm, 2))

def calcDotProduct(vec1:Vector, vec2:Vector) :
	return vec1.x * vec2.x + vec1.y * vec2.y

def add_random_angle(vx, vy, addedSpd):
	angle = math.atan2(vy, vx)

	magnitude = math.hypot(vx, vy)

	new_vx = magnitude * math.cos(angle)
	new_vy = magnitude * math.sin(angle)

	return Vector(new_vx, new_vy, spdMultiplier=addedSpd)

def addSpeed(ori : int, incidentVector : Vector) :
	if incidentVector.x < 0 :
		m = 1
	else :
		m = -1
	angle = math.atan2(90 * m, ori)
	magnitude = math.hypot(110 * m, ori) + 30 * incidentVector.addedSpeed
	return Vector(magnitude * math.sin(angle), magnitude * math.cos(angle), spdMultiplier=incidentVector.addedSpeed+1)



def calcBouncePlayer(wallHit, hitPoint : Point, vectorMovement : Vector) -> Vector :
	vecAB = Vector(wallHit[0], wallHit[1])
	vecAM = Vector(wallHit[0], hitPoint)

	ratio = vecAM.norm / vecAB.norm 
	if (ratio < 0.125) : 
		return addSpeed(-90 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.250) :
		return addSpeed(-60 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.375) :
		return addSpeed(-30 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.500) :
		return addSpeed(-10 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.625) :
		return addSpeed(10 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.750) :
		return addSpeed(30 + random.randint(-5, 5), vectorMovement)
	elif (ratio < 0.875) :
		return addSpeed(60 + random.randint(-5, 5), vectorMovement)
	else :
		return addSpeed(90 + random.randint(-5, 5), vectorMovement)


class	BallData() :
	def __init__(self, position:Point=Point(500, 425), speed:Vector=determineRandomStart()) :
		self.pos:Point = position
		self.spd:Vector = speed
	def __str__(self) -> str :

		return (f"Position of ball is : {self.position}\nMovement vector is {self.spd}")

	def getData(self) -> dict :
		return ({"position" : self.pos.toList(), "speed" : self.spd.toList()})
	def calculateReflexionVector(self, wallHit, racketList : list) -> Vector :
		wallHitVector = Vector(wallHit[0], wallHit[1])
		normalVector = normalizeNormalVector(wallHitVector)
		if (wallHit in racketList) :
			vReturn = calcBouncePlayer(wallHit, self.pos, self.spd)
		else :
			vReturn = add_random_angle(self.spd.x - 2 * calcDotProduct(self.spd, normalVector) * normalVector.x, self.spd.y - 2 * calcDotProduct(self.spd, normalVector) * normalVector.y, self.spd.addedSpeed)
		return vReturn
		

class	Movement() :
	def __init__(self, ballInfo: BallData, room:str, map: Map = Map(), timestamp: float = time.time(), plnb: int = 2, usrID=2):
		try:
			self.lastWallHit = None
			self.roomName:str = room
			self.runningGame: bool = True
			self.ball: BallData = ballInfo
			self.racketList: list | None = None
			self.nbPlayers = plnb
			self.ts: float = timestamp
			self.map: Map = map
			self.scorePlayer1 = 0
			self.scorePlayer2 = 0
			self.usrID = usrID
		except Exception as e:
			print(f"Error in __init__: {e}", file=sys.stderr)

	async def calculateLinearMovement(self, vectorMovement : Vector, time : float) -> Point :
		return (Point(self.ball.pos.x + vectorMovement.x * time, self.ball.pos.y + vectorMovement.y * time))

	async def setWinPlayer(self, team : int) -> None :
		if (team == 1) :
			self.scorePlayer1 += 1
		else :
			self.scorePlayer2 += 1
		self.ball.pos = self.map.center 
		dictInfoRackets[self.roomName]["racket1"] = [[5, 280], [5,395]]
		dictInfoRackets[self.roomName]["racket2"] = [[995, 280], [995, 395]]
		if (self.usrID <= 1) :
			self.ball.spd = determineRandomStart()

	async def isWallIntersection(self, pointTrajectory: Point, timeLeft : float) -> float:
		minTimeWallHit : float = 2.0
		intersectionPoint = Point(100000, 100000)
		allWalls = self.map.walls + self.racketList
		wallHit:list | None = None

		for wall in allWalls:
			valueIntersections = calcIntersections(wall[0], wall[1], self.ball.pos, pointTrajectory)
			if valueIntersections[1] != None and valueIntersections[1] < minTimeWallHit:
				minTimeWallHit = valueIntersections[1] * timeLeft
				intersectionPoint = valueIntersections[0]
				wallHit = wall
		
		if (minTimeWallHit != 2.0) :
			self.ball.pos = intersectionPoint
			self.ball.spd = self.ball.calculateReflexionVector(wallHit, self.racketList)
			self.ball.pos = await self.calculateLinearMovement(self.ball.spd, 0.001)
			return (0.0)
		else :
			valueIntersectionsWinning = calcIntersections(self.map.winningTeam1[0], self.map.winningTeam1[1], self.ball.pos, pointTrajectory)
			if valueIntersectionsWinning[1] != None :
				await self.setWinPlayer(2)
				dictInfoRackets[self.roomName]["scoring"] = True
				dictInfoRackets[self.roomName]["scoring"] = False
			else :
				valueIntersectionsWinning = calcIntersections(self.map.winningTeam2[0], self.map.winningTeam2[1], self.ball.pos, pointTrajectory)
				if valueIntersectionsWinning[1] != None :
					await self.setWinPlayer(1)
					dictInfoRackets[self.roomName]["scoring"] = True
					dictInfoRackets[self.roomName]["scoring"] = False
				else :
					self.ball.pos = pointTrajectory
			return (0.0)

	async def getWallsHit(self) -> None :
		timeLeft : float = 0.02

		while timeLeft > 0.0:
			linearMovementPoint:Point = await self.calculateLinearMovement(self.ball.spd, timeLeft)
			timeLeft = await self.isWallIntersection(linearMovementPoint, timeLeft)

	async def toDictionnary(self) -> dict :
		ditctionnaryPlayers = dict((f'player{i + 1}', convertToJsonList(self.racketList[i])) for i in range(len(self.racketList)))
		ditctionnaryPlayers["ball"] = self.ball.getData()
		ditctionnaryPlayers["team1Score"] = self.scorePlayer1
		ditctionnaryPlayers["team2Score"] = self.scorePlayer2
		return (ditctionnaryPlayers)

	async def setRedisCache(self, roomName) :
		stats = await self.toDictionnary()
		cache.set(f'simulation_state_{roomName}', stats, timeout=None)


	async def doSimulation(self) :
		while self.runningGame:
			self.racketList = []
			myDict = dictInfoRackets[self.roomName]
			for i in range(1, self.nbPlayers + 1):
				try :
					self.racketList.append([Point(myDict[f"racket{i}"][0][0], myDict[f"racket{i}"][0][1]), Point(myDict[f"racket{i}"][1][0], myDict[f"racket{i}"][1][1])])
				except Exception as e:
					print(f"!!! Error building racketList: {e}", file=sys.stderr)
			await self.getWallsHit()
			await asyncio.sleep(0.01)

	async def stopSimulation(self) :
		self.runningGame = False

	



		
