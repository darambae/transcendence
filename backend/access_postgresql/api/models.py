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
	actived = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	last_login = models.DateTimeField(null=True, blank=True)
	avatar = models.CharField(max_length=255, default='default.png')

	USERNAME_FIELD = 'mail'
	REQUIRED_FIELDS = ['user_name', 'first_name', 'last_name']

	def __str__(self):
		return self.user_name
	
	def toJson(self):
		return {"user_id" : self.id, "username" : self.user_name, "avatar" : self.avatar, "invites" : []}


class MATCHTABLE(models.Model):
    matchKey = models.CharField(unique=True, max_length=100)
    dateMatch = models.DateTimeField(auto_now_add=True)
    username1 = models.CharField(max_length=15)
    score1 = models.IntegerField()
    score2 = models.IntegerField()
    username2 = models.CharField(max_length=15)

    def __str__(self):
        return f"{self.username1} {self.score1} - {self.score2} {self.username2}"


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
        ],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user} ➜ {self.to_user} ({self.status})"

class BlockedUser(models.Model):
    blocker = models.ForeignKey(USER, on_delete=models.CASCADE, related_name='blocks_sent')
    blocked = models.ForeignKey(USER, on_delete=models.CASCADE, related_name='blocks_received')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"