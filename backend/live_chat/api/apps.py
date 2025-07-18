from django.apps import AppConfig

#pour créer un groupe de chat général s'il n'existe pas

class ChatmessageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
