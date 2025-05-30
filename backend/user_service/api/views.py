from .utils import send_confirmation_email
from .models import USER
from django.http import JsonResponse
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import IntegrityError, transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render
import json
import logging
# Create your views here.


@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({"message": "CSRF cookie set"})


def signup(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Unauthorized method'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    len_for_filds = {'username':15, 'firstName':15, 'lastName':15, 'mail':50, 'password':255}
    required_fields = ['username', 'firstName', 'lastName', 'mail', 'password']
    for field in required_fields:
        if field not in data:
            return JsonResponse({'error': f'Missing field: {field}'}, status=400)
        if not data[field]:
            return JsonResponse({'error': f'Field {field} cannot be empty'}, status=400)
        if len(data[field]) > len_for_filds[field]:
            return JsonResponse({'error': f'Field {field} is too long max body is {len_for_filds[field]} caracter'}, status=400)
        if len(data['password']) < 8:
            return JsonResponse({'error': f'Field password is too short minimum body is 8 caracter'}, status=400)
        

    try:
        validate_email(data['mail'])
    except ValidationError:
        return JsonResponse({'error': 'Invalid e-mail address'}, status=400)

    try:
        with transaction.atomic():
            user = USER.objects.create(
                user_name=data['username'],
                first_name=data['firstName'],
                last_name=data['lastName'],
                mail=data['mail'],
                password=make_password(data['password'])
            )
            send_confirmation_email(request, user)
    except IntegrityError as e:
        err_msg = str(e)
        if 'mail' in err_msg:
           return JsonResponse({'error': 'User with this email already exists'}, status=400)
        elif 'user_name' in err_msg:
            return JsonResponse({'error': 'Username already taken'}, status=400)
        else:
            return JsonResponse({'error': 'Integrity error', 'details': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'Unexpected error while creating user or sending email',
            'details': str(e),
        }, status=500)

    return JsonResponse({'success': 'User successfully created', 'user_id': user.id}, status=200)


logger = logging.getLogger(__name__)

def activate_account(request, uidb64, token):
    User = get_user_model()

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
            return render(request, "account_actived.html")
        else:
            return render(request, "account_already_actived.html")
    else:
        logger.warning("Activation link invalid or expired.")
        return render(request, "token_expired.html")


