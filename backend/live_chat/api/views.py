# live_chat/views.py

import json
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from channels.layers import get_channel_layer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from asgiref.sync import async_to_sync
import asyncio
import logging
from datetime import datetime
import requests
import httpx
import jwt
import time

logger = logging.getLogger(__name__)

ACCESS_PG_BASE_URL = "https://access_postgresql:4000"

# class tournamentChat(View):
#     def post(self, request, *args, **kwargs):
#         """
#         Creates or retrieves a tournament chat group by proxying to access_postgresql.
#         Expects 'current_user_id' and 'tournament_id' in the JSON body.
#         Tournament chats are group chats (private=False) that allow multiple participants.
#         """
#         try:
#             data = json.loads(request.body)
#             tournament_id = data.get('tournament_id')
#             current_user_name = data.get('current_username')

#             if not tournament_id or not current_user_name:
#                 return JsonResponse({'status': 'error', 'message': 'tournament_id and current_user_id are required.'}, status=400)

#             logger.info(f"Creating tournament chat for user {current_user_name} with tournament {tournament_id}")

#             access_token = request.COOKIES.get('access_token')
#             if not access_token:
#                 return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)

#             headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
#             url = f"{ACCESS_PG_BASE_URL}/api/chat/tournament/"

#             try:
#                 resp = requests.post(url, json={
#                     'current_user_name': current_user_name,
#                     'tournament_id': tournament_id
#                 }, headers=headers, timeout=10, verify=False)
#                 resp.raise_for_status()

#                 # Envoyer une notification pour le nouveau chat de tournoi
#                 response_data = resp.json()
#                 if response_data.get('status') == 'success':
#                     # Récupérer les informations du tournoi pour la notification
#                     channel_layer = get_channel_layer()
#                     if channel_layer:
#                         # Notification pour le créateur du tournoi
#                         notification_group_name = f"notifications_{response_data.get('current_id')}"
#                         async_to_sync(channel_layer.group_send)(
#                             notification_group_name,
#                             {
#                                 "type": "chat_notification",
#                                 "notification": {
#                                     "type": "new_chat_group",
#                                     "chat_type": "tournament",
#                                     "tournament_id": tournament_id,
#                                     "tournament_name": response_data.get('tournament_name'),
#                                     "group_id": response_data.get('group_id'),
# 									"current_user_id" = response_data.get('current_id'),
#                                     "timestamp": datetime.now().isoformat()
#                                 }
#                             }
#                         )

#                 return JsonResponse(resp.json(), status=resp.status_code)

#             except requests.RequestException as exc:
#                 logger.error(f"tournamentChat POST request failed: {exc}")
#                 return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service for tournament chat.'}, status=502)
#             except Exception as e:
#                 logger.error(f"Internal server error during tournament chat creation: {e}")
#                 return JsonResponse({'status': 'error', 'message': 'Internal server error during tournament chat creation.'}, status=500)

#         except json.JSONDecodeError:
#             return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
#         except Exception as e:
#             logger.error(f"Internal server error: {e}")
#             return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)

class ChatGroupListCreateView(View):
    @method_decorator(csrf_exempt)
    def get(self, request, *args, **kwargs):
        """
        Lists chat groups for the logged-in user by proxying to access_postgresql.
        Expects Authorization header for user identification to be passed along.
        """
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
        # Forward the access token in the request headers to access_postgresql
        headers = {'Content-Type': 'application/json', 'Host': 'localhost','Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}/api/chat/"
        try:
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            return JsonResponse(resp.json(), status=resp.status_code)
        except requests.RequestException as exc:
            logger.error(f"ChatGroupListCreateView GET request failed: {exc}")
            return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service.'}, status=502)
        except Exception as e:
            logger.error(f"Failed to decode JSON from backend: {e}")
            return JsonResponse({'status': 'error', 'message': 'Internal server error during chat list retrieval.'}, status=500)

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        """
        Creates or retrieves a private chat group by proxying to access_postgresql.
        Expects 'current_username' and 'target_username' in the JSON body.
        """
        try:
            data = json.loads(request.body)
            target_id = data.get('target_id')
            if not target_id:
                return JsonResponse({'status': 'error', 'message': 'target_id is required.'}, status=400)
            # Get current user from the authenticated request
            logger.info(f"Creating private or tournament chat with target {target_id}")
            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}/api/chat/"
            try:
                resp = requests.post(url, json={
                    'target_id': target_id,
                    'chat_type': data.get('chat_type')
                }, headers=headers, timeout=10, verify=False)
                resp.raise_for_status()
                # Envoyer une notification au destinataire du nouveau chat privé
                response_data = resp.json()
                if response_data.get('status') == 'success':
                    # Récupérer les informations de l'utilisateur créateur pour la notification
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        # Notification pour le destinataire
                        notification_group_name = f"notifications_{target_id}"
                        if (data.get('chat_type') == 'private'):
                            async_to_sync(channel_layer.group_send)(
                                notification_group_name,
                                {
                                    "type": "chat_notification",
                                    "notification": {
                                        "chat_type": data.get('chat_type'),
                                        "type": "new_chat_group",
                                        "target_id": target_id,
                                        "creator_id": response_data.get('sender_id'),
                                        "creator_username": response_data.get('sender_name'),
                                        "group_id": response_data.get('group_id'),
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }
                            )
                        if (data.get('chat_type') == 'tournament'):
                            async_to_sync(channel_layer.group_send)(
                                notification_group_name,
                                {
                                    "type": "chat_notification",
                                    "notification": {
                                        "chat_type": data.get('chat_type'),
                                        "type": "new_chat_group",
                                        "target_id": data.get('target_id'),
                                        "user_id": response_data.get('user_id'),
                                        "user_name": response_data.get('user_name'),
                                        "group_id": response_data.get('group_id'),
                                        "group_name": response_data.get('group_name'),
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }
                            )

                return JsonResponse(resp.json(), status=resp.status_code)
            except requests.RequestException as exc:
                logger.error(f"ChatGroupListCreateView POST request failed: {exc}")
                return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service for private chat.'}, status=502)
            except Exception as e:
                logger.error(f"Internal server error during private chat creation: {e}")
                return JsonResponse({'status': 'error', 'message': 'Internal server error during private chat creation.'}, status=500)

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
        except Exception as e:
            logger.error(f"Internal server error: {e}")
            return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)

class ChatMessageView(View):
    """
    Handles fetching message history for a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message')
    Communicates with access_postgresql's /api/chat/<int:group_id>/messages/ endpoint (GET).
    """
    @method_decorator(csrf_exempt)
    def get(self, request, group_id):
        offset = request.GET.get('offset', 0)
        limit = request.GET.get('limit', 20)

        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
        headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}/api/chat/{group_id}/messages/"
        params = {'offset': offset, 'limit': limit}
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            return JsonResponse(resp.json(), status=resp.status_code)
        except requests.RequestException as exc:
            logger.error(f"ChatMessageView GET request failed for group {group_id}: {exc}")
            if hasattr(exc.response, 'status_code'):
                logger.error(f"Response status: {exc.response.status_code}")
                if hasattr(exc.response, 'text'):
                    logger.error(f"Response content: {exc.response.text}")
            return JsonResponse({'status': 'error', 'message': 'Could not connect to data service for message history.'}, status=502)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'Internal server error during message history retrieval.'}, status=500)


    """
    Handles sending a message to a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message')
    Communicates with access_postgresql's /api/chat/<int:group_id>/messages/ endpoint (POST).
    """
    @method_decorator(csrf_exempt)
    def post(self, request, group_id):
        try:
            data = json.loads(request.body)
            content = data.get('content')
            MIN_LENGTH = 1
            MAX_LENGTH = 1000

            if not content:
                return JsonResponse({'status': 'error', 'message': 'content are required.'}, status=400)
            if not content or len(content) < MIN_LENGTH:
                return JsonResponse({'status': 'error', 'message': 'Message is empty'}, status=400)

            if len(content) > MAX_LENGTH:
                return JsonResponse(
                    {'status': 'error', 'message': f'Message exceeds maximum length of {MAX_LENGTH} characters'},
                    status=400
                )
            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}/api/chat/{group_id}/messages/"
            try:
                resp = requests.post(url, json={
                    'group_id': group_id,
                    'content': content
                }, headers=headers, timeout=10, verify=False)
                resp.raise_for_status()
                pg_response_data = resp.json()

                # After successfully sending to access_postgresql, forward the message via Channels
                if pg_response_data.get('status') == 'success' and 'message_data' in pg_response_data:
                    message_data_for_channels = pg_response_data['message_data']
                else:
                    message_data_for_channels = {
                        "content": content,
                        "timestamp": datetime.now().isoformat(),
                        "group_id": group_id
                    }

                channel_layer = get_channel_layer()
                if channel_layer is None:
                    return JsonResponse({'status': 'error', 'message': 'Real-time server not configured.'}, status=500)

                channel_group_name = f"chat_{group_id}"

                # Use sync_to_async for group_send in a sync view
                async_to_sync(channel_layer.group_send)(
                    channel_group_name,
                    {
                        "type": "chat_message",
                        "message": message_data_for_channels
                    }
                )
                return JsonResponse({'status': 'success', 'message': 'Message sent and forwarded.'})
            except requests.RequestException as exc:
                return JsonResponse({'status': 'error', 'message': 'Could not connect to data service to send message.'}, status=502)
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': 'Internal server error during message sending.'}, status=500)

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)
async def sse_notification_stream(request, currentUserId):
    response = StreamingHttpResponse(_generate_notification_events(request, currentUserId),
                                    content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

async def _generate_notification_events(request, user_id):
    """Internal generator for notification SSE events."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        yield f"event: error\ndata: {json.dumps({'message': 'Channel layer not configured'})}\n\n"
        return

    # Channel group name pour les notifications utilisateur spécifique
    channel_group_name = f"notifications_{user_id}"
    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    # --- SSE Token Authentication ---
    try:
        access_token = request.COOKIES.get('access_token')
        token_data = jwt.decode(access_token, options={"verify_signature": False})
        expiry_time = token_data.get('exp')

        current_time = time.time()
        if expiry_time and (expiry_time - current_time < 300):
            yield f"event: refresh_token\ndata: {{}}\n\n"

    except Exception as e:
        logger.error(f"Error checking token expiration: {e}")

    # Validate token
    try:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{ACCESS_PG_BASE_URL}/api/DecodeJwt/",
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Host': 'localhost'
                },
                timeout=10
            )

        if resp.status_code != 200:
            logger.warning(f"live_chat (SSE): Invalid token for notifications user '{user_id}'")
            await channel_layer.group_discard(channel_group_name, client_channel_name)
            yield f"event: error\ndata: {json.dumps({'message': 'Unauthorized'})}\n\n"
            return

        user_data = resp.json()
        logger.info(f"live_chat (SSE): Validated token for notifications user '{user_id}' - user data: {user_data}")

    except httpx.RequestError as e:
        logger.exception(f"live_chat (SSE): Error validating token: {e}")
        await channel_layer.group_discard(channel_group_name, client_channel_name)
        yield f"event: error\ndata: {json.dumps({'message': 'Authentication error'})}\n\n"
        return

    try:
        while True:
            try:
                message = await asyncio.wait_for(
                    channel_layer.receive(client_channel_name),
                    timeout=20
                )

                if message and message["type"] == "chat_notification":
                    sse_data = json.dumps(message["notification"])
                    yield f"event: chat_notification\ndata: {sse_data}\n\n"
                elif message and message["type"] == "block_notification":
                    sse_data = json.dumps(message["notification"])
                    yield f"event: block_notification\ndata: {sse_data}\n\n"
                else:
                    yield ":heartbeat\n\n"

            except asyncio.TimeoutError:
                yield ":heartbeat\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
    finally:
        await channel_layer.group_discard(channel_group_name, client_channel_name)

async def sse_chat_stream(request, group_id):
    """
    Server-Sent Events stream for real-time chat messages.
    """
    # Create a response object first
    response = StreamingHttpResponse(_generate_events(request, group_id),
                                    content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

async def _generate_events(request, group_id):
    """Internal generator for SSE events."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        yield f"event: error\ndata: {json.dumps({'message': 'Channel layer not configured'})}\n\n"
        return  # Empty return to stop the generator

    channel_group_name = f"chat_{group_id}"
    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    # --- SSE Token Authentication ---
    try:
        # Your token expiration check code
        access_token = request.COOKIES.get('access_token')

        token_data = jwt.decode(access_token, options={"verify_signature": False})
        expiry_time = token_data.get('exp')

        current_time = time.time()
        if expiry_time and (expiry_time - current_time < 300):
            yield f"event: refresh_token\ndata: {{}}\n\n"

    except Exception as e:
        logger.error(f"Error checking token expiration: {e}")

    # Validate token
    try:
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{ACCESS_PG_BASE_URL}/api/DecodeJwt/",
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Host': 'localhost'
                },
                timeout=10
            )

        if resp.status_code != 200:
            logger.warning(f"live_chat (SSE): Invalid token for group '{group_id}'")
            await channel_layer.group_discard(channel_group_name, client_channel_name)
            yield f"event: error\ndata: {json.dumps({'message': 'Unauthorized'})}\n\n"
            return

        user_data = resp.json()
        logger.info(f"live_chat (SSE): Validated token for group '{group_id}' - user data: {user_data}")

    except httpx.RequestError as e:
        logger.exception(f"live_chat (SSE): Error validating token: {e}")
        await channel_layer.group_discard(channel_group_name, client_channel_name)
        yield f"event: error\ndata: {json.dumps({'message': 'Authentication error'})}\n\n"
        return

    try:
        while True:
            try:
                message = await asyncio.wait_for(
                    channel_layer.receive(client_channel_name),
                    timeout=20
                )

                if message and message["type"] == "chat_message":
                    sse_data = json.dumps(message["message"])
                    yield f"data: {sse_data}\n\n"
                else:
                    yield ":heartbeat\n\n"

            except asyncio.TimeoutError:
                yield ":heartbeat\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
    finally:
        await channel_layer.group_discard(channel_group_name, client_channel_name)

class blockedStatus(View):
    @method_decorator(csrf_exempt)
    def get(self, request, targetUserId):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
        headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}/api/chat/{targetUserId}/blockedStatus/"
        try:
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            return JsonResponse(resp.json(), status=resp.status_code)
        except requests.RequestException as exc:
            logger.error(f"blocked Status GET request failed: {exc}")
            return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service.'}, status=502)
        except Exception as e:
            logger.error(f"Failed to decode JSON from backend: {e}")
            return JsonResponse({'status': 'error', 'message': 'Internal server error during blocked status retrieval.'}, status=500)

    @method_decorator(csrf_exempt)
    def post (self, request, targetUserId):
        try:
            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}/api/chat/{targetUserId}/blockedStatus/"
            try:
                resp = requests.post(url, json={}, headers=headers, timeout=10, verify=False)
                resp.raise_for_status()

                # Envoyer une notification au destinataire du changement de statut de blocage
                response_data = resp.json()
                if response_data.get('status') == 'success':
                    # Envoyer la notification au destinataire
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        notification_group_name = f"notifications_{targetUserId}"
                        async_to_sync(channel_layer.group_send)(
                            notification_group_name,
                            {
                                "type": "block_notification",
                                "notification": {
                                    "action": response_data.get('action'),  # 'blocked' ou 'unblocked'
                                    "target_user_id": targetUserId,
                                    "target_name": response_data.get('target_name'),
                                    "actor_id": response_data.get('actor_id'),
                                    "actor_name": response_data.get('actor_name'),
                                    "timestamp": datetime.now().isoformat()
                                }
                            }
                        )
                        logger.info(f"Sent block notification: {response_data.get('action')} by {response_data.get('actor_name')} to user {targetUserId}")

                return JsonResponse(resp.json(), status=resp.status_code)
            except requests.RequestException as exc:
                logger.error(f"chat blockedStatus POST request failed: {exc}")
                return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service for blocked status.'}, status=502)
            except Exception as e:
                logger.error(f"Internal server error during blocked status changes: {e}")
                return JsonResponse({'status': 'error', 'message': 'Internal server error during blocked status changes.'}, status=500)

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
        except Exception as e:
            logger.error(f"Internal server error: {e}")
            return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)
