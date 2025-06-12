from django.contrib import admin
from django.urls import path, include
from api.views import getSimulationState, sse, setApiKeySp, get_api_key, sendNewJSON, setApiKey, forfaitUser, disconnectUsr, isGamePlayable, apiKeyManager


urlpatterns = [
    path('server-pong/api/simulation', getSimulationState, name='getSimulationState'),
    path('server-pong/api-key-alone', setApiKeySp, name="setApiKeySp"),
    path('server-pong/api-key', apiKeyManager, name="apiKeyManager"),
    path('server-pong/send-message', sendNewJSON, name='sendNewJSON'),
    path("server-pong/forfait-game", forfaitUser, name="forfaitUser"),
    path("server-pong/stop-game", disconnectUsr, name="disconnectUsr"),
    path("server-pong/game-status", isGamePlayable, name="isGamePlayable"),
    path('server-pong/events', sse, name="sse")
]

# from django.urls import get_resolver
# import sys

# resolver = get_resolver()
# for pattern in resolver.url_patterns:
#     print(pattern, file=sys.stderr)