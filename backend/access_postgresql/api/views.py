from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils.encoding import force_str
from django.contrib.auth.hashers import make_password
from .utils import generate_otp_send_mail
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.shortcuts import render
from .models import USER
from django.http import JsonResponse
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
import json
import logging


# Create your views here.

@api_view(['POST'])
def api_signup(request):
	print("HTTP_HOST:", request.META.get("HTTP_HOST"))
	print("Host (get_host()):", request.get_host())

	data = request.data

	try:
		with transaction.atomic():
			user = USER.objects.create(
			user_name=data['user_name'],
			first_name=data['first_name'],
			last_name=data['last_name'],
			mail=data['mail'],
			password=data['password']
            )
	except IntegrityError as e:
		err_msg = str(e)
		if 'mail' in err_msg:
			return JsonResponse({'error': 'User with this email already exists'}, status=400)
		elif 'user_name' in err_msg:
			return JsonResponse({'error': 'Username already taken'}, status=400)
		else:
			return JsonResponse({'error': 'Integrity error', 'details': str(e)}, status=400)

	return JsonResponse({'success': 'User successfully created', 'user_id': user.id}, status=200)

class info_link(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		data = request.data

		try:
			user = USER.objects.get(mail=data.get('mail'))
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)

		uid = urlsafe_base64_encode(force_bytes(user.pk))
		token = default_token_generator.make_token(user)

		json_response = {
			'uid':uid,
			'token':token
		}

		return JsonResponse(json_response, status=200)



logger = logging.getLogger(__name__)

class activate_account(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		User = get_user_model()

		data = request.data

		uidb64 = data.get('uidb64')
		token = data.get('token')

		try:
			uid = force_str(urlsafe_base64_decode(uidb64))
			user = User.objects.get(pk=uid)
		except (TypeError, ValueError, OverflowError, User.DoesNotExist):
			user = None

		if user is not None and default_token_generator.check_token(user, token):
			if not user.actived:
				user.actived = True
				user.save()
				logger.info(f"User {user.mail} activated successfully.")

				return JsonResponse({'html': 'account_actived.html'}, status=200)
			else:
				return JsonResponse({'html': 'account_already_actived.html'}, status=200)
		else:
			logger.warning("Activation link invalid or expired.")
			return JsonResponse({'html': 'token_expired.html'}, status=200)

class check_password(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data

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