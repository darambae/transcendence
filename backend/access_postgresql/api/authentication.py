import sys
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        print("auth-1", file=sys.stderr)
        auth_header = request.headers.get('Authorization')
        print("auth-2", file=sys.stderr)

        if not auth_header:
            print("auth-3-end", file=sys.stderr)
            return None
        print("auth-4", file=sys.stderr)
        parts = auth_header.split()
        print("auth-5", file=sys.stderr)
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            print("auth-6-end", file=sys.stderr)
            raise AuthenticationFailed('Invalid Authorization header')

        print("auth-7", file=sys.stderr)
        token = parts[1]
        print("auth-8", file=sys.stderr)

        try:
            print("auth-9", file=sys.stderr)
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            print("auth-10", file=sys.stderr)

            id = payload.get('user_id')
            print("auth-11", file=sys.stderr)
            if not id:
                print("auth-12-end", file=sys.stderr)
                raise AuthenticationFailed('Invalid payload')
            
            print("auth-13", file=sys.stderr)

            try:
                print("auth-14", file=sys.stderr)
                user = User.objects.get(pk=id)
            except User.DoesNotExist:
                print("auth-15-end", file=sys.stderr)
                raise AuthenticationFailed('User not found')

            print("auth-16", file=sys.stderr)
            return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
