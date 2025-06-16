from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import check_password, make_password
from django.utils.encoding import force_str
from .utils import generate_otp_send_mail, generateJwt
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.shortcuts import render
from .models import USER, MATCHTABLE
from django.http import JsonResponse
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
import json
import logging
from datetime import datetime
import sys
import jwt
from django.conf import settings
# Create your views here.

class api_signup(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

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

class checkPassword(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data

		try:
			user = USER.objects.get(mail=data.get('mail'))
			if user.actived:
				if check_password(data.get('password'), user.password):
					opt = generate_otp_send_mail(user)
					# opt = "NZHK-GO7Q-9JSD-X9QI"
					user.two_factor_auth = make_password(opt)
					user.save()
					return JsonResponse({'success': 'authentication code send',
										'user_name': user.user_name,
										'mail': user.mail,
										'opt':opt }
										, status=200)
				else:
					return JsonResponse({'error': 'Invalid password'}, status=401)
			else:
				return JsonResponse({'error': 'account not activated'}, status=401)
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)


class checkTfa(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data
		print(f"data : {data}, type name : {type(data).__name__}", file=sys.stderr)

		try:
			if "jwt" in data :
				print(f"invites : {data['jwt']}", file=sys.stderr)
				user = USER.objects.get(mail=data.get('mail'))
				if user.actived and user.two_factor_auth != None:
					if check_password(data.get('tfa'), user.two_factor_auth) and len(data["jwt"]["invites"]) < 3:
						data["jwt"]["invites"].append(user.user_name)
						data_generate_jwt = generateJwt(USER.objects.get(user_name=data["jwt"]["username"]), data["jwt"])
						user.two_factor_auth = False
						user.save()
						return JsonResponse({'success': 'authentication code send',
							  				 'refresh': str(data_generate_jwt['refresh']),
											 'access': str(data_generate_jwt['access'])},
											 status=200)
					else :
						return JsonResponse({'error': 'account not activated or two factor auth not send'}, status=401)
			else :
				print(f"main : ", file=sys.stderr)
				user = USER.objects.get(mail=data.get('mail'))
				if user.actived and user.two_factor_auth != None:
					if check_password(data.get('tfa'), user.two_factor_auth):
						user.two_factor_auth = False
						user.online = True
						user.last_login = datetime.now()
						user.save()

						data_generate_jwt = generateJwt(user, user.toJson())

						return JsonResponse({'success': 'authentication code send',
							  				 'refresh': str(data_generate_jwt['refresh']),
											 'access': str(data_generate_jwt['access'])},
											 status=200)
					else:
						return JsonResponse({'error': 'Invalid two factor auth'}, status=401)
				else:
					return JsonResponse({'error': 'account not activated or two factor auth not send'}, status=401)
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)


class DecodeJwt(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		auth_header = request.headers.get('Authorization')
		if not auth_header:
			return Response({'error': 'Authorization header missing'}, status=400)

		parts = auth_header.split()
		if len(parts) != 2 or parts[0].lower() != 'bearer':
			return Response({'error': 'Invalid Authorization header'}, status=400)

		token = parts[1]

		try:
			data_jwt = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
			return Response({'payload': data_jwt}, status=200)
		except jwt.ExpiredSignatureError:
			return Response({'error': 'Token expired'}, status=401)
		except jwt.InvalidTokenError:
			return Response({'error': 'Invalid token'}, status=401)

class InfoUser(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "user_name": user.user_name,
			"first_name": user.first_name,
			"last_name": user.last_name,
            "mail": user.mail,
			"online": user.online,
			"created_at": user.created_at,
			"last_login": user.last_login,
			"avatar": user.avatar
        })


class addResultGames(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data

		try:
			with transaction.atomic():
				tab = MATCHTABLE.objects.create (
					matchKey = data['matchKey'],
					username1 = data['username1'],
					score1 = data['score1'],
					score2 = data['score2'],
					username2 = data['username2']
				)
		except IntegrityError as e:
			err_msg = str(e)
			if 'matchKey' in err_msg:
				return JsonResponse({'error': 'matchKey already exists'}, status=400)
			else:
				return JsonResponse({'error': 'Integrity error', 'details': str(e)}, status=400)

		return JsonResponse({'success': 'Result Match creat', 'matchKey': data['matchKey']}, status=200)


class keyGame(APIView):
	permission_classes = [AllowAny]

	def get(self, request, key):

		try:
			game = MATCHTABLE.objects.get(matchKey=key)

			return JsonResponse({'succes': 'keu math found',
								 'matchKey': game.matchKey,
								 'dateMatch': game.dateMatch,
								 'username1': game.username1,
								 'score1': game.score1,
								 'score2': game.score2,
								 'username2': game.username2,
								},
					   			status=200)
		except MATCHTABLE.DoesNotExist:
			return JsonResponse({'error': 'Key Math not found'}, status=404)
