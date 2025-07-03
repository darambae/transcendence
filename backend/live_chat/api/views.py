# live_chat/views.py

import json
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator # To apply csrf_exempt to class-based views
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import asyncio
import logging
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
import requests
import httpx

# Configure logging
# --- IMPORTANT: Ensure these models are correctly defined in .models ---
# These are placeholder imports. Adjust based on your actual project structure
# if USER, ChatGroup, or Message models are defined directly in this app.
# If they are only used in access_postgresql, these specific imports might not be needed here,
# but often Django projects define common models for consistency.
# For the purpose of this file, we assume they are available if needed for local ORM ops,
# but primarily, this service proxies to access_postgresql.

logger = logging.getLogger(__name__)

# Base URL for your access_postgresql service (without the /api/ prefix)
ACCESS_PG_BASE_URL = "https://access_postgresql:4000"

class blockedStatus(View):
    def get(self, request, targetUser):
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
        headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}api/chat/{targetUser}/blockedStatus/"
        try:
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            return JsonResponse(resp.json(), status=resp.status_code)
        except requests.RequestException as exc:
            logger.error(f"blocked Status GET request failed: {exc}")
            return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service.'}, status=502)
        except Exception as e:
            logger.error(f"Failed to decode JSON from backend: {e}")
            return JsonResponse({'status': 'error', 'message': 'Internal server error during chat list retrieval.'}, status=500)
    def post (self, request, targetUser):
        try:
            data = json.loads(request.body)
            block_target = data.get('isBlocked')
            if not block_target or not targetUser:
                return JsonResponse({'status': 'error', 'message': 'block instruction and targetUser are required.'}, status=400)

            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}api/chat/{targetUser}/blockedStatus/"
            try:
                resp = requests.post(url, json={
                    'isBlocked': block_target
                }, headers=headers, timeout=10, verify=False)
                resp.raise_for_status()
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


# @method_decorator(csrf_exempt, name='dispatch') # Apply csrf_exempt to all methods in this class
class ChatGroupListCreateView(View):
    def get(self, request, *args, **kwargs):
        """
        Lists chat groups for the logged-in user by proxying to access_postgresql.
        Expects Authorization header for user identification to be passed along.
        """
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
        # Forward the access token in the request headers to access_postgresql
        headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
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

    def post(self, request, *args, **kwargs):
        """
        Creates or retrieves a private chat group by proxying to access_postgresql.
        Expects 'current_username' and 'target_username' in the JSON body.
        """
        try:
            data = json.loads(request.body)
            current_username = data.get('current_username')
            target_username = data.get('target_username')

            if not current_username or not target_username:
                return JsonResponse({'status': 'error', 'message': 'current_username and target_username are required.'}, status=400)


            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}/api/chat/"
            try:
                resp = requests.post(url, json={
                    'current_username': current_username,
                    'target_username': target_username
                }, headers=headers, timeout=10, verify=False)
                resp.raise_for_status()
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
            return JsonResponse({'status': 'error', 'message': 'Could not connect to data service for message history.'}, status=502)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'Internal server error during message history retrieval.'}, status=500)


    """
    Handles sending a message to a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message')
    Communicates with access_postgresql's /api/chat/<int:group_id>/messages/ endpoint (POST).
    """
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

async def sse_chat_stream(request, group_id):
    """
    Server-Sent Events stream for real-time chat messages.
    Maps to: path("chat/stream/<int:group_id>/", views.sse_chat_stream, name="sse_chat_stream")
    This view directly handles SSE via Django Channels, it does not proxy to access_postgresql.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return StreamingHttpResponse("Internal Server Error: Channel layer not configured.", status=500, content_type="text/plain")

    channel_group_name = f"chat_{group_id}"
    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    # --- SSE Token Authentication (Crucial for security) ---
    # The frontend passes the token as a query parameter.
    # You MUST validate this token here against your authentication system.
    # token_str = request.GET.get('token')
    # if not token_str:
    #     await channel_layer.group_discard(channel_group_name, client_channel_name) # Discard channel on auth failure
    #     return StreamingHttpResponse("Unauthorized: Token required.", status=401, content_type="text/plain")

    # # TODO: Implement actual token validation (e.g., JWT verification, Django Rest Framework Token lookup)
    # # This example is a placeholder. For production, replace with proper security.
    # # from rest_framework_simplejwt.authentication import JWTAuthentication
    # # from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    # # try:
    # #     auth = JWTAuthentication()
    # #     # Remove "Bearer " prefix if present
    # #     clean_token = token_str.replace('Bearer ', '')
    # #     # get_validated_token also performs expiration checks
    # #     validated_token = await sync_to_async(auth.get_validated_token)(clean_token)
    # #     user = await sync_to_async(auth.get_user)(validated_token)
    # #     if user:
    # #         logger.info(f"live_chat (SSE): Authenticated user '{user.username}' for group '{group_id}'.")
    # #         # Optionally, check if 'user' is allowed to access 'group_id' here
    # #     else:
    # #         raise InvalidToken("User not found for token.")
    # # except (InvalidToken, TokenError) as e:
    # #     logger.warning(f"live_chat (SSE): Invalid token for group '{group_id}': {e}")
    # #     await channel_layer.group_discard(channel_group_name, client_channel_name)
    # #     return StreamingHttpResponse("Unauthorized: Invalid token.", status=401, content_type="text/plain")
    # # except Exception as e:
    # #     logger.exception(f"live_chat (SSE): Error validating token for SSE stream for group '{group_id}': {e}")
    # #     await channel_layer.group_discard(channel_group_name, client_channel_name)
    # #     return StreamingHttpResponse("Internal Server Error during authentication.", status=500, content_type="text/plain")

    # # --- END SSE Token Authentication ---


    async def event_generator():
        try:
            while True:
                # Add a timeout to send heartbeats, keeping the connection alive and
                # allowing the server to clean up if the client disconnects silently.
                message = await asyncio.wait_for(
                    channel_layer.receive(client_channel_name),
                    timeout=20 # Send a heartbeat if no message for 20s
                )

                if message and message["type"] == "chat_message":
                    sse_data = json.dumps(message["message"])
                    yield f"data: {sse_data}\n\n"
                else:
                    # Send an SSE comment (heartbeat) to maintain the connection
                    yield ":heartbeat\n\n"

        except asyncio.TimeoutError:
            # Timeout is normal, just a heartbeat, the loop continues
            pass # Explicit heartbeat already yielded by the else block
        except asyncio.CancelledError:
            print(f"SSE stream for group '{group_id}' (channel {client_channel_name}) cancelled.")
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        finally:
            # Ensure the channel is discarded when the generator exits
            await channel_layer.group_discard(channel_group_name, client_channel_name)

    response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no' # Essential for SSE to ensure events are sent immediately
    return response
