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
			host = "transcendence.42.fr"
			activation_link = f"https://{host}:8443/auth/activate_account/{uid}/{token}/"
		except ValueError:
			json_response = {
            	'error': 'Invalid response from mail service',
            	'detail': response.text
    	    }
			return JsonResponse({'error': json_response.get('error')}, status=500)

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
				'tfa':user.get('code')
			}

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
				data_response = response.json()
				return JsonResponse({
					'success': 'authentication code send',
					'refresh': data_response.get('refresh'),
					'access': data_response.get('access'),
				}, status=200)
			else:
				return JsonResponse({'error': response.text}, status=response.status_code)
			return JsonResponse(data_response, status=response.status_code)


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