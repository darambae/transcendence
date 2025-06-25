
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

	print("gen-11", file=sys.stderr)
	if user :
		print("gen-22", file=sys.stderr)
		refresh = RefreshToken.for_user(user)
		print("gen-33")
	print("gen-44", file=sys.stderr)
	access = refresh.access_token
	print("gen-55", file=sys.stderr)

	access['user_id'] = jsonJwt["user_id"]
	print("gen-66", file=sys.stderr)
	access['username'] = jsonJwt["username"]
	print("gen-77", file=sys.stderr)
	access['invites'] = jsonJwt["invites"]
	print("gen-88", file=sys.stderr)
	
	return {
		'refresh': str(refresh),
		'access': str(access)
	}
