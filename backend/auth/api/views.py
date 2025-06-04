from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.hashers import check_password
from django.contrib.auth.hashers import make_password
from .utils import generate_otp_send_mail
from .models import USER
from rest_framework_simplejwt.tokens import RefreshToken
import json

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
				user.two_factor_auth = make_password(generate_otp_send_mail(user))
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
		return JsonResponse({'error': 'Unauthorized'}, status=401)
