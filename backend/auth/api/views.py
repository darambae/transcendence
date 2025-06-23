from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.hashers import check_password
from django.contrib.auth.hashers import make_password
from .utils import generate_otp_send_mail
from .models import USER
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
import json
import requests
import sys
import os

def decodeJWT(request, encodedJwt=None) :
	if not encodedJwt :
		#print(f"headers : {request.headers}", file=sys.stderr)
		encodedJwt = request.COOKIES.get("access_token", None)
		#encodedJwt = request.headers.get("Authorization", None)
		#print(f"encodedJWT : {encodedJwt}", file=sys.stderr)
	if not encodedJwt :
		return [None]
	
	# res = requests.get(f'{uriJwt}api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
	print(f"encoded: {encodedJwt}", file=sys.stderr)
	res = requests.get(f'https://access-postgresql:4000/api/DecodeJwt', headers={"Authorization" : f"bearer {encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
	res_json = res.json()
	if res.status_code != 200 :
		print(f"Not recognized, code = {res.status_code} Body : {res.text}", file=sys.stderr)
		if (res_json.get('error') == "Token expired"):
			refresh_res = request.post(f'https://access-postgresql:4000/api/token/refresh', headers={"Authorization" : f"{encodedJwt}", 'Host': 'access-postgresql'}, verify=False)
			if refresh_res.status_code == 200:
				new_access_token = refresh_res.json().get('access')
				res2 = requests.post('https://access-postgresql:4000/api/DecodeJwt',headers={"Authorization": f"bearer {new_access_token}", 'Host': 'access-postgresql'}, verify=False)
				return [res2.json()]
			return[None]
		return [None]
	return [res_json]

class data_link(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		user = request.data

		json_data = {
			'mail':user.get('mail')
		}
		response = requests.post("https://access-postgresql:4000/api/info_link/", json=json_data, verify=False, headers={'Host': 'access-postgresql'})

		try:
			if not response.ok:
				error_detail = response.json() if response.content else response.text
				return JsonResponse({'error': error_detail}, status=response.status_code)
			json_response = response.json()

			uid = json_response.get('uid')
			token = json_response.get('token')
			#host = request.get_host()
			host = os.getenv("DOMAIN", "localhost")
			activation_link = f"https://{host}:8443/auth/activate_account/{uid}/{token}/"
		except ValueError:
			json_response = {
				'error': 'Invalid response from mail service',
				'detail': response.text
			}
			return JsonResponse({'error': json_response}, status=500)

		return JsonResponse({'link': activation_link}, status=200)


class login(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		if (request.method == 'POST'):

			user = request.data
			
			json_data = {
				'mail':user.get('mail'),
				'password':user.get('password')
			}

			response = requests.post("https://access-postgresql:4000/api/checkPassword/", json=json_data, verify=False, headers={'Host': 'access-postgresql'})
			
			data_response = None
			try:
				data_response = response.json()
			except ValueError:
				data_response = {
					'error': 'Invalid response from mail service',
					'detail': response.text
				}

			if response.status_code == 200:
					json_send_mail = {
						'user_name': data_response.get('user_name'),
						'mail': data_response.get('mail'),
						'opt': data_response.get('opt')
					}
					mail_response = requests.post("https://mail:4010/mail/send_tfa/", json=json_send_mail, verify=False, headers={'Host': 'mail'})
					if not mail_response.ok:
						mail_error_detail = mail_response.json() if mail_response.content else mail_response.text
						data_response = {
							'error': f"Failed to send 2FA email. Status: {mail_response.status_code}",
							'detail': mail_error_detail
						}
						return JsonResponse(data_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
					data_response = {
						'success':'authentication code send'
					}
			return JsonResponse(data_response, status=response.status_code)


class verifyTwofa(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		if (request.method == 'POST'):
		
			user = request.data

			json_data = {
				'mail':user.get('mail'),
				'tfa':user.get('code'),
			}

			main_account = (decodeJWT(request))[0]

			print(f"main : {main_account}", file=sys.stderr)

			if main_account:
				json_data["jwt"] = main_account["payload"]

			if user.get('mail') == None:
				return JsonResponse({'error':'mail is empty'}, status=400)

			if user.get('code') == None:
				return JsonResponse({'error':'code is empty'}, status=400)

			if len(json_data.get('tfa')) != 19:
				return JsonResponse({'error':'text size is different from 19 characters'}, status=400)


			response = requests.post("https://access-postgresql:4000/api/checkTfa/", json=json_data, verify=False, headers={'Host': 'access-postgresql'})

			data_response = None
			try:
				if not response.ok:
					error_detail = response.json() if response.content else response.text
					if response.status_code in [400, 401, 403, 404]:
						return JsonResponse({'error': error_detail}, status=400)
			except ValueError:
				data_response = {
					'error': 'Invalid response from mail service',
					'detail': response.text
				}

			if response.status_code == 200:
				data_response = {
					'success':'authentication successfull, you are connected',
				}
			else:
				data_response = {
					'error':response.text
				}
			set_cookies = response.cookies
			resp = JsonResponse(data_response, status=response.status_code)
			if set_cookies:
				for key in set_cookies.keys():
					value = set_cookies.get(key)
					print(key, " : ", set_cookies.get(key))
					resp.set_cookie(
						key=key,
						value=value,
						httponly=True,
						samesite='Lax'
					)
			return resp


def activate_account(request, uidb64, token):

	json_data = {
		'uidb64':uidb64,
		'token':token
	}

	response = requests.post("https://access-postgresql:4000/api/activate_account/", json=json_data, verify=False, headers={'Host': 'access-postgresql'})

	json_response = response.json()
	template_html = json_response.get('html')
	if not template_html:
		error_message = "Missing template path from activation service."
		return render(request, '404.html', {'error_message': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	return render(request, template_html)