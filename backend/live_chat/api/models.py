#api/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

class USER(AbstractBaseUser, PermissionsMixin):
	user_name = models.CharField(max_length=15, unique=True)
	first_name = models.CharField(max_length=15)
	last_name = models.CharField(max_length=15)
	mail = models.EmailField(max_length=50, unique=True)
	password = models.CharField(max_length=255)
	two_factor_auth = models.CharField(default=False, max_length=255)
	online = models.BooleanField(default=False)
	activated = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	last_login = models.DateTimeField(null=True, blank=True)
	avatar = models.ImageField(upload_to='imgs/', default='imgs/default.png')
	blocked_user = models.ManyToManyField('self', blank=True)

	USERNAME_FIELD = 'mail'
	REQUIRED_FIELDS = ['user_name', 'first_name', 'last_name']

	def __str__(self):
		return self.user_name


class ChatGroup(models.Model):
	name = models.CharField(max_length=255, unique=True)
	# Champ pour indiquer si c'est un chat privé
	is_private = models.BooleanField(default=False)
	# Relation Many-to-Many avec le modèle User pour les membres d'un groupe (particulièrement pour les chats privés)
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
	username1 = models.CharField(max_length=15)
	score1 = models.IntegerField()
	score2 = models.IntegerField()
	username2 = models.CharField(max_length=15)

	def __str__(self):
		return f"{self.username1} {self.score1} - {self.score2} {self.username2}"
	
