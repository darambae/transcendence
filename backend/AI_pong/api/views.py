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
from .logging_utils import log_ai_operation, log_game_event, log_api_request, ai_logger, performance_logger

urlRequests = "https://server_pong:8030/"

class HttpResponseNoContent(HttpResponse):
    status_code = HTTPStatus.NO_CONTENT

def start_loop(loop):
    asyncio.set_event_loop(loop)
    loop.run_forever()
try :
    loopAi = asyncio.new_event_loop()
    threading.Thread(target=start_loop, args=(loopAi,), daemon=True).start()
    ai_logger.info("AI event loop started successfully")
except Exception as e:
    ai_logger.error(f"Failed to start AI event loop: {e}")

@log_ai_operation('GET_POSITION')
async def getActualPosition(apiKey) :
    try :
        res = requests.get(f"{urlRequests}server-pong/api/simulation?apikey={apiKey}")
        if res.status_code != 200 :
            ai_logger.warning(f"Failed to get position for API key {apiKey}: Status {res.status_code}")
            return
        else:
            return res.json()
    except Exception as e :
        ai_logger.error(f"Error getting actual position: {e}", extra={'api_key': apiKey})

@log_ai_operation('GAME_SESSION')
async def sendInfo(apiKey) :
    try :
        position = await getActualPosition(apiKey)
        actualTime = time.time()
        ai_logger.info(f"Starting AI game session", extra={'api_key': apiKey})
        
        while position["team1Score"] < 5 and position["team2Score"] < 5 :
            racketY = position["player2"]
            for j in range(20) :
                posYAi = (racketY[1][1] + racketY[0][1]) / 2
                resultStats = posYAi - position["ball"]["position"][1]
                if resultStats < -5 :
                    requests.post(f"{urlRequests}/server-pong/send-message", json={"apiKey": apiKey, "message": '{"action": "move", "player2": "down"}'})
                    racketY[0][1] -= 5
                    racketY[1][1] -= 5
                elif resultStats > 5 :
                    requests.post(f"{urlRequests}/server-pong/send-message", json={"apiKey": apiKey, "message": '{"action": "move", "player2": "up"}'})
                    racketY[0][1] += 5
                    racketY[1][1] += 5
                await asyncio.sleep(0.05)
            position = await getActualPosition(apiKey)
            performance_logger.info(f"AI processing cycle completed", extra={
                'api_key': apiKey,
                'cycle_duration_ms': round((time.time() - actualTime) * 1000, 2)
            })
            actualTime = time.time()
            
        log_game_event('GAME_ENDED', api_key=apiKey, 
                      team1_score=position["team1Score"], 
                      team2_score=position["team2Score"])
                      
    except Exception as e:
        ai_logger.error(f"Error in AI game session: {e}", extra={'api_key': apiKey})
        pass

@log_api_request(action_type='AI_INIT')
def initAI(request) :
    try :
        apikey = request.GET.get('apikey', "None")
        ai_logger.info(f"Initializing AI for API key: {apikey}")
        asyncio.run_coroutine_threadsafe(sendInfo(apikey), loopAi)
        return HttpResponseNoContent()
    except Exception as e:
        ai_logger.error(f"Error initializing AI: {e}", extra={'api_key': apikey if 'apikey' in locals() else 'unknown'})