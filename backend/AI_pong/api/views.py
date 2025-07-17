from django.shortcuts import render
import requests
from django.http import HttpResponse
import math
import asyncio
import time
import json
import sys
import threading
from http import HTTPStatus

urlRequests = "https://server_pong:8030/"

class HttpResponseNoContent(HttpResponse):
	status_code = HTTPStatus.NO_CONTENT

def calcIntersections(A1 , A2 , B1 , B2 ):
	"""
	Check Intersection beetween [A1 , A2] and [B1 , B2]

		if (ret1, ret2) == (None, None) -> No intersections
		else -> ret1 = Intersections point | ret2 = fraction of 1 sec (deadtime)
	"""

	if type(A1).__name__ == "Point" :
		x1, y1 = A1.toTuple()																																					# Get positions
	else :
		x1, y1 = A1
	if type(A2).__name__ == "Point" :
		x2, y2 = A2.toTuple()																																					# Get positions
	else :
		x2,y2 = A2
	if type(B1).__name__ == "Point" :
		x3, y3 = B1.toTuple()																																					# Get positions
	else :
		x3,y3 = B1
	if type(B2).__name__ == "Point" :
		x4, y4 = B2.toTuple()																																					# Get positions
	else :
		x4,y4 = B2

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
		return ([interX, interY], timePercent)

	return (None, None)

async def calculateLinearMovement(pos, vectorMovement, time : float) :
	return ([pos[0] + vectorMovement[0] * time, pos[1] + vectorMovement[1] * time])

async def isWallIntersection(pos, spd, pointTrajectory, timeLeft : float) -> float:
	### Setting default values to init detectors ###
	minTimeWallHit : float = 2.0
	intersectionPoint = [100000, 100000]
	allWalls = [[[-5, 0], [1005, 0]], [[-5, 600], [1005, 600]]]
	wallHit:list | None = None

	### Loop detecting collision ###
	for wall in allWalls:
		valueIntersections = calcIntersections(wall[0], wall[1], pos, pointTrajectory)																		# Determine if there is a wall on ball's trajecttory (bounce)
		if valueIntersections[1] != None and valueIntersections[1] < minTimeWallHit:																					# Determine if this colision will be the first to occur
			minTimeWallHit = valueIntersections[1] * timeLeft																											# Set the time after wall collision
			intersectionPoint = valueIntersections[0]																													# Set the intersection point
			wallHit = wall																																				# Set the wall which has been hit
		
	### What about a collision occur ? ###
	if (minTimeWallHit != 2.0) :																																		# 0 <= minTimeWallHit <= 1 if a collision has occured
		pos = intersectionPoint																																# Set the new ballPosition to the intersection with the wall
		spd[1] = -spd[1]
		pos = await calculateLinearMovement(pos, spd, 2)
		return (0.0, pos)																																					# Return the time to calculate after the reflexion
	else :
		pos = pointTrajectory				
		return (0.0, pos)					

async def getWallsHit(toReturn) -> None :
	### Determine all movement ###
	timeLeft : float = 1.0																																			# Set default time to 5 milliseconds	
	while timeLeft > 0.0:																																				# While there is time to calculate movement
		linearMovementPoint = await calculateLinearMovement(toReturn["ball"]["position"], toReturn["ball"]["speed"], timeLeft)																			# Calculate linear movement (No collision)
		timeLeft, position = await isWallIntersection(toReturn["ball"]["position"], toReturn["ball"]["speed"], linearMovementPoint, timeLeft)		
	return position

def start_loop(loop):
	asyncio.set_event_loop(loop)
	loop.run_forever()

try :
	loopAi = asyncio.new_event_loop()
	threading.Thread(target=start_loop, args=(loopAi,), daemon=True).start()
	# print("Loop goes well !", file=sys.stderr)
except Exception as e:
	print(f"Errrror : {e}", file=sys.stderr)

async def getActualPosition(apiKey) :
	try :
		res = requests.get(f"{urlRequests}server-pong/api/simulation?apikey={apiKey}", verify=False, headers={'Host' : 'localhost'})
		if res.status_code != 200 :
			return
		else :
			toReturn = res.json()
			toReturn["ball"]["position"] = await getWallsHit(toReturn) #timeLeft = await self.isWallIntersection(linearMovementPoint, timeLeft)
			return toReturn

	except Exception as e :
		print(f"error getActualPos : {e}", file=sys.stderr)

async def sendInfo(apiKey) :
	try :
		position = await getActualPosition(apiKey)
		actualTime = time.time()
		while position["team1Score"] < 5 and position["team2Score"] < 5 :
			racketY = position["player2"]
			for j in range(40) :
				posYAi = (racketY[1][1] + racketY[0][1]) / 2
				resultStats = posYAi - position["ball"]["position"][1]
				if resultStats < -15 :
					requests.post(f"{urlRequests}/server-pong/send-message", verify=False, json={"apiKey": apiKey, "message": '{"action": "move", "player2": "down"}'}, headers={'Host' : 'localhost'})
					racketY[0][1] += 15
					racketY[1][1] += 15
				elif resultStats > 15 :
					requests.post(f"{urlRequests}/server-pong/send-message", verify=False, json={"apiKey": apiKey, "message": '{"action": "move", "player2": "up"}'}, headers={'Host' : 'localhost'})
					racketY[0][1] -= 15
					racketY[1][1] -= 15
				await asyncio.sleep(0.025)
			position = await getActualPosition(apiKey)
			# print(f"time Before last view : {time.time() - actualTime}", file=sys.stderr)
			actualTime = time.time()
	except Exception as e:
		print(f"error : {e}", file=sys.stderr)
		pass

def initAI(request) :
	try :
		apikey = request.GET.get('apikey', "None")
		asyncio.run_coroutine_threadsafe(sendInfo(apikey), loopAi)
		return HttpResponseNoContent()
	except Exception as e:
		print(f"Error : {e}", file=sys.stderr)