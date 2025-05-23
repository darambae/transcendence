from django.db import models

# Create your models here.

class USER(models.Model):
	user_name = models.CharField(max_length=15, unique=True)
	first_name = models.CharField(max_length=15)
	last_name = models.CharField(max_length=15)
	mail = models.EmailField(unique=True)
	password = models.CharField(max_length=128)
	two_factor_Auth = models.CharField(max_length=255)
	online = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	last_login = models.DateTimeField(null=True, blank=True)
	avatar = models.CharField(max_length=100, blank=True, null=True)

	def __str__(self):
		return self.user_name
