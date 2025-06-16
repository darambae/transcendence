import os
import django

from channels.routing import ProtocolTypeRouter # Plus besoin de URLRouter, AuthMiddlewareStack, AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

# Définir la variable d'environnement du module de paramètres Django EN PREMIER
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'live_chat_sse.settings')

# Initialiser l'application ASGI de Django tôt pour s'assurer que l'AppRegistry
# est peuplé avant d'importer du code qui pourrait importer des modèles ORM.
django_asgi_app = get_asgi_application() # Ceci appelle django.setup() en interne

# Plus besoin d'importer chatMessage.routing ici si vous supprimez les consommateurs WebSocket
# (car routing.py est pour les WS Consumers)

application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests and SSE
    "http": django_asgi_app,
    # La partie "websocket" est supprimée
})
