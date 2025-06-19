import sys
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        print(f"auth: {auth_header}", file=sys.stderr)
        if not auth_header:
            return None

        parts = auth_header.split()
        print(f"parts: {parts}", file=sys.stderr)
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise AuthenticationFailed('Invalid Authorization header')

        token = parts[1]
        print(f"token: {token}", file=sys.stderr)
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            print(f"payload: {payload}", file=sys.stderr)

            username = payload.get('username')
            user_id = payload.get('user_id')
            if not username:
                raise AuthenticationFailed('Invalid payload')

            try:
                user = User.objects.get(pk=user_id) # <<<----- LE PROBLEME ETAIT ICI (pk=username)
            except User.DoesNotExist:
                raise AuthenticationFailed('User not found')

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
