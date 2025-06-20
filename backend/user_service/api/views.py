from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import JsonResponse, FileResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render
import sys
from django.conf import settings
import os
import json
import requests

# Create your views here.
@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({"message": "CSRF cookie set"})

@ensure_csrf_cookie
def signup(request):
    url_access_postgresql = "https://access-postgresql:4000/api/signup/"
    url_mail = "https://mail:4010/mail/confirm_singup/"

    if request.method != 'POST':
        return JsonResponse({'create_user': {'error': 'Unauthorized method'}}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'create_user': {'error': 'Invalid JSON'}}, status=400)

    len_for_fields = {'username':15, 'firstName':15, 'lastName':15, 'mail':50, 'password':255}
    required_fields = ['username', 'firstName', 'lastName', 'mail', 'password']
    for field in required_fields:
        if field not in data:
            return JsonResponse({'create_user': {'error': f'Missing field: {field}'}}, status=400)
        if not data[field]:
            return JsonResponse({'create_user': {'error': f'Field {field} cannot be empty'}}, status=400)
        if len(data[field]) > len_for_fields[field]:
            return JsonResponse({'create_user': {'error': f'Field {field} is too long max body is {len_for_fields[field]} character'}}, status=400)
        if len(data['password']) < 8:
            return JsonResponse({'create_user': {'error': f'Field password is too short minimum body is 8 caracter'}}, status=400)

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
    creat_user_status = False
    response_mail_status = False

    response_creat_user = requests.post(url_access_postgresql, json=json_data, verify=False, headers={'Host': 'access-postgresql'})
    try:
        data_response_create_user = response_creat_user.json()
    except ValueError:
        data_response_create_user = {
            'error': 'Invalid response from access_postgresql service',
            'detail': response_creat_user.text
        }

    data_response_mail = None
    if response_creat_user.status_code == 200:
        creat_user_status = True
        response_mail = requests.post(url_mail, json=json_data, verify=False, headers={'Host': 'mail'})

        try:
            data_response_mail = response_mail.json()
        except ValueError:
            data_response_mail = {
                'error': 'Invalid response from mail service',
                'detail': response_mail.text
            }
        if response_mail.status_code == 200:
            response_mail_status = True

    status_code = 200
    if response_mail_status == False or creat_user_status == False:
        status_code = 400

    return JsonResponse({
        'create_user': data_response_create_user,
        'send_mail': data_response_mail,
    }, status=status_code)


class infoUser(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.headers.get('Authorization')
        
        try:
            response = requests.get(
                'https://access-postgresql:4000/api/InfoUser/',
                verify=False,
                headers={
                    'Authorization': token,
                    'Host': 'access-postgresql'
                }
            )
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException:
            return Response({'error': 'Access to access_postgres failed'}, status=500)
        

class avatar(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.headers.get('Authorization')
        
        try:
            response = requests.get(
                'https://access-postgresql:4000/api/InfoUser/',
                verify=False,
                headers={
                    'Authorization': token,
                    'Host': 'access-postgresql'
                }
            )
            data = response.json()
            path = data['avatar']
            if path:
                full_path = os.path.join(settings.MEDIA_ROOT + 'imgs', path)
                return FileResponse(open(full_path, 'rb'), content_type='image/png')
            else:
                return JsonResponse({'error': 'not authorized'}, status=401)
        except requests.exceptions.RequestException:
            return Response({'error': 'Access to access_postgres failed'}, status=500)



class saveImg(APIView):
    permission_classes = [AllowAny]

    def patch(self, request):
        token = request.headers.get('Authorization')
        url_access = "https://access-postgresql:4000/api/uploadImgAvatar/"
        image = request.FILES.get('image')

        if not image:
            return JsonResponse({'error': 'Save image.'}, status=400)
        
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'imgs')
        image_path = os.path.join(upload_dir, image.name)

        with open(image_path, 'wb+') as destination:
            for chunk in image.chunks():
                destination.write(chunk)

        json_data = {
            'new_path': image.name
        }
        try:
            response = requests.post(url_access, json=json_data, verify=False, headers={'Host': 'access-postgresql', 'Authorization': token})

            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)



class savePrivateInfo(APIView):
    permission_classes = [AllowAny]

    def patch(self, request):
        token = request.headers.get('Authorization')
        url_access = "https://access-postgresql:4000/api/uploadPrivateInfoUser/"

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not data.get('firstName', '').strip():
            return JsonResponse({'error': 'firstName is empty'}, status=400)

        if not data.get('lastName', '').strip():
            return JsonResponse({'error': 'lastName is empty'}, status=400)

        try:
            response = requests.patch(url_access, json=data, verify=False, headers={'Host': 'access-postgresql', 'Authorization': token})

            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)



class saveProfile(APIView):
    permission_classes = [AllowAny]

    def patch(self, request):
        token = request.headers.get('Authorization')
        url_access = "https://access-postgresql:4000/api/uploadProfile/"

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not data.get('userName', '').strip():
            return JsonResponse({'error': 'userName is empty'}, status=400)

        #if not data.get('mail', '').strip():
        #    return JsonResponse({'error': 'mail is empty'}, status=400)
        try:
            response = requests.patch(url_access, json=data, verify=False, headers={'Host': 'access-postgresql', 'Authorization': token})

            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)

class saveNewPassword(APIView):
    permission_classes = [AllowAny]

    def patch(self, request):
        token = request.headers.get('Authorization')
        url_access = "https://access-postgresql:4000/api/uploadNewPassword/"


        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
        newPassword = data.get('inputPasswordNew')
        json_data = {
            'password':data.get('inputPasswordCurrent')
        }

        checkResponse = requests.post("https://access-postgresql:4000/api/checkCurrentPassword/", json=json_data, verify=False, headers={'Host': 'access-postgresql', 'Authorization': token})

        if (checkResponse.status_code != 200):
            return JsonResponse({'error': 'Current password is not valid'}, status=400)
        if newPassword != data.get('inputPasswordNew2'):
            return JsonResponse({'error': 'New password do not match'}, status=400)
        elif (len(newPassword) < 8):
            return JsonResponse({'error': 'New password is too short minimum body is 8 caracter'}, status=400)

        json_data_newPassword = {
            "password":make_password(newPassword)
        }

        uploadResponse = requests.patch(url_access, json=json_data_newPassword, verify=False, headers={'Host': 'access-postgresql', 'Authorization': token})

        if (uploadResponse.status_code != 200):
            return JsonResponse({'error': 'Error witch save new password'}, status=400)
        
        return JsonResponse({'success': 'Successfully saved new password'}, status=200)