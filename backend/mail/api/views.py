from django.core.mail import send_mail, BadHeaderError
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.shortcuts import render
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import string
import random
import requests

import logging

# Create your views here.

logger = logging.getLogger(__name__)

class confirm_singup(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		logger.info(f"Headers: {request.headers}")
		user = request.data

		json_data = {
			'mail':user.get('mail')
		}
		response = requests.post("https://auth:4020/auth_api/data_link/", json=json_data, verify=False, headers={'Host': 'auth'})

		json_response = response.json()
		try:

			subject = "Confirmation of your PongPong registration"
			message = (
				f"Hello {user.get('user_name')},\n\n"
				f"Thank you for registering on PongPong!\n\n"
				f"Please click the following link to activate your account:\n{json_response.get('link')}\n\n"
			)

			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [user.get('mail')]

			send_mail(subject, message, from_email, recipient_list, fail_silently=False)

			return Response({"detail": "Email sent successfully."}, status=status.HTTP_200_OK)

		except BadHeaderError:
			logger.error(f"Invalid header found when sending email to {user.get('mail')}")
			return Response({"error": "Invalid header found."}, status=status.HTTP_400_BAD_REQUEST)

		except Exception as e:
			logger.error(f"Error sending confirmation email to {user.get('mail')}: {str(e)}")
			return Response({"error": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class send_tfa(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		try:
			data = request.data

			subject = "PongPong two factor Authentication"
			message = f"HELLO {data.get('user_name')},\n\nenter this code to connect to PongPong\n\n" + data.get('opt')
			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [data.get('mail')] 
			logger.info(f"Two factor authentication email sent to {data.get('mail')} with code {data.get('opt')}")
			send_mail(subject, message, from_email, recipient_list)
		except BadHeaderError:
			return Response({"error": "Failed to send email."}, status=500)
	
		return Response({"error": "Failed to send email."}, status=200)
	
class	send_temp_password(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		try:
			data = request.data
			subject = 'PongPong temporary password'
			message = f"Hello {data.get('user_name')},\n\nPlease find below your temporary password : {data.get('temp_password')}\n\nYou can now use it to log in to your account and change your password in your personnal settings"
			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [data.get('mail')]
			logger.info(f"temporary password sent to {data.get('user_name')}")
			send_mail(subject, message, from_email, recipient_list)
			return Response({"success": "temporary password sent"}, status=200)
		except BadHeaderError:
			return Response({'error': "Failed to send temporary password"}, status=500)
		except Exception as e:
			logger.error(f"Error sending temporary password: {str(e)}")
			return Response({'error': "Failed to send temporary password"}, status=500)
		
