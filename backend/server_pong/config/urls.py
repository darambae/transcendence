from django.urls import path, include
from api.views import getSimulationState, sse, get_api_key, sendNewJSON, setApiKey, forfaitUser, disconnectUsr, isGamePlayable, apiKeyManager, sseCheck
from api.api_views import ApiKeySPView


urlpatterns = [
    path('server-pong/api/simulation', getSimulationState, name='getSimulationState'),
    # Use a class-based view to avoid the request parameter issue
    path('server-pong/api-key-alone', ApiKeySPView.as_view(), name="setApiKeySp"),
    path('server-pong/api-key', apiKeyManager, name="apiKeyManager"),
    path('server-pong/send-message', sendNewJSON, name='sendNewJSON'),
    path("server-pong/forfait-game", forfaitUser, name="forfaitUser"),
    path("server-pong/stop-game", disconnectUsr, name="disconnectUsr"),
    path("server-pong/game-status", isGamePlayable, name="isGamePlayable"),
    path('server-pong/events', sse, name="sse"),
    path('server-pong/check-sse', sseCheck, name="sseCheck")
]

# from django.urls import get_resolver
# import sys

# resolver = get_resolver()
# for pattern in resolver.url_patterns:
#     print(pattern, file=sys.stderr)