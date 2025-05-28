from django.contrib import admin
from django.urls import path, include
from api.views import getSimulationState, sse, setApiKeySp, get_api_key, sendNewJSON, setApiKey, forfaitUser, disconnectUsr, isGamePlayable


urlpatterns = [
    path('server_pong/api/simulation', getSimulationState, name='getSimulationState'),
    path('server_pong/set-api-key-alone', setApiKeySp, name="setApiKeySp"),
    path('server_pong/set-api-key', setApiKey, name="setApiKey"),
    path('server_pong/get-api-key', get_api_key, name="get_api_key"),
    path('server_pong/send-message', sendNewJSON, name='sendNewJSON'),
    path("server_pong/forfait-game", forfaitUser, name="forfaitUser"),
    path("server_pong/leave-game", disconnectUsr, name="disconnectUsr"),
    path("server_pong/is-game-playable", isGamePlayable, name="isGamePlayable"),
    path('server_pong/events', sse, name="sse")
]

from django.urls import get_resolver
import sys

resolver = get_resolver()
for pattern in resolver.url_patterns:
    print(pattern, file=sys.stderr)