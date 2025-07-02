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
import random
import string


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
		user = request.data
		jwtDecoded = decodeJWT(request)
		
		if not user.get('code'):
			return setTheCookie(JsonResponse({'error':'code is empty'}, status=400), jwtDecoded[1], jwtDecoded[2])
			
		if len(user.get('code')) != 19:
			return setTheCookie(JsonResponse({'error':'text size is different from 19 characters'}, status=400), jwtDecoded[1], jwtDecoded[2])
		
		# Build request data
		json_data = {
			'mail': user.get('mail'),
			'tfa': user.get('code'),
		}
		
		main_account = jwtDecoded[0]
		if main_account:
			json_data["jwt"] = main_account["payload"]
		
		# Make API request and handle exceptions
		try:
			response = requests.post(
				"https://access_postgresql:4000/api/checkTfa/", 
				json=json_data, 
				verify=False, 
				headers={'Host': 'localhost'}
			)
			
			# Parse JSON response safely
			response_data = response.json() if response.content else {}
			
			# Update tokens if available
			access_token = response_data.get("access", jwtDecoded[1])
			refresh_token = response_data.get("refresh", jwtDecoded[2])
			
			# Handle error responses
			if not response.ok:
				error_detail = response_data if response.content else response.text
	
				# If error_detail is a dict with an 'error' key, extract it directly
				if isinstance(error_detail, dict) and 'error' in error_detail:
					return setTheCookie(JsonResponse({'error': error_detail['error']}, status=response.status_code), 
									access_token, refresh_token)
				else:
					return setTheCookie(JsonResponse({'error': error_detail}, status=response.status_code), 
									access_token, refresh_token)
			
			# Success response
			return setTheCookie(
				JsonResponse({'success':'authentication successful, you are connected'}, status=200),
				access_token, refresh_token)
				
		except ValueError:
			# JSON parsing error
			return setTheCookie(
				JsonResponse({'error': 'Invalid response format', 'detail': response.text}, status=500),
				jwtDecoded[1], jwtDecoded[2])
		except requests.exceptions.RequestException as e:
			# Network/connection error
			return setTheCookie(
				JsonResponse({'error': f'Connection error: {str(e)}'}, status=500),
				jwtDecoded[1], jwtDecoded[2])
		
		# with open("log-tfa.txt", "a") as f :
		# 	print(f"response json : {response.data}\nstatusCode : {response.status_code}", file=f)
		# if response.ok:
		# 	jwtDecoded[1] = response.json().get("access")
		# 	jwtDecoded[2] = response.json().get("refresh")

		# data_response = None
		# try:
		# 	if not response.ok:
		# 		error_detail = response.json() if response.content else response.text
		# 		if response.status_code in [400, 401, 403, 404]:
		# 			return setTheCookie(JsonResponse({'error': error_detail}, status=400), jwtDecoded[1], jwtDecoded[2])
		# except ValueError:
		# 	data_response = {
		# 		'error': 'Invalid response from mail service',
		# 		'detail': response.text
		# 	}

		# if response.status_code == 200:
		# 	data_response = {
		# 		'success':'authentication successfull, you are connected',
		# 	}
		# else:
		# 	data_response = {
		# 		'error':response.text
		# 	}
		# return setTheCookie(JsonResponse(data_response, status=response.status_code), jwtDecoded[1], jwtDecoded[2])


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
		refresh_res = requests.get('https://access_postgresql:4000/api/token/refresh', headers={"Authorization" : f"bearer {refresh_token}", 'Host': 'localhost'}, verify=False)
		if refresh_res.status_code == 200:
			access = refresh_res.json().get("access", None)
			return setTheCookie(JsonResponse({"Success" : "Token refreshed"}, status=200), access, refresh_token)
		else :
			return JsonResponse({"Error" : "Refresh token expired"}, status=401)
		

class logout(APIView):
	permission_classes = [AllowAny]

	def patch(self, request):
		# jwtDecoded = decodeJWT(request)
		# user_payload = jwtDecoded[0]["payload"] if jwtDecoded and jwtDecoded[0] else None
		# mail = user_payload.get('mail') if user_payload else None
		# if not mail:
		# 	return JsonResponse({'error': 'User mail not found in JWT'}, status=400)

		try:
			token = request.COOKIES.get('access_token')
			headers = {'Host': 'localhost'}
			if (token): 
				headers['Authorization'] = f'Bearer {token}'
			response = requests.patch(
				"https://access_postgresql:4000/api/logout/",
				json={}, 
				verify=False,
				headers=headers
			)
		except Exception as e:
			return JsonResponse({'error': f'Error contacting access_postgresql: {str(e)}'}, status=500)

		resp = JsonResponse({'message': 'User logged out successfully'}, status=response.status_code)
		resp.delete_cookie('access_token')
		resp.delete_cookie('refresh_token')
		return resp


class	forgotPassword(APIView):
	permission_classes = [AllowAny]

	def patch(self, request):
		requestData = request.data
		email = requestData.get('mail')
		if not email:
			return JsonResponse({'error': 'Missing mail parameter'}, status=400)

		def generate_temp_password(length=12):
			chars = string.ascii_letters + string.digits
			return ''.join(random.choices(chars, k=length))

		try:
			user_info_url = "https://access_postgresql:4000/api/info_link/"
			user_info_data = {"mail": email}
			print("forgot password, mail to find in DB : ", email)
			user_info_response = requests.post(user_info_url, json=user_info_data, verify=False, headers={'Host': 'localhost'})
			if user_info_response.status_code == 404:
				print("error: user does not exist")
				return JsonResponse({'error': 'User does not exist'}, status=404)
			if not user_info_response.ok:
				return JsonResponse({'error': 'Failed to retrieve user info'}, status=500)
			user_info = user_info_response.json()
			username = user_info.get('user_name', None)
			if not username:
				return JsonResponse({'error': 'Username not found for this mail'}, status=500)

			temp_password = generate_temp_password()
			hashedPassword = make_password(temp_password)
			patch_url = "https://access_postgresql:4000/api/forgotPassword/"
			patch_data = {"username": username, "mail": email, "new_password": hashedPassword}
			patch_response = requests.patch(patch_url, json=patch_data, verify=False, headers={'Host': 'localhost'})
			if patch_response.ok:
				mail_url = "https://mail:4010/mail/send_temp_password/"
				mail_data = {"mail": email, "user_name": username, "temp_password": temp_password}
				mail_response = requests.post(mail_url, json=mail_data, verify=False, headers={'Host': 'mail'})
				if mail_response.ok:
					return JsonResponse({'success': 'Temporary password set and sent', 'mail': email}, status=200)
				else:
					return JsonResponse({'error': 'Failed to send temporary password email'}, status=500)
			else:
				return JsonResponse({'error': 'Failed to update password in database'}, status=500)
		except Exception as e:
			return JsonResponse({'error': f'Exception: {str(e)}'}, status=500)

