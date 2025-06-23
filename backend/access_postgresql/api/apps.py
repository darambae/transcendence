from django.apps import AppConfig
from django.db.models.signals import post_migrate

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
            from django.db.utils import IntegrityError
            from .models import USER

            def create_test_users(sender, **kwargs):
                test_users = [
                    {
                        "user_name": "kelly",
                        "first_name": "Kelly",
                        "last_name": "Brenner",
                        "mail": "kelly@example.com",
                        "password": "kelly1234",
                        "activated": True,
                        "avatar": "default.png"
                    },
                    {
                        "user_name": "omar",
                        "first_name": "Omar",
                        "last_name": "Builder",
                        "mail": "omar@example.com",
                        "password": "omar1234",
                        "activated": True,
                        "avatar": "default.png"
                    },
                    {
                        "user_name": "gautier",
                        "first_name": "Gautier",
                        "last_name": "gotgot",
                        "mail": "gautier@example.com",
                        "password": "gautier1234",
                        "activated": True,
                        "avatar": "default.png"
                    },
                ]
                for u in test_users:
                    if not USER.objects.filter(mail=u["mail"]).exists():
                        user = USER(
                            user_name=u["user_name"],
                            first_name=u["first_name"],
                            last_name=u["last_name"],
                            mail=u["mail"],
                            activated=u.get("activated", False),
                        )
                        user.set_password(u["password"])  # Hash the password!
                        try:
                            user.save()
                            print(f"Created test user: {u['user_name']}")
                        except IntegrityError:
                            pass

            post_migrate.connect(create_test_users, sender=self)