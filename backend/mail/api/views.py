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
from .logging_utils import log_mail_api_request, log_email_event as log_mail_event, mail_logger

# Create your views here.

logger = logging.getLogger(__name__)

class confirm_singup(APIView):
	permission_classes = [AllowAny]

	@log_mail_api_request(action_type='SEND_CONFIRMATION_EMAIL')
	def post(self, request):
		user = request.data
		email = user.get('mail', 'unknown')
		username = user.get('user_name', 'unknown')
		
		mail_logger.info("Confirmation email requested", extra={
			'email': email,
			'username': username
		})

		json_data = {
			'mail': email
		}
		
		try:
			response = requests.post("https://auth:4020/auth_api/data_link/", json=json_data, verify=False, headers={'Host': 'auth'})
			
			if not response.ok:
				mail_logger.warning(f"Failed to get activation link from auth service: {response.status_code}", extra={
					'status_code': response.status_code,
					'response_text': response.text[:200],
					'email': email
				})
				return Response({"error": "Failed to generate activation link."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
				
			try:
				json_response = response.json()
			except Exception as e:
				mail_logger.error(f"Error parsing JSON response from auth service: {str(e)}", extra={
					'error': str(e),
					'response_text': response.text[:200],
					'email': email
				})
				return Response({"error": "Invalid response from authentication service."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

			subject = "Confirmation of your PongPong registration"
			message = (
				f"Hello {username},\n\n"
				f"Thank you for registering on PongPong!\n\n"
				f"Please click the following link to activate your account:\n{json_response.get('link')}\n\n"
			)

			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [email]

			send_mail(subject, message, from_email, recipient_list, fail_silently=False)
			
			# Log successful email sending
			log_mail_event(
				event_type='ACCOUNT_CONFIRMATION_SENT',
				recipient=email,
				subject=subject,
				success=True,
				username=username
			)

			return Response({"detail": "Email sent successfully."}, status=status.HTTP_200_OK)

		except BadHeaderError:
			log_mail_event(
				event_type='ACCOUNT_CONFIRMATION_FAILED',
				recipient=email,
				subject="Confirmation of your PongPong registration",
				success=False,
				error_type='BadHeaderError',
				username=username
			)
			return Response({"error": "Invalid header found."}, status=status.HTTP_400_BAD_REQUEST)

		except Exception as e:
			log_mail_event(
				event_type='ACCOUNT_CONFIRMATION_FAILED',
				recipient=email,
				subject="Confirmation of your PongPong registration",
				success=False,
				error_type=type(e).__name__,
				error_message=str(e),
				username=username
			)
			mail_logger.error(f"Error sending confirmation email: {str(e)}", extra={
				'error': str(e),
				'error_type': type(e).__name__,
				'recipient': email,
				'username': username
			})
			return Response({"error": "Failed to send email."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class send_tfa(APIView):
	permission_classes = [AllowAny]

	@log_mail_api_request(action_type='SEND_2FA_EMAIL')
	def post(self, request):
		try:
			data = request.data
			username = data.get('user_name')
			email = data.get('mail')
			opt_code = data.get('opt')
			
			mail_logger.info("2FA email request received", extra={
				'email': email,
				'username': username
			})

			subject = "PongPong two factor Authentication"
			message = f"HELLO {username},\n\nenter this code to connect to PongPong\n\n{opt_code}"
			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [email] 
			
			send_mail(subject, message, from_email, recipient_list)
			
			# Log successful email sending
			log_mail_event(
				event_type='2FA_CODE_SENT',
				recipient=email,
				subject=subject,
				success=True,
				username=username,
				code_length=len(str(opt_code)) if opt_code else 0
			)
			
			# Return success message with proper JSON response
			return Response({"success": "Authentication code sent successfully"}, status=200)
		except BadHeaderError:
			log_mail_event(
				event_type='2FA_CODE_FAILED',
				recipient=data.get('mail'),
				subject="PongPong two factor Authentication",
				success=False,
				error_type='BadHeaderError',
				username=data.get('user_name')
			)
			return Response({"error": "Failed to send email due to invalid header."}, status=500)
		except Exception as e:
			log_mail_event(
				event_type='2FA_CODE_FAILED',
				recipient=data.get('mail'),
				subject="PongPong two factor Authentication",
				success=False,
				error_type=type(e).__name__,
				error_message=str(e),
				username=data.get('user_name')
			)
			mail_logger.error(f"Error sending 2FA email: {str(e)}", extra={
				'error': str(e),
				'error_type': type(e).__name__,
				'recipient': data.get('mail'),
				'username': data.get('user_name')
			})
			return Response({"error": f"Failed to send email: {str(e)}"}, status=500)
	
class send_temp_password(APIView):
	permission_classes = [AllowAny]

	@log_mail_api_request(action_type='SEND_TEMP_PASSWORD')
	def post(self, request):
		try:
			data = request.data
			username = data.get('user_name')
			email = data.get('mail')
			
			mail_logger.info("Temporary password email requested", extra={
				'email': email,
				'username': username
			})
			
			subject = 'PongPong temporary password'
			message = f"Hello {username},\n\nPlease find below your temporary password : {data.get('temp_password')}\n\nYou can now use it to log in to your account and change you password in your personnal settings"
			from_email = settings.DEFAULT_FROM_EMAIL
			recipient_list = [email]
			
			send_mail(subject, message, from_email, recipient_list)
			
			# Log successful email sending
			log_mail_event(
				event_type='TEMP_PASSWORD_SENT',
				recipient=email,
				subject=subject,
				success=True,
				username=username
			)
			
			return Response({"success": "temporary password sent"}, status=200)
		except BadHeaderError:
			log_mail_event(
				event_type='TEMP_PASSWORD_FAILED',
				recipient=data.get('mail'),
				subject="PongPong temporary password",
				success=False,
				error_type='BadHeaderError',
				username=data.get('user_name')
			)
			return Response({'error': "Failed to send temporary password"}, status=500)
		except Exception as e:
			log_mail_event(
				event_type='TEMP_PASSWORD_FAILED',
				recipient=data.get('mail'),
				subject="PongPong temporary password",
				success=False,
				error_type=type(e).__name__,
				error_message=str(e),
				username=data.get('user_name')
			)
			mail_logger.error(f"Error sending temporary password: {str(e)}", extra={
				'error': str(e),
				'error_type': type(e).__name__,
				'recipient': data.get('mail'),
				'username': data.get('user_name')
			})
			return Response({'error': "Failed to send temporary password"}, status=500)
		
