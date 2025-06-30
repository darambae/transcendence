from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import check_password, make_password
from django.utils.encoding import force_str
from .utils import generate_otp_send_mail, generateJwt
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from .models import USER, ChatGroup, Message, FRIEND, MATCHTABLE
from django.http import JsonResponse
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.dateformat import format
import json
import logging
from datetime import datetime
from django.core.paginator import Paginator, EmptyPage
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import sys
import jwt
from django.conf import settings
# Create your views here.


try:
    from .models import USER, ChatGroup, Message, MATCHTABLE
except ImportError:
    # Fallback/Error handling if models are not correctly configured
    # In a real application, you'd want to ensure models are correctly imported.
    logging.error("Failed to import models (USER, ChatGroup, Message) in access_postgresql/views.py. "
                  "Please ensure your models are defined and accessible.")
    # You might want to raise an exception or handle this more gracefully
    # depending on your application's setup.
    class USER: # Dummy classes to prevent NameError if import fails
        objects = None
    class ChatGroup:
        objects = None
    class Message:
        objects = None
    class MATCHTABLE:
        objects = None
		

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
			'token':token,
			'user_name': user.user_name,
			'mail': user.mail
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
			if not user.activated:
				user.activated = True
				user.save()
				logger.info(f"User {user.mail} activated successfully.")

				return JsonResponse({'html': 'account_activated.html'}, status=200)
			else:
				return JsonResponse({'html': 'account_already_activated.html'}, status=200)
		else:
			logger.warning("Activation link invalid or expired.")
			return JsonResponse({'html': 'token_expired.html'}, status=200)

class checkPassword(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data

		try:
			user = USER.objects.get(mail=data.get('mail'))
			if user.activated:
				if check_password(data.get('password'), user.password):
					# opt = generate_otp_send_mail(user)
					opt = "NZHK-GO7Q-9JSD-X9QI"
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


class checkCurrentPassword(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):

		try:
			user = request.user
			data = request.data
			password = data.get('password')

			if check_password(password, user.password):
				return JsonResponse({'success': 'Valid password'}, status=200)
			else:
				return JsonResponse({'error': 'Invalid password'}, status=401)

		except Exception as e:
			return JsonResponse({'error': f'Error checking current password : {str(e)}'}, status=400)




class checkTfa(APIView):
	permission_classes = [AllowAny]

	def post(self, request):

		data = request.data
		print(f"data : {data}, type name : {type(data).__name__}", file=sys.stderr)

		try:
			if "jwt" in data :
				print(f"invites : {data['jwt']}", file=sys.stderr)
				user = USER.objects.get(mail=data.get('mail'))
				if user.activated and user.two_factor_auth != None:
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
				if user.activated and user.two_factor_auth != None:
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
			"created_at": format(user.created_at, 'Y-m-d  H:i'),
			"last_login": format(user.last_login, 'Y-m-d  H:i') if user.last_login else None,
			"avatar": user.avatar,
        })


class infoOtherUser(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        user = get_object_or_404(USER, user_name=username)
        me = request.user

        friend_relation = FRIEND.objects.filter(
            (Q(from_user=me) & Q(to_user=user)) | (Q(from_user=user) & Q(to_user=me)),
            status__in=['pending', 'accepted']
        ).first()

        if friend_relation:
            friend_status = friend_relation.status
        else:
            friend_status = None

        user_matches = MATCHTABLE.objects.filter(
            Q(username1=user.user_name) | Q(username2=user.user_name)
        )

        total_matches = user_matches.count()

        wins = 0
        losses = 0

        for match in user_matches:
            if match.username1 == user.user_name:
                if match.score1 > match.score2:
                    wins += 1
                elif match.score1 < match.score2:
                    losses += 1
            elif match.username2 == user.user_name:
                if match.score2 > match.score1:
                    wins += 1
                elif match.score2 < match.score1:
                    losses += 1


        data = {
            "id": user.id,
            "user_name": user.user_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "mail": user.mail,
            "online": user.online,
            "created_at": format(user.created_at, 'Y-m-d  H:i'),
            "last_login": format(user.last_login, 'Y-m-d  H:i') if user.last_login else None,
            "avatar": user.avatar,
            "friend_status": friend_status,
			"total_games": total_matches,
			"game_wins": wins,
			"game_losses": losses
        }

        return Response(data, status=200)



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
					username2 = data['username2'],
					winner = data['winner'],
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

class uploadImgAvatar(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            data = request.data

            new_avatar = data.get('new_path')
            if not new_avatar:
                return JsonResponse({'error': 'Missing new_path in request'}, status=400)

            user.avatar = new_avatar
            user.save()

            return JsonResponse({'success': 'Successfully saved avatar image'}, status=200)
        except Exception as e:
            return JsonResponse({'error': f'Error saving avatar image: {str(e)}'}, status=400)
		
class uploadPrivateInfoUser(APIView):
	permission_classes = [IsAuthenticated]
    
	def patch(self, request):

		try:
			user = request.user
			data = request.data

			user.first_name = data.get('firstName')
			user.last_name = data.get('lastName')
			user.save()

			return JsonResponse({'success': 'Successfully saved avatar image'}, status=200)
		except Exception as e:
			return JsonResponse({'error': f'Error saving avatar image: {str(e)}'}, status=400)


class uploadProfile(APIView):
	permission_classes = [IsAuthenticated]

	def patch(self, request):

		try:
			user = request.user
			data = request.data
			new_username = data.get('userName')

			User = get_user_model()

			if User.objects.filter(Q(user_name=new_username) & ~Q(id=user.id)).exists():
				return JsonResponse({'error': 'This username is already taken'}, status=409)
			user.user_name = new_username
			user.save()

			return JsonResponse({'success': 'Successfully saved avatar image'}, status=200)
		except Exception as e:
			return JsonResponse({'error': f'Error saving avatar image: {str(e)}'}, status=400)


class uploadNewPassword(APIView):
	permission_classes = [IsAuthenticated]

	def patch(self, request):
		try:
			user = request.user
			data = request.data
			newPassword = data.get('password')

			user.password = newPassword
			user.save()

			return JsonResponse({'success': 'Successfully saved new password'}, status=200)

		except Exception as e:
			return JsonResponse({'error': f'Error saving new password : {str(e)}'}, status=400)


class searchUsers(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		query = request.GET.get('q', '')
		me = request.user

		users = USER.objects.filter(user_name__icontains=query).exclude(user_name=me.user_name)[:3]
		results = []

		for user in users:
			results.append({
				'id': user.id,
				'username': user.user_name,
			})
		return JsonResponse({'results': results}, status=200)
# --- Chat-Related Views (Directly interacting with DB and Channels) ---

class ChatGroupListCreateView(APIView):
    """
    API endpoint to list existing chat groups for the authenticated user (GET)
    and to create or retrieve new 1-to-1 chat groups (POST).
    """
    permission_classes = [IsAuthenticated]  # Ensure only authenticated users can list/create chats

    def get(self, request) -> Response:
        """
        Lists chat groups for the currently authenticated user.
        """
        current_user = request.user
        logger.info(f"Retrieving chat groups for user {current_user.user_name}")
        
        try:
            # Get chat groups where the current user is a member
            chat_groups_qs = ChatGroup.objects.filter(members=current_user).prefetch_related('members').order_by('-id')

            chat_list_data = []
            if chat_groups_qs.exists():
                for group in chat_groups_qs:
                    # For 1-to-1 chats, find the other participant
                    other_members = group.members.exclude(id=current_user.id)
                    other_username = None

                    if group.members.count() == 2 and other_members.exists():
                        # True 1-to-1 chat
                        other_username = other_members.first().user_name
                    elif group.members.count() > 2:
                        # Group chat: show group name or a comma-separated list of members (excluding self)
                        other_username = ", ".join(m.user_name for m in other_members)
                    else:
                        # Only self in group (should not happen)
                        other_username = "Unknown User"
                        logger.warning(f"Chat group {group.id} for user {current_user.user_name} has no other members.")

                    chat_list_data.append({
                        'group_id': group.id,
                        'receiver': other_username,
						'group_name': group.name,  # Include group name for clarity
                    })
            else:
                logger.info(f"No chat groups found for user {current_user.user_name}.")
            return Response({'status': 'success', 'chats': chat_list_data}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Internal server error during chat list retrieval.")
            return Response(
                {'status': 'error', 'message': 'Internal server error during chat list retrieval.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    def post(self, request) -> Response:
        """
        Creates or retrieves a private chat group between the authenticated user
        and a target user.
        """
        current_user = request.user  # Authenticated user
        data = request.data
        target_username = data.get('target_username')

        if not target_username:
            return Response({'status': 'error', 'message': 'Target username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if current_user.user_name == target_username:
            return Response(
                {'status': 'error', 'message': 'Cannot create a chat with yourself.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get the target user (must exist)
            target_user = USER.objects.get(user_name=target_username)

            # Ensure consistent group name generation (e.g., "private_ID1_ID2")
            participants_usernames = sorted([current_user.user_name, target_user.user_name])
            group_name = f"chat_{participants_usernames[0]}&{participants_usernames[1]}"

            # Atomically create or get the chat group and add members
            chat_group, created_group = ChatGroup.objects.get_or_create(
                name=group_name,
            )
            # If the group was just created, log and add members
            if created_group:
                logger.info(f"Created new chat group '{group_name}' for users {current_user.user_name} and {target_user.user_name}.")
                chat_group.members.add(current_user, target_user)
            # chat_group.members.add(current_user, target_user)

            return Response(
                {'status': 'success', 'group_id': chat_group.id, 'group_name': chat_group.name},
                status=status.HTTP_200_OK
            )
        except USER.DoesNotExist:
            return Response({'status': 'error', 'message': 'Target user not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Internal server error during chat group operation.")
            return Response(
                {'status': 'error', 'message': 'Internal server error during chat group operation.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ===============================================================
# 3. Chat Message Send & History View
# Handles: GET & POST /api/chat/<int:group_id>/messages/
# ===============================================================
class ChatMessageView(APIView):
    """
    API endpoint to retrieve chat message history for a specific group.
    Supports pagination using offset and limit.
    """
    permission_classes = [IsAuthenticated]  # Only authenticated users can access history

    def get(self, request, group_id: int) -> Response:
        """
        Retrieves a paginated list of messages for a given chat group.
        Ensures the requesting user is a member of the group.
        """
        current_user = request.user  # Authenticated user
        offset_str = request.query_params.get('offset', '0')
        limit_str = request.query_params.get('limit', '20')

        try:
            offset = int(offset_str)
            limit = int(limit_str)
            if offset < 0 or limit <= 0:
                return Response(
                    {'status': 'error', 'message': 'Offset must be non-negative and limit must be positive.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'status': 'error', 'message': 'Invalid offset or limit. Must be integers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Retrieve the chat group. Check if current_user is a member.
            chat_group = ChatGroup.objects.get(id=group_id)

            # Check if the requesting user is a member of this chat group
            is_member = chat_group.members.filter(id=current_user.id).exists()
            if not is_member:
                logger.warning(f"User {current_user.user_name} is not a member of group '{group_id}'. Access denied.")
                return Response(
                    {'status': 'error', 'message': 'Access denied: Not a member of this chat group.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Filter messages by group and order by timestamp for consistent pagination
            messages_queryset = Message.objects.filter(group=chat_group).order_by('timestamp')

            # Initialize Paginator
            paginator = Paginator(messages_queryset, limit)
            page_number = (offset // limit) + 1

            try:
                page_obj = paginator.get_page(page_number)
            except EmptyPage:
                logger.info(f"No messages found for group '{group_id}' at offset {offset}.")
                return Response(
                    {
                        'status': 'success',
                        'messages': [],
                        'next_offset': None,
                        'has_next_page': False
                    },
                    status=status.HTTP_200_OK
                )

            # Serialize message data
            messages_data = [
                {
                    'id': msg.id,
                    'sender_username': msg.sender.user_name,
                    'group_id': msg.group.id,
                    'content': msg.content,
                    'timestamp': msg.timestamp.isoformat(),
                } for msg in page_obj.object_list
            ]

            next_offset = offset + len(messages_data) if page_obj.has_next() else None

            logger.info(f"Successfully retrieved {len(messages_data)} messages for group '{group_id}' for user {current_user.user_name}.")
            return Response({
                'status': 'success',
                'messages': messages_data,
                'next_offset': next_offset,
                'has_next_page': page_obj.has_next()
            }, status=status.HTTP_200_OK)

        except ChatGroup.DoesNotExist:
            logger.warning(f"Chat group '{group_id}' not found for message history.")
            return Response(
                {'status': 'error', 'message': 'Chat group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error in ChatMessageHistoryView for group '{group_id}': {e}")
            return Response(
                {'status': 'error', 'message': 'Internal server error during message history retrieval.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    """
    API endpoint to send a chat message to a specific group.
    This view saves the message to the database and broadcasts it via Channel Layers.
    """
    def post(self, request, group_id) -> Response:
        current_user = request.user
        data = request.data
        content = data.get('content')
        # group_id = data.get('group_id')
        if not content:
            logger.warning("Message content is empty for sending message.")
            return Response(
                {'status': 'error', 'message': 'Message content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            chat_group = ChatGroup.objects.get(id=group_id)
            is_member = chat_group.members.filter(id=current_user.id).exists()
            if not is_member:
                logger.warning(f"User {current_user.user_name} is not a member of group '{group_id}'. Cannot send message.")
                return Response(
                    {'status': 'error', 'message': 'Access denied: Not a member of this chat group.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            message = Message.objects.create(
                sender=current_user,
                content=content,
                group=chat_group
            )
            logger.info(f"Message saved to DB: '{content[:50]}' by {current_user.user_name} in group {group_id}.")

            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.critical("Channel Layer not configured. Real-time features will not work.")
                return Response(
                    {'status': 'error', 'message': 'Server not configured for real-time communication.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            channel_group_id = f"chat_{group_id}"

            message_data = {
                "id": message.id,
                "sender": current_user.user_name,
                "sender_username": current_user.user_name,
                "sender_id": current_user.id,
                "content": content,
                "timestamp": message.timestamp.isoformat(),
                "group_id": group_id
            }

            # Use async_to_sync to call async channel layer from sync code
            async_to_sync(channel_layer.group_send)(
                channel_group_id,
                {
                    "type": "chat_message",
                    "message": message_data
                }
            )
            logger.info(f"Message broadcasted to group '{channel_group_id}'.")

            return Response({
                'status': 'success',
                'message': 'Message sent and broadcasted.',
                'message_data': message_data
            }, status=status.HTTP_200_OK)

        except ChatGroup.DoesNotExist:
            logger.warning(f"Chat group '{group_id}' not found for sending message.")
            return Response(
                {'status': 'error', 'message': 'Chat group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error in ChatMessageSendView: {e}")
            return Response(
                {'status': 'error', 'message': f'Internal server error: {e}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class refreshToken(APIView) :
	permission_classes = [AllowAny]

	def get(self, request) :
		try :
			refresh = request.headers.get("Authorization", "Error unauthorized").split(" ")[1]
		except Exception :
			return JsonResponse({"Error" : "Internal server error"}, status=500)
		jwt_access = jwt.decode(refresh, settings.SECRET_KEY, algorithms=['HS256'])
		dicoTokens = generateJwt(None, jwt_access, refresh)
		return dicoTokens.get("access", "Error")


class listennerFriends(APIView) :
    permission_classes = [IsAuthenticated]

    def get(self, request) :
        user = request.user

        friends = FRIEND.objects.filter(
            Q(from_user=user) | Q(to_user=user),
            status__in=["pending", "accepted"]
        )

        results = []
        for f in friends:
            if f.from_user == user:
                other = f.to_user
                direction = "sent"
            else:
                other = f.from_user
                direction = "received"

            results.append({
                "username": other.user_name,
                "status": f.status,
                "direction": direction,
				"online": other.online,
            })

        return Response({"results": results})


class addFriend(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from_user = request.user
        username = request.data.get("userName")
    
        try:
            to_user = USER.objects.get(user_name=username)
        except USER.DoesNotExist:
            return Response({"error": "User friend not found"}, status=404)
    
        if to_user == from_user:
            return Response({"error": "You cannot add yourself as a friend"}, status=400)

        inverse_request_exists = FRIEND.objects.filter(
            from_user=to_user,
            to_user=from_user,
            status="pending"
        ).exists()

        if inverse_request_exists:
            return Response({"error": "This user has already sent you a friend request"}, status=400)

        friend, created = FRIEND.objects.get_or_create(
            from_user=from_user,
            to_user=to_user,
            defaults={"status": "pending"}
        )

        if not created:
            return Response({"error": "Friend request already sent or exists"}, status=400)

        return Response({"message": "Friend request sent successfully"}, status=201)


class declineInvite(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        from_user = request.user
        to_username = request.data.get("username")
            
        to_user = get_object_or_404(USER, user_name=to_username)
		
        friend_req = get_object_or_404(
            FRIEND,
            from_user=to_user,
            to_user=from_user,
            status="pending")
			
        friend_req.delete()
		
        return Response(
            {"message": f"Friend request from {to_user.user_name} declined"},
            status=200
        )


class acceptInvite(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        from_user = request.user
        to_username = request.data.get("username")
	
        to_user = get_object_or_404(USER, user_name=to_username)
	
        friend_req = get_object_or_404(
            FRIEND,
            from_user=to_user,
            to_user=from_user,
            status="pending")
		
        friend_req.status = "accepted"
        friend_req.save()
		
        return Response(
            {"message": f"Friend request from {to_user.user_name} accepted"},
            status=200
        )

class logout(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        user.online = False
        user.save()
        return Response({'message': 'User logged out successfully'}, status=200)
	
class matchHistory(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.user.user_name
		
        matches = MATCHTABLE.objects.filter(
            Q(username1=username) | Q(username2=username)
        ).order_by('-dateMatch')

        total_matches = matches.count()

        wins = 0
        losses = 0

        for match in matches:
            if match.username1 == username:
                if match.score1 > match.score2:
                    wins += 1
                elif match.score1 < match.score2:
                    losses += 1
            elif match.username2 == username:
                if match.score2 > match.score1:
                    wins += 1
                elif match.score2 < match.score1:
                    losses += 1


        data = []
        data.append({
			"user": username,
            "total_games": total_matches,
			"game_wins": wins,
			"game_losses": losses,
        })
        for match in matches:
            data.append({
				"user": username,
                "date": match.dateMatch,
                "username1": match.username1,
                "username2": match.username2,
                "score1": match.score1,
                "score2": match.score2,
                "winner": match.winner,
            })

        return Response({'result': data})
	
class forgotPassword(APIView):
	permission_classes = [AllowAny]

	def patch(self, request):
		username = request.data.get('username')
		mail = request.data.get('mail')
		password = request.data.get('new_password')

		if not username or not mail or not password:
			return JsonResponse({'error': 'Missing parameters'}, status=400)

		try:
			user = USER.objects.get(user_name=username, mail=mail)
			user.password = password
			user.save()

			return JsonResponse({'success': 'Temporary password uploaded'})
		
		except USER.DoesNotExist:
			return JsonResponse({'error': 'User not found'}, status=404)
		except Exception as e:
			return JsonResponse({'error': f'Error uploading temporary password: {str(e)}'}, status=400)