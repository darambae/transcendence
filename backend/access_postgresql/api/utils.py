
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
import random
import string
import sys

def generate_otp_send_mail(user):
	tab = []
	for _ in range(4):
		str = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
		tab.append(str)
	opt = "-".join(tab)

	return opt

def generateJwt(user, jsonJwt:dict, refresh=None):

	if user:
		refresh = RefreshToken.for_user(user)
		refresh['user_id'] = jsonJwt['user_id']
		refresh['username'] = jsonJwt['username']
		refresh['invites'] = jsonJwt['invites']


		access = refresh.access_token
		access['user_id'] = jsonJwt['user_id']
		access['username'] = jsonJwt['username']
		access['invites'] = jsonJwt['invites']
		return {
			'refresh': str(refresh),
			'access': str(access)
		}
	else:
		refreshh = RefreshToken(refresh)
		access = refreshh.access_token

		access['user_id'] = refreshh.get('user_id')
		access['username'] = refreshh.get('username')
		access['invites'] = refreshh.get('invites', [])
		return {
			'refresh': str(refreshh),
			'access': str(access)
		}
