from django.db import models

class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    nickname = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    #avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    def __str__(self):
        return self.username
    
# class Game(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     game_type = {
#         1: 'AI Duel',
#         2: 'Human Duel',
#     }
#     win = models.BooleanField()
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"{self.user.username} - {self.game_type} - {self.score}"