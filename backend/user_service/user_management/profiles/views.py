from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from .models import USER
from .utils import send_confirmation_email
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import json

# Create your views here.

def signup(request):

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
		return JsonResponse({'error': 'Unauthorized method'}, status=405)

	return JsonResponse({'succes': 'User successfully created', 'user_id': user.id},  status=200)
