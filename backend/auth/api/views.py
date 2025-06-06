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
			return JsonResponse({'error': json_response}, status=500)


		return JsonResponse({'link': activation_link}, status=200)


# Create your views here.
def login(request):
	if (request.method == 'POST'):
		try:
			data = json.loads(request.body)
		except KeyError as e:
			return JsonResponse({'error': f'Missing field : {str(e)}'}, status=400)
		
		try:
			user = USER.objects.get(mail=data.get('mail'))
			if check_password(data.get('password'), user.password):
				user.two_factor_Auth = make_password(generate_otp_send_mail(user))
				user.save()
				return JsonResponse({'success': 'authentication code sent', 'user_id': user.id}, status=200)
			else:
				return JsonResponse({'error': 'Invalid password'}, status=401)
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)
	else:
		return JsonResponse({'error': 'Unauthorized'}, status=405)


def token(request):
	if (request.method == 'POST'):
		try:
			data = json.loads(request.body)
		except KeyError as e:
			return JsonResponse({'error': f'Missing field : {str(e)}'}, status=400)

		try:
			user = USER.objects.get(mail=data.get('mail'))
			if check_password(data.get('two'), user.two_factor_auth):

				refresh = RefreshToken.for_user(user)
				access_token = str(refresh.access_token)

				user.online = True
				user.save()
				return JsonResponse({'succes': 'Login successful',
									'user_id': user.id,
									'access' : access_token,
									'refresh' : str(refresh)
									}, status=200)
			else:
				return JsonResponse({'error': 'Invalid two_factor_auth'}, status=401)
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)
	else:
		return JsonResponse({'error': 'Unauthorized'}, status=405)


def activate_account(request, uidb64, token):

	json_data = {
		'uidb64':uidb64,
		'token':token
	}

	response = requests.post("https://access-postgresql:4000/api/activate_account/", json=json_data, verify=False, headers={'Host': 'access-postgresql'})

	json_response = response.json()
	template_html = json_response.get('html')

	return render(request, template_html)
