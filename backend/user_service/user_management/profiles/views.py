from .utils import send_confirmation_email
from .utils import generate_otp_send_mail
from .models import USER
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password
from django.http import JsonResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import ensure_csrf_cookie
import json

# Create your views here.

def login(request):
	print("Requête reçue :", request.method)
	if (request.method == 'POST'):
		try:
			data = json.loads(request.body)
		except KeyError as e:
			return JsonResponse({'error': f'Missing field : {str(e)}'}, status=400)
		
		try:
			user = USER.objects.get(mail=data.get('mail'))
			if check_password(data.get('password'), user.password):
				user.two_factor_Auth = make_password(generate_otp_send_mail(user))
				user.online = True
				user.save()
				return JsonResponse({'succes': 'Login successful', 'user_id': user.id}, status=200)
			else:
				return JsonResponse({'error': 'Invalid password'}, status=401)
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)
	else:
		return JsonResponse({'error': 'Unauthorized'}, status=405)


def signup(request):
	print("Méthode reçue :", request.method)

	if request.method == 'POST':
		try:

			data = json.loads(request.body)

			email = data.get('mail')
			validate_email(email)

			user = USER.objects.create(
				user_name = data['username'],
				first_name = data['firstName'],
				last_name = data['lastName'],
				mail = data['mail'],
				password = make_password(data['password'])
			)

		except KeyError as e:
			return JsonResponse({'error': f'Missing field : {str(e)}'}, status=400)
		except ValidationError:
			return JsonResponse({'error': 'Invalid e-mail address'}, status=400)

		try:
			send_confirmation_email(user)
		except Exception as e:
			return JsonResponse({'error': f'for sending mail: {str(e)} {user.user_name}'}, status=400)
	
	else:
		return JsonResponse({'error': 'Unauthorized method dede'}, status=405)

	return JsonResponse({'succes': 'User successfully created', 'user_id': user.id},  status=200)

@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({"message": "CSRF cookie set"})