from django.http import JsonResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render
import json
import requests
# Create your views here.

@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({"message": "CSRF cookie set"})


def signup(request):
    url_access_postgresql = "https://access-postgresql:4000/api/signup/"
    url_mail = "https://mail:4010/mail/confirm_singup/"

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

    json_data = {
        "user_name":data['username'],
        "first_name":data['firstName'],
        "last_name":data['lastName'],
        "mail":data['mail'],
        "password":make_password(data['password'])
    }
    response_creat_user = requests.post(url_access_postgresql, json=json_data, verify=False, headers={'Host': 'access-postgresql'})
    response_mail = requests.post(url_mail, json=json_data, verify=False, headers={'Host': 'mail'})

    try:
        data_response_create_user = response_creat_user.json()
    except ValueError:
        data_response_create_user = {
            'error': 'Invalid response from access_postgresql service',
            'detail': response_creat_user.text
        }

    try:
        data_response_mail = response_mail.json()
    except ValueError:
        data_response_mail = {
            'error': 'Invalid response from mail service',
            'detail': response_mail.text
        }

    return JsonResponse({
        'create_user': data_response_create_user,
        'send_mail': data_response_mail,
    }, status=200)

