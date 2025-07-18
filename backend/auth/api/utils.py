
from django.core.mail import send_mail
from django.conf import settings
import random
import string
import sys
import requests
import sys

def generate_otp_send_mail(user):
	tab = []
	for _ in range(4):
		str = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
		tab.append(str)
	opt = "-".join(tab)

	subject = "PongPong two factor Authentication"
	message = f"HELLO {user.user_name},\n\nenter this code to connect to PongPong\n\n" + opt
	from_email = settings.DEFAULT_FROM_EMAIL
	recipient_list = [user.mail]

	send_mail(subject, message, from_email, recipient_list)
	return opt

def setTheCookie(response, access=None, refresh=None) :
	if access :
		response.set_cookie(
			key="access_token",
			value=access,
			httponly=True,
			samesite='Lax'
		)
	if refresh :
		response.set_cookie(
			key="refresh_token",
			value=refresh,
			httponly=True,
			samesite='Lax'
		)
	return response

def decodeJWT(request, encodedJwt=None) :
	if not encodedJwt :
		encodedJwt = request.COOKIES.get("access_token", None)
	if not encodedJwt :
		return [None] * 3
	
	res = requests.get(f'https://access_postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
	res_json = res.json()
	if res.status_code != 200 :
		if (res_json.get('error') == "Token expired"):
			refresh_res = requests.get(f'https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'localhost'}, verify=False)
			if refresh_res.status_code == 200:
				new_access_token = refresh_res.json().get('access')
				res2 = requests.post('https://access_postgresql:4000/api/DecodeJwt',headers={"Authorization": f"bearer {new_access_token}", 'Host': 'localhost'}, verify=False)
				res2 = setTheCookie(res2, new_access_token, request.COOKIES.get("refresh_token", None))
				return [res2.json(), new_access_token, request.COOKIES.get("refresh_token", None)]
			return [None] * 3
		return [None] * 3
	return [res_json, encodedJwt, request.COOKIES.get("refresh_token", None)]