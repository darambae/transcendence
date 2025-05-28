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

def start_loop(loop):
    asyncio.set_event_loop(loop)
    loop.run_forever()
try :
    loopAi = asyncio.new_event_loop()
    threading.Thread(target=start_loop, args=(loopAi,), daemon=True).start()
    print("Loop goes well !", file=sys.stderr)
except Exception as e:
    print(f"Errrror : {e}", file=sys.stderr)

async def getActualPosition(apiKey) :
    try :
        res = requests.get(f"{urlRequests}api/simulation?apikey={apiKey}", verify=False)
        if res.status_code != 200 :
            return
        else :
            return res.json()
    except Exception as e :
        print(f"error getActualPos : {e}", file=sys.stderr)

async def sendInfo(apiKey) :
    try :
        position = await getActualPosition(apiKey)
        actualTime = time.time()
        while position["team1Score"] < 5 and position["team2Score"] < 5 :
            racketY = position["player2"]
            for j in range(20) :
                posYAi = (racketY[1][1] + racketY[0][1]) / 2
                resultStats = posYAi - position["ball"]["position"][1]
                if resultStats < -5 :
                    requests.post(f"{urlRequests}/send-message", json={"apiKey": apiKey, "message": '{"action": "move", "player2": "down"}'}, verify=False)
                    racketY[0][1] -= 5
                    racketY[1][1] -= 5
                elif resultStats > 5 :
                    requests.post(f"{urlRequests}/send-message", json={"apiKey": apiKey, "message": '{"action": "move", "player2": "up"}'}, verify=False)
                    racketY[0][1] += 5
                    racketY[1][1] += 5
                await asyncio.sleep(0.05)
            position = await getActualPosition(apiKey)
            print(f"time Before last view : {time.time() - actualTime}", file=sys.stderr)
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