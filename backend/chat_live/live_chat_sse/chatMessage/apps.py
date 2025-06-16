from django.apps import AppConfig
from django.db.models.signals import post_migrate

#pour créer un groupe de chat général s'il n'existe pas
def create_general_group(sender, **kwargs):
    from .models import ChatGroup
    ChatGroup.objects.get_or_create(name="general", is_private=False)

class ChatmessageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatMessage'

    def ready(self):
        post_migrate.connect(create_general_group, sender=self)
