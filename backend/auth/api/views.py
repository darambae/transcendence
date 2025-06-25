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
from .utils import setTheCookie, decodeJWT


class data_link(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		user = request.data

		json_data = {
			'mail':user.get('mail')
		}
		response = requests.post("https://access_postgresql:4000/api/info_link/", json=json_data, verify=False, headers={'Host': 'localhost'})

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

			response = requests.post("https://access_postgresql:4000/api/checkPassword/", json=json_data, verify=False, headers={'Host': 'localhost'})
			
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
						'success':'authentication code send',
						'user_name': data_response.get('user_name'),
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

			jwtDecoded = decodeJWT(request)
			main_account = jwtDecoded[0]
				
			# with open("log-tfa.txt", "w+") as f:
			# 	print(f"main : {main_account}", file=f)

			if main_account:
				# with open("log-tfa.txt", "a") as f :
				# 	print("Error 1", file=f)
				json_data["jwt"] = main_account["payload"]

			if user.get('mail') == None:
				return setTheCookie(JsonResponse({'error':'mail is empty'}, status=400), jwtDecoded[1], jwtDecoded[2])

			if user.get('code') == None:
				return setTheCookie(JsonResponse({'error':'code is empty'}, status=400), jwtDecoded[1], jwtDecoded[2])

			if len(json_data.get('tfa')) != 19:
				return setTheCookie(JsonResponse({'error':'text size is different from 19 characters'}, status=400), jwtDecoded[1], jwtDecoded[2])


			response = requests.post("https://access_postgresql:4000/api/checkTfa/", json=json_data, verify=False, headers={'Host': 'localhost'})
			
			# with open("log-tfa.txt", "a") as f :
			# 	print(f"response json : {response.data}\nstatusCode : {response.status_code}", file=f)
			jwtDecoded[1] = response.json().get("access")
			jwtDecoded[2] = response.json().get("refresh")

			data_response = None
			try:
				if not response.ok:
					error_detail = response.json() if response.content else response.text
					if response.status_code in [400, 401, 403, 404]:
						return setTheCookie(JsonResponse({'error': error_detail}, status=400), jwtDecoded[1], jwtDecoded[2])
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
			return setTheCookie(JsonResponse(data_response, status=response.status_code), jwtDecoded[1], jwtDecoded[2])


def activate_account(request, uidb64, token):

	json_data = {
		'uidb64':uidb64,
		'token':token
	}

	response = requests.post("https://access_postgresql:4000/api/activate_account/", json=json_data, verify=False, headers={'Host': 'localhost'})

	json_response = response.json()
	template_html = json_response.get('html', None)
	if not template_html:
		error_message = "Missing template path from activation service."
		return render(request, '404.html', {'error_message': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
	return render(request, template_html)


class refreshToken(APIView):
	permission_class = [AllowAny]

	def get(self, request) :
		refresh_token = request.COOKIES.get("refresh_token", None)
		refresh_res = request.get(f'https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {refresh_token}", 'Host': 'localhost'}, verify=False)
		if refresh_res.status_code == 200:
			access = refresh_res.json().get("access", None)
			return setTheCookie(JsonResponse({"Success" : "Token refreshed"}, status=200), access, refresh_token)
		else :
			return JsonResponse({"Error" : "Refresh token expired"}, status=401) # A CAHNGER POUR UNLOG