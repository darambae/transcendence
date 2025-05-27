import math
import os
from .utilsClasses import Vector, Point
import time
import numpy as np
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

	magnitude = math.hypot(90, startingAngle)

	new_vx = magnitude * math.cos(angle)
	new_vy = magnitude * math.sin(angle)
	# #print("=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=> AddedSpd: ", addedSpd, file=sys.stderr)

	return Vector(new_vx, new_vy)

def calcIntersections(A1 : Point, A2 : Point, B1 : Point, B2 : Point):
	"""
	Check Intersection beetween [A1 , A2] and [B1 , B2]

		if (ret1, ret2) == (None, None) -> No intersections
		else -> ret1 = Intersections point | ret2 = fraction of 1 sec (deadtime)
	"""

	x1, y1 = A1.toTuple()																																					# Get positions
	x2, y2 = A2.toTuple()																																					# Get positions
	x3, y3 = B1.toTuple()																																					# Get positions
	x4, y4 = B2.toTuple()																																					# Get positions

	dXSpeed = x2 - x1																																						# Calc ball trajectory vector
	dYSpeed = y2 - y1																																						# Calc ball trajectory vector

	dXWall = x4 - x3																																						# Calc wall vector
	dYWall = y4 - y3																																						# Calc wall vector

	originDiffX = x3 - x1																																					# Calc Difference beetween both starts
	originDiffY = y3 - y1																																					# Calc Difference beetween both starts
	determinant = dXSpeed * dYWall - dYSpeed * dXWall																														# Determine if there is a collision beetween vectors


	if abs(determinant) < 1e-3 :																																			# Accept an computer float representation error
		return None, None
	
	timePercent = (originDiffX * dYWall - originDiffY * dXWall) / determinant																								# Calculate when collision occur
	wallPercent = (originDiffX * dYSpeed - originDiffY * dXSpeed) / determinant																								# Calculate where collision occur

	if ( 0 <= timePercent <= 1 and 0 <= wallPercent <= 1 ) :																												# Check if the collision is beetween segments
		interX = x3 + wallPercent * (x4 - x3)																																# Calculate the intersection point
		interY = y3 + wallPercent * (y4 - y3)																																# Calculate the intersection point
		return (Point(interX, interY), timePercent)

	return (None, None)

def	normalizeNormalVector(vector:Vector) :
	norm = math.sqrt(vector.x**2 + vector.y**2)
	if(norm == 0) :
		print("vec : ", vector, file=sys.stderr)
	return Vector(-(round(vector.y / norm, 2)), round(vector.x / norm, 2))

def calcDotProduct(vec1:Vector, vec2:Vector) :
	return vec1.x * vec2.x + vec1.y * vec2.y

def add_random_angle(vx, vy, addedSpd):
	angle = math.atan2(vy, vx)

	magnitude = math.hypot(vx, vy)

	new_vx = magnitude * math.cos(angle)
	new_vy = magnitude * math.sin(angle)
	# #print("=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=> AddedSpd: ", addedSpd, file=sys.stderr)

	return Vector(new_vx, new_vy, spdMultiplier=addedSpd)

def addSpeed(ori : int, incidentVector : Vector) :
	if incidentVector.x < 0 :
		m = 1
	else :
		m = -1
	angle = math.atan2(90 * m, ori)
	magnitude = math.hypot(90 * m, ori) + 30 * incidentVector.addedSpeed
	# #print("------------------------------->>> magnitude :", magnitude, file=sys.stderr)
	return Vector(magnitude * math.sin(angle), magnitude * math.cos(angle), spdMultiplier=incidentVector.addedSpeed+1)



def calcBouncePlayer(wallHit, hitPoint : Point, vectorMovement : Vector) -> Vector :
	# #print(f"position : {hitPoint}\nwallHit: {wallHit}", file=sys.stderr)
	vecAB = Vector(wallHit[0], wallHit[1])
	vecAM = Vector(wallHit[0], hitPoint)
	# #print("=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=>=> AddedSpd: ", vectorMovement.addedSpeed, file=sys.stderr)

	ratio = vecAM.norm / vecAB.norm 
	# #print(f"ratio : {ratio}", file=sys.stderr)
	if (ratio < 0.125) : 
		return addSpeed(-90, vectorMovement)
	elif (ratio < 0.250) :
		return addSpeed(-60, vectorMovement)
	elif (ratio < 0.375) :
		return addSpeed(-30, vectorMovement)
	elif (ratio < 0.500) :
		return addSpeed(-10, vectorMovement)
	elif (ratio < 0.625) :
		return addSpeed(10, vectorMovement)
	elif (ratio < 0.750) :
		return addSpeed(30, vectorMovement)
	elif (ratio < 0.875) :
		return addSpeed(60, vectorMovement)
	else :
		return addSpeed(90, vectorMovement)


class	BallData() :
	def __init__(self, position:Point=Point(500, 425), speed:Vector=determineRandomStart()) : # Are 500,300 the center of the game ? 
		self.pos:Point = position
		self.spd:Vector = speed
	def __str__(self) -> str :

		return (f"Position of ball is : {self.position}\nMovement vector is {self.spd}")

	def getData(self) -> dict :
		return ({"position" : self.pos.toList(), "speed" : self.spd.toList()})
	def calculateReflexionVector(self, wallHit, racketList : list) -> Vector :
		wallHitVector = Vector(wallHit[0], wallHit[1])
		normalVector = normalizeNormalVector(wallHitVector)
		# #print("Wall Hit : ", wallHitVector, file=sys.stderr)
		# #print(f"racketList : {racketList}", file=sys.stderr)
		# #print(" Normal Vector : ", normalVector, file=sys.stderr)
		if (wallHit in racketList) :
			vReturn = calcBouncePlayer(wallHit, self.pos, self.spd)
		else :
			vReturn = add_random_angle(self.spd.x - 2 * calcDotProduct(self.spd, normalVector) * normalVector.x, self.spd.y - 2 * calcDotProduct(self.spd, normalVector) * normalVector.y, self.spd.addedSpeed)
		# #print("Vector to return -->> : ", vReturn, file=sys.stderr)
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
		self.ball.pos = self.map.center 																																	# Place it on center
		if (self.usrID == 1) :
			self.ball.spd = determineRandomStart()

	async def isWallIntersection(self, pointTrajectory: Point, timeLeft : float) -> float:
		### Setting default values to init detectors ###
		minTimeWallHit : float = 2.0
		intersectionPoint = Point(100000, 100000)
		allWalls = self.map.walls + self.racketList
		wallHit:list | None = None

		### Loop detecting collision ###
		for wall in allWalls:
			valueIntersections = calcIntersections(wall[0], wall[1], self.ball.pos, pointTrajectory)																		# Determine if there is a wall on ball's trajecttory (bounce)
			if valueIntersections[1] != None and valueIntersections[1] < minTimeWallHit:																					# Determine if this colision will be the first to occur
				minTimeWallHit = valueIntersections[1] * timeLeft																											# Set the time after wall collision
				intersectionPoint = valueIntersections[0]																													# Set the intersection point
				wallHit = wall																																				# Set the wall which has been hit
		
		### What about a collision occur ? ###
		if (minTimeWallHit != 2.0) :																																		# 0 <= minTimeWallHit <= 1 if a collision has occured
			self.ball.pos = intersectionPoint																																# Set the new ballPosition to the intersection with the wall
			self.ball.spd = self.ball.calculateReflexionVector(wallHit, self.racketList)																					# Set the new ball movement vector to the reflection (/!\ /!\ NEED TO ADJUST CALCULS IF WALL IS A PLAYER /!\ /!\)
			self.ball.pos = await self.calculateLinearMovement(self.ball.spd, 0.001)
			return (0.0)																																					# Return the time to calculate after the reflexion
		else :
			valueIntersectionsWinning = calcIntersections(self.map.winningTeam1[0], self.map.winningTeam1[1], self.ball.pos, pointTrajectory)								# Determine if 1st player won a round   
			if valueIntersectionsWinning[1] != None :																														# If ball trajectory go through winning zone 
				await self.setWinPlayer(1)																																	# Make 1st player win a point
				dictInfoRackets[self.roomName]["scoring"] = True
				await asyncio.sleep(3)																																		# Sleeping to let players react
				dictInfoRackets[self.roomName]["scoring"] = False
			else :
				valueIntersectionsWinning = calcIntersections(self.map.winningTeam2[0], self.map.winningTeam2[1], self.ball.pos, pointTrajectory)							# Determine if 2nd player won a round
				if valueIntersectionsWinning[1] != None :																													# If ball trajectory go through winning zone
					await self.setWinPlayer(2)																																# Make 2nd player win a point
					dictInfoRackets[self.roomName]["scoring"] = True
					await asyncio.sleep(3)																																	# Sleeping to let players react
					dictInfoRackets[self.roomName]["scoring"] = False
				else :
					self.ball.pos = pointTrajectory																															# No collision + No winning round --> Keep same vector and update value
			return (0.0)																																					# No more time to calc on this iteration

	async def getWallsHit(self) -> None :
		### Determine all movement ###
		timeLeft : float = 0.005																																			# Set default time to 5 milliseconds	

		while timeLeft > 0.0:																																				# While there is time to calculate movement
			linearMovementPoint:Point = await self.calculateLinearMovement(self.ball.spd, timeLeft)																			# Calculate linear movement (No collision)
			timeLeft = await self.isWallIntersection(linearMovementPoint, timeLeft)																							# Determine if a collision occur during trajectory

	async def toDictionnary(self) -> dict :
		### Return a dictionnary convertible as json, to send data ###
		ditctionnaryPlayers = dict((f'player{i + 1}', convertToJsonList(self.racketList[i])) for i in range(len(self.racketList)))											# All players position
		ditctionnaryPlayers["ball"] = self.ball.getData()																													# Add ball informations (Position / Movement vector)
		ditctionnaryPlayers["team1Score"] = self.scorePlayer1																												# Add Players score
		ditctionnaryPlayers["team2Score"] = self.scorePlayer2																												# Add Players score
		return (ditctionnaryPlayers)

	async def setRedisCache(self, roomName) :
		stats = await self.toDictionnary()
		# #print(f"Stats redisCache : {stats}",  file=sys.stderr)
		cache.set(f'simulation_state_{roomName}', stats, timeout=None)


	async def doSimulation(self) :
		### Main loop of simulation ###
		while self.runningGame:																																				# While the game didnt stop 
			# #print(f"running do : {self.runningGame}", file=sys.stderr)
			self.racketList = []																																			# Empty the racket list
			myDict = dictInfoRackets[self.roomName]																															# Get the game informations
			for i in range(1, self.nbPlayers + 1):																															# For each player of the game
				try :
					self.racketList.append([Point(myDict[f"racket{i}"][0][0], myDict[f"racket{i}"][0][1]), Point(myDict[f"racket{i}"][1][0], myDict[f"racket{i}"][1][1])])	# Append the positions of player to the racketList
				except Exception as e:
					print(f"!!! Error building racketList: {e}", file=sys.stderr)
			await self.getWallsHit()																																		# Determine all movement
			await asyncio.sleep(0.01)																																		# Sleep until next frame

	async def stopSimulation(self) :
		### Stop simulation ###
		self.runningGame = False
		# #print(f"running stop : {self.runningGame} <<--------- ", file=sys.stderr)

	


# Formula linear movement : 
# 	xNew = xOld + vectorX * deltaT
# 	yNew = yOld + vectorY * deltaT

# Formula Reflection :
# 	normalizedNormalVector = normalVector / norm
# 	newVec = oldVec - 2 * (oldVec . normalizedNormalVector) * normalizedNormalVector


		
