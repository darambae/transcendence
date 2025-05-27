import random

def createMatchmaking(users) :
    if (len(users) <= 2) :
        return users
    else :
        random.shuffle(users)
        return [createMatchmaking(users[0:len(users)//2]), createMatchmaking(users[len(users)//2:])]


class Tournament :
    def __init__(self, users) :
        self.matchList = users
        while (len(self.matchList) > 2) :
            self.matchList = createMatchmaking(self.matchList)
        # #print(self.matchList)
    
        





dictTournament = {}

tr = Tournament(["Alice", "Bob0", "Bob1", "Bob2", "Bob3", "Bob4", "Bob5", "Bob6", "Bob7", "Bob8", "Bob9", "Bob10", "Bob11", "Bob12", "Bob13", "Bob14", "Bob15"])
# Need to create a function to create the tournament matchmaking