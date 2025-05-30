from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

# Create your models here.


class USER(AbstractBaseUser, PermissionsMixin):
    user_name = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=15)
    last_name = models.CharField(max_length=15)
    mail = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    two_factor_Auth = models.CharField(max_length=255)
    online = models.BooleanField(default=False)
    actived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='imgs/', default='imgs/default.png')

    USERNAME_FIELD = 'mail'
    REQUIRED_FIELDS = ['user_name', 'first_name', 'last_name']

    class Meta:
        managed = False
        db_table = 'api_user'

    def __str__(self):
        return self.user_name
