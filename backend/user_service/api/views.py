from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import JsonResponse, FileResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import render
from django.conf import settings
import os
import json
import requests
import re
from .utils import setTheCookie
from .logging_utils import (
    log_api_request, log_authentication_event, log_external_request, log_validation_error, log_user_action, 
    log_file_operation, log_friend_action, log_password_change, log_search_action, api_logger as user_logger
)

@ensure_csrf_cookie
def get_csrf_token(request):
	return JsonResponse({"message": "CSRF cookie set"})

@log_api_request(action_type='USER_SIGNUP')
def signup(request):
    url_access_postgresql = "https://access_postgresql:4000/api/signup/"
    url_mail = "https://mail:4010/mail/confirm_singup/"

    if request.method != 'POST':
        user_logger.warning("Invalid method for signup", extra={'method': request.method})
        return JsonResponse({'create_user': {'error': 'Unauthorized method'}}, status=405)

    try:
        data = json.loads(request.body)
        log_user_action('signup_attempt', username=data.get('username', 'unknown'), 
                       email=data.get('mail', 'unknown'))
    except json.JSONDecodeError:
        log_validation_error('invalid_json', 'JSON decode error in signup request')
        return JsonResponse({'create_user': {'error': 'Invalid JSON'}}, status=400)

    len_for_fields = {'username':15, 'firstName':15, 'lastName':15, 'mail':50, 'password':255}
    required_fields = ['username', 'firstName', 'lastName', 'mail', 'password']
    for field in required_fields:
        if field not in data:
            log_validation_error('missing_field', f'Missing field: {field}', username=data.get('username'))
            return JsonResponse({'create_user': {'error': f'Missing field: {field}'}}, status=400)
        if not data[field]:
            log_validation_error('empty_field', f'Field {field} is empty', username=data.get('username'))
            return JsonResponse({'create_user': {'error': f'Field {field} cannot be empty'}}, status=400)
        if len(data[field]) > len_for_fields[field]:
            log_validation_error('field_too_long', f'Field {field} exceeds max length', username=data.get('username'))
            return JsonResponse({'create_user': {'error': f'Field {field} is too long max size is {len_for_fields[field]} character'}}, status=400)
        if len(data['password']) < 8:
            log_validation_error('password_too_short', 'Password too short', username=data.get('username'))
            return JsonResponse({'create_user': {'error': f'Field password is too short minimum body is 8 caracter'}}, status=400)
        if re.search(r'\s', data['username']):
            log_validation_error('username_whitespace', 'Username contains whitespace', username=data.get('username'))
            return JsonResponse({'create_user': {'error': 'Username cannot contain spaces or whitespace characters'}}, status=400)

    try:
        validate_email(data['mail'])
    except ValidationError:
        log_validation_error('invalid_email', 'Invalid email format', email=data['mail'], username=data.get('username'))
        return JsonResponse({'create_user': {'error':'Invalid e-mail address'}}, status=400)

    json_data = {
        "user_name":data['username'],
        "first_name":data['firstName'],
        "last_name":data['lastName'],
        "mail":data['mail'],
        "password":make_password(data['password'])
    }
    creat_user_status = False
    response_mail_status = False

    response_creat_user = requests.post(url_access_postgresql, json=json_data, verify=False, headers={'Host': 'localhost'})
    log_external_request('access_postgresql', 'POST', url_access_postgresql, 
                        status_code=response_creat_user.status_code, username=data['username'])
    
    try:
        data_response_create_user = response_creat_user.json()
    except ValueError:
        log_external_request('access_postgresql', 'POST', url_access_postgresql, 
                           error='Invalid JSON response', username=data['username'])
        data_response_create_user = {
            'error': 'Invalid response from access_postgresql service',
            'detail': response_creat_user.text
        }

    data_response_mail = None
    if response_creat_user.status_code == 200:
        creat_user_status = True
        log_user_action('user_created', username=data['username'], success=True)
        
        response_mail = requests.post(url_mail, json=json_data, verify=False, headers={'Host': 'mail'})
        log_external_request('mail', 'POST', url_mail, 
                           status_code=response_mail.status_code, username=data['username'])

        try:
            data_response_mail = response_mail.json()
        except ValueError:
            log_external_request('mail', 'POST', url_mail, 
                               error='Invalid JSON response', username=data['username'])
            data_response_mail = {
                'error': 'Invalid response from mail service',
                'detail': response_mail.text
            }
        if response_mail.status_code == 200:
            response_mail_status = True
            log_user_action('confirmation_email_sent', username=data['username'], success=True)
        else:
            log_user_action('confirmation_email_failed', username=data['username'], success=False)

    status_code = 200
    if response_mail_status == False or creat_user_status == False:
        status_code = 400

    return JsonResponse({
        'create_user': data_response_create_user,
        'send_mail': data_response_mail,
    }, status=status_code)


class infoUser(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_USER_INFO')
    def get(self, request):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            log_authentication_event('missing_token', success=False)
            return Response({'error': 'No access token'}, status=401)
        
        try:
            response = requests.get(
                'https://access_postgresql:4000/api/InfoUser/',
                verify=False,
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'GET', 'InfoUser', 
                               status_code=response.status_code)

            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', 'InfoUser', error=str(e))
            return Response({'error': 'Access to access_postgres failed'}, status=500)



class infoOtherUser(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_OTHER_USER_INFO')
    def get(self, request, username):
        token = request.COOKIES.get('access_token')

        try:
            response = requests.get(
                f'https://access_postgresql:4000/api/infoOtherUser/{username}/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost',
                }
            )
            
            log_external_request('access_postgresql', 'GET', f'infoOtherUser/{username}', 
                               status_code=response.status_code, target_user=username)
            
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', f'infoOtherUser/{username}', 
                               error=str(e), target_user=username)
            return Response({'error': 'Access to access_postgres failed'}, status=500)



class avatar(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_AVATAR')
    def get(self, request):
        token = request.COOKIES.get('access_token')
        
        if not token:
            log_authentication_event('missing_token', success=False)
            return JsonResponse({'error': 'No access token'}, status=401)
        
        try:
            response = requests.get(
                'https://access_postgresql:4000/api/InfoUser/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'GET', 'InfoUser', 
                               status_code=response.status_code, operation='avatar_fetch')
            
            if response.status_code != 200:
                log_file_operation('avatar_serve', success=False, 
                                 error_reason=f'User info request failed: {response.status_code}')
                return JsonResponse({'error': 'not authorized'}, status=401)
            
            try:
                data = response.json()
                path = data.get('avatar')
            except (ValueError, KeyError) as e:
                log_file_operation('avatar_serve', success=False, 
                                 error_reason=f'Invalid user data response: {str(e)}')
                return JsonResponse({'error': 'Invalid user data'}, status=500)
            
            if path:
                try:
                    full_path = os.path.join(settings.MEDIA_ROOT, 'imgs', path)
                    log_file_operation('avatar_serve', filename=path, success=True)
                    return FileResponse(open(full_path, 'rb'), content_type='image/png')
                except (OSError, IOError) as e:
                    log_file_operation('avatar_serve', filename=path, success=False, 
                                     error_reason=f'File access error: {str(e)}')
                    return JsonResponse({'error': 'Avatar file not found'}, status=404)
            else:
                log_file_operation('avatar_serve', success=False, error_reason='No avatar path in user data')
                return JsonResponse({'error': 'No avatar set'}, status=404)
                
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', 'InfoUser', error=str(e))
            return Response({'error': 'Access to access_postgres failed'}, status=500)

class avatarOther(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_OTHER_AVATAR')
    def get(self, request, username):
        token = request.COOKIES.get('access_token')

        if not token:
            log_authentication_event('missing_token', success=False)
            return JsonResponse({'error': 'No access token'}, status=401)

        try:
            response = requests.get(
                f'https://access_postgresql:4000/api/infoOtherUser/{username}/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'GET', f'infoOtherUser/{username}', 
                               status_code=response.status_code, target_user=username, 
                               operation='avatar_fetch')
            
            if response.status_code != 200:
                log_file_operation('other_avatar_serve', success=False, target_user=username,
                                 error_reason=f'User info request failed: {response.status_code}')
                return JsonResponse({'error': 'not authorized'}, status=401)

            try:
                data = response.json()
                path = data.get('avatar')
            except (ValueError, KeyError) as e:
                log_file_operation('other_avatar_serve', success=False, target_user=username,
                                 error_reason=f'Invalid user data response: {str(e)}')
                return JsonResponse({'error': 'Invalid user data'}, status=500)
            
            if path:
                try:
                    full_path = os.path.join(settings.MEDIA_ROOT, 'imgs', path)
                    log_file_operation('other_avatar_serve', filename=path, success=True, target_user=username)
                    return FileResponse(open(full_path, 'rb'), content_type='image/png')
                except (OSError, IOError) as e:
                    log_file_operation('other_avatar_serve', filename=path, success=False, target_user=username,
                                     error_reason=f'File access error: {str(e)}')
                    return JsonResponse({'error': 'Avatar file not found'}, status=404)
            else:
                log_file_operation('other_avatar_serve', success=False, target_user=username, 
                                 error_reason='No avatar path in user data')
                return JsonResponse({'error': 'No avatar set'}, status=404)
                
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', f'infoOtherUser/{username}', 
                               error=str(e), target_user=username)
            return Response({'error': 'Access to access_postgres failed'}, status=500)



class saveImg(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='UPLOAD_AVATAR')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        url_access = "https://access_postgresql:4000/api/uploadImgAvatar/"
        image = request.FILES.get('image')

        if not image:
            log_file_operation('avatar_upload', success=False, error_reason='No image provided')
            return JsonResponse({'error': 'Save image.'}, status=400)
        
        max_size = 2 * 1024 * 1024
        if image.size > max_size:
            log_file_operation('avatar_upload', filename=image.name, file_size=image.size, 
                             success=False, error_reason='File too large')
            return JsonResponse({'error': 'Image file is too large (max 2MB)'}, status=413)
        
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'imgs')
        image_path = os.path.join(upload_dir, image.name)

        try:
            with open(image_path, 'wb+') as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
            
            log_file_operation('avatar_save_local', filename=image.name, file_size=image.size, success=True)
        except Exception as e:
            log_file_operation('avatar_save_local', filename=image.name, file_size=image.size, 
                             success=False, error_reason=str(e))
            return JsonResponse({'error': 'Failed to save file locally'}, status=500)

        json_data = {
            'new_path': image.name
        }
        try:
            response = requests.post(url_access, json=json_data, verify=False, 
                                   headers={'Host': 'localhost', 'Authorization': f"bearer {token}"})
            
            log_external_request('access_postgresql', 'POST', 'uploadImgAvatar', 
                               status_code=response.status_code, filename=image.name)
            
            if response.status_code == 200:
                log_file_operation('avatar_upload', filename=image.name, file_size=image.size, success=True)
            else:
                log_file_operation('avatar_upload', filename=image.name, file_size=image.size, success=False)

            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'POST', 'uploadImgAvatar', error=str(e))
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)



class savePrivateInfo(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='UPDATE_PRIVATE_INFO')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        url_access = "https://access_postgresql:4000/api/uploadPrivateInfoUser/"

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            log_validation_error('invalid_json', 'JSON decode error in private info update')
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not data.get('firstName', '').strip():
            log_validation_error('empty_first_name', 'First name is empty in private info update')
            return JsonResponse({'error': 'firstName is empty'}, status=400)

        if not data.get('lastName', '').strip():
            log_validation_error('empty_last_name', 'Last name is empty in private info update')
            return JsonResponse({'error': 'lastName is empty'}, status=400)

        try:
            response = requests.patch(url_access, json=data, verify=False, 
                                    headers={'Host': 'localhost', 'Authorization': f"bearer {token}"})
            
            log_external_request('access_postgresql', 'PATCH', 'uploadPrivateInfoUser', 
                               status_code=response.status_code)
            
            if response.status_code == 200:
                log_user_action('private_info_update', success=True)
            else:
                log_user_action('private_info_update', success=False)

            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'PATCH', 'uploadPrivateInfoUser', error=str(e))
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)



class saveProfile(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='UPDATE_PROFILE')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        url_access = "https://access_postgresql:4000/api/uploadProfile/"

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            log_validation_error('invalid_json', 'JSON decode error in profile update')
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not data.get('userName', '').strip():
            log_validation_error('empty_username', 'Username is empty in profile update')
            return JsonResponse({'error': 'userName is empty'}, status=400)

        # Username validation - check for whitespace
        username = data.get('userName', '')
        if re.search(r'\s', username):
            log_validation_error('username_whitespace', 'Username contains whitespace in profile update',
                               username=username)
            return JsonResponse({'error': 'Username cannot contain spaces or whitespace characters'}, status=400)

        try:
            response = requests.patch(url_access, json=data, verify=False, 
                                    headers={'Host': 'localhost', 'Authorization': f"bearer {token}"})
            
            log_external_request('access_postgresql', 'PATCH', 'uploadProfile', 
                               status_code=response.status_code, username=username)

            response_data = response.json()
            
            if response.status_code == 200:
                log_user_action('profile_update', username=username, success=True)
            else:
                log_user_action('profile_update', username=username, success=False)

            return setTheCookie(
                JsonResponse({'success': 'Successfully changed username'}, status=response.status_code),
                response_data.get('access'),
                response_data.get('refresh')
            )

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'PATCH', 'uploadProfile', error=str(e))
            return JsonResponse({'error': 'Internal request failed', 'details': str(e)}, status=500)

class saveNewPassword(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='CHANGE_PASSWORD')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        url_access = "https://access_postgresql:4000/api/uploadNewPassword/"

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            log_validation_error('invalid_json', 'JSON decode error in password change')
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
        newPassword = data.get('inputPasswordNew')
        json_data = {
            'password':data.get('inputPasswordCurrent')
        }

        checkResponse = requests.post("https://access_postgresql:4000/api/checkCurrentPassword/", 
                                    json=json_data, verify=False, 
                                    headers={'Host': 'localhost', 'Authorization': f"bearer {token}"})
        
        log_external_request('access_postgresql', 'POST', 'checkCurrentPassword', 
                           status_code=checkResponse.status_code)

        if (checkResponse.status_code != 200):
            log_password_change(success=False, error_reason='current_password_invalid')
            return JsonResponse({'error': 'Current password is not valid'}, status=401)
            
        if newPassword != data.get('inputPasswordNew2'):
            log_password_change(success=False, error_reason='password_mismatch')
            return JsonResponse({'error': 'New password do not match'}, status=400)
        elif (len(newPassword) < 8):
            log_password_change(success=False, error_reason='password_too_short')
            return JsonResponse({'error': 'New password is too short minimum body is 8 caracter'}, status=400)

        json_data_newPassword = {
            "password":make_password(newPassword)
        }

        uploadResponse = requests.patch(url_access, json=json_data_newPassword, verify=False, 
                                      headers={'Host': 'localhost', 'Authorization': f"bearer {token}"})
        
        log_external_request('access_postgresql', 'PATCH', 'uploadNewPassword', 
                           status_code=uploadResponse.status_code)

        if (uploadResponse.status_code != 200):
            log_password_change(success=False, error_reason='server_error')
            return JsonResponse({'error': 'Error witch save new password'}, status=400)
            
        log_password_change(success=True)
        return JsonResponse({'success': 'Successfully saved new password'}, status=200)


class searchUsers(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='SEARCH_USERS')
    def get(self, request):
        token = request.COOKIES.get('access_token')
        query = request.GET.get('q', '')

        if not query:
            log_search_action('user_search', query='', results_count=0)
            return JsonResponse({'results': []}, status=200)
        
        try:
            response = requests.get(
                f'https://access_postgresql:4000/api/searchUsers?q={query}',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'GET', 'searchUsers', 
                               status_code=response.status_code, search_query=query)

            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                log_search_action('user_search', query=query, results_count=len(results))
                return JsonResponse({'results': results}, status=200)
            else:
                log_search_action('user_search', query=query, success=False)
                return JsonResponse({'error': 'Failed to fetch users'}, status=response.status_code)
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', 'searchUsers', error=str(e))
            return Response({'error': 'Access to access_postgres for search users failed'}, status=500)


class listennerFriends(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_FRIENDS')
    def get(self, request):
        token = request.COOKIES.get('access_token')

        try:
            response = requests.get(
                'https://access_postgresql:4000/api/listennerFriends/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'GET', 'listennerFriends', 
                               status_code=response.status_code)
            
            if response.status_code == 200:
                data = response.json()
                log_user_action('friends_list', 'SUCCESS', extra_data={'data_keys': list(data.keys())})
            else:
                log_user_action('friends_list', 'FAILED', error=f'External service error: {response.status_code}')
            
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', 'listennerFriends', error=str(e))
            return Response(
                {'error': f'Access to access_postgres for search friends: {str(e)}'},
                status=500
            )



class addFriend(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='ADD_FRIEND')
    def post(self, request):
        token = request.COOKIES.get('access_token')
        data = request.data

        username = data.get('userName')

        if not username:
            log_friend_action('add_friend', 'FAILED', error='Username is empty')
            return JsonResponse({'error': "username is empty"}, status=400)

        json_data = {
            'userName':username,
		}

        try:
            response = requests.post(
                'https://access_postgresql:4000/api/add/friend/',
                json=json_data,
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                }
            )
            
            log_external_request('access_postgresql', 'POST', 'add/friend', 
                               status_code=response.status_code, target_user=username)
            
            if response.status_code == 200:
                log_friend_action('add_friend', 'SUCCESS', target_user=username)
            else:
                log_friend_action('add_friend', 'FAILED', target_user=username, 
                                error=f'External service error: {response.status_code}')
            
            return JsonResponse(response.json(), status=response.status_code)
        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'POST', 'add/friend', error=str(e), target_user=username)
            return Response({'error': 'Access to access_postgres add friend'}, status=500)


class declineInvite(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='DECLINE_INVITE')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        username = request.data.get('username')

        if not username:
            log_friend_action('decline_invite', 'FAILED', error='Username is empty')
            return JsonResponse({'error': "username is empty"}, status=400)

        json_data = {
            'username':username
        }

        try:
            response = requests.patch(
                'https://access_postgresql:4000/api/declineInvite/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                },
                json=json_data,
            )
            
            log_external_request('access_postgresql', 'PATCH', 'declineInvite', 
                               status_code=response.status_code, target_user=username)
            
            if response.status_code == 200:
                log_friend_action('decline_invite', 'SUCCESS', target_user=username)
            else:
                log_friend_action('decline_invite', 'FAILED', target_user=username, 
                                error=f'External service error: {response.status_code}')
            
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'PATCH', 'declineInvite', error=str(e), target_user=username)
            return Response(
                {'error': f'Access to access_postgres for search friends: {str(e)}'},
                status=500
            )


class deleteFriends(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='DELETE_FRIEND')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        username = request.data.get('username')

        if not username:
            log_friend_action('delete_friend', 'FAILED', error='Username is empty')
            return JsonResponse({'error': "username is empty"}, status=400)

        json_data = {
            'username':username
        }

        try:
            response = requests.patch(
                'https://access_postgresql:4000/api/deleteFriends/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                },
                json=json_data,
            )
            
            log_external_request('access_postgresql', 'PATCH', 'deleteFriends', 
                               status_code=response.status_code, target_user=username)
            
            if response.status_code == 200:
                log_friend_action('delete_friend', 'SUCCESS', target_user=username)
            else:
                log_friend_action('delete_friend', 'FAILED', target_user=username, 
                                error=f'External service error: {response.status_code}')
            
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'PATCH', 'deleteFriends', error=str(e), target_user=username)
            return Response(
                {'error': f'Access to access_postgres for search friends: {str(e)}'},
                status=500
            )


class acceptInvite(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='ACCEPT_INVITE')
    def patch(self, request):
        token = request.COOKIES.get('access_token')
        username = request.data.get('username')

        if not username:
            log_friend_action('accept_invite', 'FAILED', error='Username is empty')
            return JsonResponse({'error': "username is empty"}, status=400)

        json_data = {
            'username':username
        }

        try:
            response = requests.patch(
                'https://access_postgresql:4000/api/acceptInvite/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                },
                json=json_data,
            )
            
            log_external_request('access_postgresql', 'PATCH', 'acceptInvite', 
                               status_code=response.status_code, target_user=username)
            
            if response.status_code == 200:
                log_friend_action('accept_invite', 'SUCCESS', target_user=username)
            else:
                log_friend_action('accept_invite', 'FAILED', target_user=username, 
                                error=f'External service error: {response.status_code}')
            
            return Response(response.json(), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'PATCH', 'acceptInvite', error=str(e), target_user=username)
            return Response(
                {'error': f'Access to access_postgres for search friends: {str(e)}'},
                status=500
            )

class matchHistory(APIView):
    permission_classes = [AllowAny]

    @log_api_request(action_type='GET_MATCH_HISTORY')
    def get(self, request):
        token = request.COOKIES.get('access_token')
    
        try:
            response = requests.get(
                'https://access_postgresql:4000/api/matchHistory/',
                verify=False,
                headers={
                    'Authorization': f"bearer {token}",
                    'Host': 'localhost'
                },
            )
            
            log_external_request('access_postgresql', 'GET', 'matchHistory', 
                               status_code=response.status_code)
            
            res = requests.get('https://access_postgresql:4000/api/DecodeJwt/', 
                             headers={"Authorization" : f"bearer {token}", 'Host': 'localhost'}, 
                             verify=False)
            
            log_external_request('access_postgresql', 'GET', 'DecodeJwt', 
                               status_code=res.status_code)

            if response.status_code == 200:
                match_data = response.json().get("result", [])
                log_user_action('match_history', 'SUCCESS', extra_data={'matches_count': len(match_data)})
            else:
                log_user_action('match_history', 'FAILED', error=f'External service error: {response.status_code}')

            return Response(response.json().get("result"), status=response.status_code)

        except requests.exceptions.RequestException as e:
            log_external_request('access_postgresql', 'GET', 'matchHistory', error=str(e))
            return Response(
                {'error': f'Access to access_postgres for matchHistory: {str(e)}'},
                status=500
            )

