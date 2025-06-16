# live_chat_sse/chatMessage/models.py

from django.db import models
from django.contrib.auth.models import User # Très important : importer le modèle User de Django

class ChatGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    # Champ pour indiquer si c'est un chat privé
    is_private = models.BooleanField(default=False)
    # Relation Many-to-Many avec le modèle User pour les membres d'un groupe (particulièrement pour les chats privés)
    # blank=True signifie que ce champ n'est pas obligatoire
    members = models.ManyToManyField(User, related_name='chat_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True) # Utile pour le tri ou l'historique des groupes

    def __str__(self):
        return self.name

class Message(models.Model):
    group = models.ForeignKey(ChatGroup, on_delete=models.CASCADE, related_name='messages')
    # Assurez-vous que sender est une ForeignKey vers le modèle User
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp'] # S'assurer que les messages sont toujours ordonnés par date

    def __str__(self):
        # Affiche le nom de l'expéditeur et le début du message
        return f'{self.sender.username}: {self.content[:50]}'
