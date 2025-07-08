from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

# Create your models here.

class USER(AbstractBaseUser, PermissionsMixin):
    user_name = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=15)
    last_name = models.CharField(max_length=15)
    mail = models.EmailField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    two_factor_auth = models.CharField(default=False)
    online = models.BooleanField(default=False)
    activated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    avatar = models.CharField(max_length=255, default='default.png')
    blocked_user=models.ManyToManyField("USER", blank=True)
    chats = models.ManyToManyField("ChatGroup", symmetrical=False, related_name='user_chats', blank=True)

    USERNAME_FIELD = 'mail'
    REQUIRED_FIELDS = ['user_name', 'first_name', 'last_name']

    def __str__(self):
        return self.user_name
	
    def toJson(self):
        return {"user_id" : self.id, "username" : self.user_name, "avatar" : self.avatar, "invites" : []}



class ChatGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    # Champ pour indiquer si c'est un chat privé
    # blank=True signifie que ce champ n'est pas obligatoire
    members = models.ManyToManyField(USER, related_name='chat_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True) # Utile pour le tri ou l'historique des groupes

    def __str__(self):
        return self.name

class Message(models.Model):
    group = models.ForeignKey(ChatGroup, on_delete=models.CASCADE, related_name='messages')
    # Assurez-vous que sender est une ForeignKey vers le modèle User
    sender = models.ForeignKey(USER, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp'] # S'assurer que les messages sont toujours ordonnés par date

    def __str__(self):
        # Affiche le nom de l'expéditeur et le début du message
        return f'{self.sender.user_name}: {self.content[:50]}'


class MATCHTABLE(models.Model):
    matchKey = models.CharField(unique=True, max_length=100)
    dateMatch = models.DateTimeField(auto_now_add=True)
    username1 = models.ForeignKey(USER, related_name='match_as_user1', on_delete=models.CASCADE)
    score1 = models.IntegerField()
    score2 = models.IntegerField()
    username2 = models.ForeignKey(USER, related_name='match_as_user2', on_delete=models.CASCADE)
    winner = models.ForeignKey(USER, related_name='matches_won', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user1.username} {self.score1} - {self.score2} {self.user2.username}"


class FRIEND(models.Model):
    from_user = models.ForeignKey(
        USER, on_delete=models.CASCADE, related_name='sent_requests'
    )
    to_user = models.ForeignKey(
        USER, on_delete=models.CASCADE, related_name='received_requests'
    )
    status = models.CharField(
        max_length=10,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
            ('blocked', 'Blocked'),
        ],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user} ➜ {self.to_user} ({self.status})"
