from django.contrib import admin
from django.urls import path, include
from api.views import getSimulationState, sse, setApiKeySp, get_api_key, sendNewJSON, setApiKey, forfaitUser, disconnectUsr, isGamePlayable


urlpatterns = [
    path('api/simulation', getSimulationState, name='getSimulationState'),
    path('set-api-key-alone', setApiKeySp, name="setApiKeySp"),
    path('set-api-key', setApiKey, name="setApiKey"),
    path('get-api-key', get_api_key, name="get_api_key"),
    path('send-message', sendNewJSON, name='sendNewJSON'),
    path("forfait-game", forfaitUser, name="forfaitUser"),
    path("leave-game", disconnectUsr, name="disconnectUsr"),
    path("is-game-playable", isGamePlayable, name="isGamePlayable"),
    path('events', sse, name="sse")
]

from django.urls import get_resolver
import sys

resolver = get_resolver()
for pattern in resolver.url_patterns:
    print(pattern, file=sys.stderr)