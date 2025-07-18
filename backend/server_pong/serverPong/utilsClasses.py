import math


class Vector() :
	def __init__(self, xVector, yVector, norm : float = -1.0, spdMultiplier: int = 0) :

		if((isinstance(xVector, float) and isinstance(yVector, float)) or isinstance(xVector, int) and isinstance(yVector, int)) :
			self.x: float = xVector
			self.y: float = yVector
		else :
			self.x: float = yVector.x - xVector.x
			self.y: float = yVector.y - xVector.y
		if (norm < 0) :
			self.norm : float = math.sqrt(self.x**2 + self.y**2)
		else :
			self.norm = norm
		
		self.addedSpeed = spdMultiplier

	def __str__(self) -> str :
		return (f"Vector is : ({self.x} {self.y})")

	def __repr__(self) -> str :

		return (f"[{self.x}, {self.y}]")

	def __eq__(self, other : 'Vector') -> bool :
		if (isinstance(other, Vector) == False) :
			return False
		elif (self.x != other.x or self.y != other.y) :
			return False
		return True

	def __ne__(self, other : 'Vector') -> bool :
		if (isinstance(other, Vector) == False) :
			return False
		elif (self.x != other.x or self.y != other.y) :
			return True
		return False

	def __add__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x + other.x, self.y + other.y))
	
	def __sub__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x - other.x, self.y - other.y))
	
	def __mul__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x * other.x, self.y * other.y))

	def __truediv__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x / other.x, self.y / other.y))
	
	def __floordiv__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x // other.x, self.y // other.y))
	
	def __mod__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x % other.x, self.y % other.y))
	
	def __pow__(self, other : 'Vector') -> 'Vector' :
		if (isinstance(other, Vector) == False) :
			return Vector(-1, -1)
		else :
			return (Vector(self.x ** other.x, self.y ** other.y))

	def __isub__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x -= other.x
		self.y -= other.y
	
	def __iadd__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x += other.x
		self.y += other.y
	
	def __imul__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x *= other.x
		self.y *= other.y

	def __idiv__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x /= other.x
		self.y /= other.y
	
	def __ifloordiv__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x //= other.x
		self.y //= other.y
	
	def __imod__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x %= other.x
		self.y %= other.y

	def __ipow__(self, other : 'Vector') -> None :
		if (isinstance(other, Vector) == False) :
			return  
		self.x **= other.x
		self.y **= other.y
	
	def getNormVector(self) -> 'Vector' :

		return Vector(-(self.y), self.x)
	def toList(self) -> list :
		return ([self.x, self.y])
	

class Point() :
	def __init__(self, xPoint : float, yPoint : float) :
		self.x: float = xPoint
		self.y: float = yPoint

	def __str__(self) -> str :
		return (f"Point is : ({self.x}, {self.y})")

	def __repr__(self) -> str :
		return (f"< {self.x}, {self.y} >")

	def __eq__(self, other : 'Point') -> bool :
		if (isinstance(other, Point) == False) :
			return False
		elif (self.x != other.x or self.y != other.y) :
			return False
		return True

	def __ne__(self, other : 'Point') -> bool :
		if (isinstance(other, Point) == False) :
			return False
		elif (self.x != other.x or self.y != other.y) :
			return True
		return False

	def __add__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x + other.x, self.y + other.y))
	
	def __sub__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x - other.x, self.y - other.y))
	
	def __mul__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else  :
			return (Point(self.x * other.x, self.y * other.y))

	def __truediv__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x / other.x, self.y / other.y))
	
	def __floordiv__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x // other.x, self.y // other.y))
	
	def __mod__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x % other.x, self.y % other.y))
	
	def __pow__(self, other : 'Point') -> 'Point' :
		if (isinstance(other, Point) == False) :
			return Point(-1, -1)
		else :
			return (Point(self.x ** other.x, self.y ** other.y))

	def __isub__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x -= other.x
		self.y -= other.y
	
	def __iadd__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x += other.x
		self.y += other.y
	
	def __imul__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x *= other.x
		self.y *= other.y

	def __idiv__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x /= other.x
		self.y /= other.y
	
	def __ifloordiv__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x //= other.x
		self.y //= other.y
	
	def __imod__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x %= other.x
		self.y %= other.y

	def __ipow__(self, other : 'Point') -> None :
		if (isinstance(other, Point) == False) :
			return  
		self.x **= other.x
		self.y **= other.y

	def toTuple(self) -> tuple :
		return ((self.x, self.y))
	def toList(self) -> list :
		return ([self.x, self.y])