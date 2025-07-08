from django.apps import AppConfig
from django.db.models.signals import post_migrate

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'


    def ready(self):
        from django.db.utils import IntegrityError
        from .models import USER, MATCHTABLE

        def create_test_data(sender, **kwargs):
            # --- Utilisateurs ---
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
                {
                    "user_name": "Guest",
                    "first_name": "guest",
                    "last_name": "guest",
                    "mail": "guest@example.com",
                    "password": "Guest1234",
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
                    user.set_password(u["password"])
                    try:
                        user.save()
                        print(f"Created test user: {u['user_name']}")
                    except IntegrityError:
                        pass

            # --- Matchs ---
            test_matches = [
                {
                    "matchKey": "match1",
                    "username1": "kelly",
                    "score1": 5,
                    "score2": 3,
                    "username2": "omar",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match2",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match3",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match4",
                    "username1": "kelly",
                    "score1": 3,
                    "score2": 5,
                    "username2": "omar",
                    "winner": "omar"
                },
                {
                    "matchKey": "match5",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match6",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match7",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match8",
                    "username1": "kelly",
                    "score1": 3,
                    "score2": 5,
                    "username2": "omar",
                    "winner": "omar"
                },
                {
                    "matchKey": "match9",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match10",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match11",
                    "username1": "kelly",
                    "score1": 5,
                    "score2": 3,
                    "username2": "omar",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match12",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match13",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match14",
                    "username1": "kelly",
                    "score1": 3,
                    "score2": 5,
                    "username2": "omar",
                    "winner": "omar"
                },
                {
                    "matchKey": "match15",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match16",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match17",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
                {
                    "matchKey": "match18",
                    "username1": "kelly",
                    "score1": 3,
                    "score2": 5,
                    "username2": "omar",
                    "winner": "omar"
                },
                {
                    "matchKey": "match19",
                    "username1": "omar",
                    "score1": 4,
                    "score2": 5,
                    "username2": "gautier",
                    "winner": "gautier"
                },
                {
                    "matchKey": "match20",
                    "username1": "gautier",
                    "score1": 2,
                    "score2": 6,
                    "username2": "kelly",
                    "winner": "kelly"
                },
            ]

            for m in test_matches:
                if not MATCHTABLE.objects.filter(matchKey=m["matchKey"]).exists():
                    try:
                        user1 = USER.objects.get(user_name=m["username1"])
                        user2 = USER.objects.get(user_name=m["username2"])
                        winner = USER.objects.get(user_name=m["winner"])

                        match = MATCHTABLE(
                            matchKey=m["matchKey"],
                            username1=user1,
                            score1=m["score1"],
                            score2=m["score2"],
                            username2=user2,
                            winner=winner
                        )
                        match.save()
                        print(f"Created test match: {m['matchKey']}")
                    except IntegrityError:
                        print(f"Match already exists: {m['matchKey']}")

        post_migrate.connect(create_test_data, sender=self)
