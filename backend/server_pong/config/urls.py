from django.urls import path, include
from api.views import getSimulationState, sse, setApiKeySp, get_api_key, sendNewJSON, setApiKey, forfaitUser, disconnectUsr, isGamePlayable, apiKeyManager, sseCheck, destroyKey


urlpatterns = [
    path('server-pong/api/simulation', getSimulationState, name='getSimulationState'),
    path('server-pong/api-key-alone', setApiKeySp, name="setApiKeySp"),
    path('server-pong/api-key', apiKeyManager, name="apiKeyManager"),
    path('server-pong/send-message', sendNewJSON, name='sendNewJSON'),
    path("server-pong/forfait-game", forfaitUser, name="forfaitUser"),
    path("server-pong/stop-game", disconnectUsr, name="disconnectUsr"),
    path("server-pong/game-status", isGamePlayable, name="isGamePlayable"),
    path('server-pong/events', sse, name="sse"),
    path('server-pong/check-sse', sseCheck, name="sseCheck"),
    path('server-pong/<str:key>/delete-key/', destroyKey, name="destroyKey")
]
