import math
import os
from .utilsClasses import Vector, Point
import time
import numpy as np
import json

class Map() :
	''' Permit to create customs map, if we want to do the game customizaion option'''
	def __init__(self, filePath : str|None = None) :
		'''If no argument given or if the custom map has an error, it will generate default map'''
		self.center = Point(500, 300)
		if (filePath == None):
			self.walls : list[list[Point]] = [[Point(-5, 0), Point(1005, 0)], [Point(-5, 600), Point(1005, 600)]]
			self.winningTeam1 = [Point(-5, -50), Point(-5, 650)]
			self.winningTeam2 = [Point(1005, -50), Point(1005, 650)]
		else :
			with open(filePath) as jsonMap :
				dictParsingMap = json.load(jsonMap)
			listWalls = dictParsingMap["Walls"]
			tmpListWalls : list[list[Point]] = []
			isFine : bool = True
			for wall in listWalls :
				if len(wall) != 2 or len(wall[0]) != 2 or len(wall[1]) != 2:
					self.walls : list[list[Point]] = [[Point(-5, 0), Point(1005, 0)], [Point(-5, 600), Point(1005, 600)]]
					isFine = False
					break
				else :
					tmpListWalls.append([Point(wall[0][0], wall[0][1]), Point(wall[1][0], wall[1][1])])
			winningT1 = dictParsingMap.get("WinningTeam1", [])
			winningT2 = dictParsingMap.get("WinningTeam2", [])
			if (isFine) :
				self.walls = tmpListWalls
			else : 
				self.walls = [[Point(0, 0), Point(1000, 0)], [Point(0, 600), Point(1000, 600)]]
			if (winningT1 != []) :
				self.winningTeam1 = [Point(winningT1[0][0], winningT1[0][1]), Point(winningT1[1][0], winningT1[1][1])]
			else :
				self.winningTeam1 = [Point(-5, 0), Point(-5, 600)]
			if (winningT2 != []) :
				self.winningTeam2 = [Point(winningT2[0][0], winningT2[0][1]), Point(winningT2[1][0], winningT2[1][1])]
			else :
				self.winningTeam2 = [Point(1005, 0), Point(1005, 600)]
			
	def borderX(self) :
		minX = 99999999
		maxX = -99999999
		for elements in self.walls :
			if (elements[0].x < minX) :
				minX = elements[0].x
			if (elements[0].x > maxX) :
				maxX = elements[0].x
			if (elements[1].x < minX) :
				minX = elements[1].x
			if (elements[1].x > maxX) :
				maxX = elements[1].x
		return (minX, maxX)

	def borderY(self) :
		minY = 99999999
		maxY = -99999999
		for elements in self.walls :
			if (elements[0].y < minY) :
				minY = elements[0].y
			if (elements[0].y > maxY) :
				maxY = elements[0].y
			if (elements[1].y < minY) :
				minY = elements[1].y
			if (elements[1].y > maxY) :
				maxY = elements[1].y
		return (minY, maxY)
