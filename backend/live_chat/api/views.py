# live_chat/views.py

import json
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator # To apply csrf_exempt to class-based views
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
import asyncio
import httpx
import logging
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import requests
# Configure logging
# --- IMPORTANT: Ensure these models are correctly defined in .models ---
# These are placeholder imports. Adjust based on your actual project structure
# if USER, ChatGroup, or Message models are defined directly in this app.
# If they are only used in access_postgresql, these specific imports might not be needed here,
# but often Django projects define common models for consistency.
# For the purpose of this file, we assume they are available if needed for local ORM ops,
# but primarily, this service proxies to access_postgresql.
from .models import USER, ChatGroup, Message # Example: from myapp.models import USER, ChatGroup, Message

logger = logging.getLogger(__name__)

# Base URL for your access_postgresql service (without the /api/ prefix)
ACCESS_PG_BASE_URL = "https://access_postgresql:4000"

# @method_decorator(csrf_exempt, name='dispatch') # Apply csrf_exempt to all methods in this class
class ChatGroupListCreateView(View):
    def get(self, request, *args, **kwargs):
        """
        Lists chat groups for the logged-in user by proxying to access_postgresql.
        Expects Authorization header for user identification to be passed along.
        """
        auth_header = request.headers.get('Authorization')
        headers = {'Content-Type': 'application/json', 'host': 'access_postgresql'}
        if auth_header:
            headers['Authorization'] = auth_header
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

            auth_header = request.headers.get('Authorization')
            headers = {'Content-Type': 'application/json'}
            if auth_header:
                headers['Authorization'] = auth_header

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

@method_decorator(csrf_exempt, name='dispatch')
class ChatMessageHistoryView(View):
    """
    Handles fetching message history for a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<str:group_name>/messages/', ChatMessageHistoryView.as_view(), name='chat_message_history')
    Communicates with access_postgresql's /api/chat/<str:group_name>/messages/ endpoint (GET).
    """
    async def get(self, request, group_name):
        offset = request.GET.get('offset', 0)
        limit = request.GET.get('limit', 20)

        auth_header = request.headers.get('Authorization')
        headers = {'Content-Type': 'application/json'}
        if auth_header:
            headers['Authorization'] = auth_header

        # Construct the URL including the /api/ prefix as per access_postgresql's urls.py
        url = f"{ACCESS_PG_BASE_URL}/api/chat/{group_name}/messages/"
        params = {'offset': offset, 'limit': limit}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, headers=headers, timeout=10.0)
                resp.raise_for_status()
                return JsonResponse(resp.json(), status=resp.status_code)
        except httpx.RequestError as exc:
            return JsonResponse({'status': 'error', 'message': 'Could not connect to data service for message history.'}, status=502)
        except httpx.HTTPStatusError as exc:
            return JsonResponse({'status': 'error', 'message': f'Error from data service: {exc.response.text}'}, status=exc.response.status_code)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'Internal server error during message history retrieval.'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class ChatMessageSendView(View):
    """
    Handles sending a message to a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<str:group_name>/messages/', ChatMessageSendView.as_view(), name='chat_message_send')
    Communicates with access_postgresql's /api/chat/<str:group_name>/messages/ endpoint (POST).
    """
    async def post(self, request, group_name):
        try:
            data = json.loads(request.body)
            username = data.get('username')
            content = data.get('content')

            if not username or not content:
                return JsonResponse({'status': 'error', 'message': 'Username and content are required.'}, status=400)

            auth_header = request.headers.get('Authorization')
            headers = {'Content-Type': 'application/json'}
            if auth_header:
                headers['Authorization'] = auth_header

            # Construct the URL including the /api/ prefix as per access_postgresql's urls.py
            url = f"{ACCESS_PG_BASE_URL}/api/chat/{group_name}/messages/"
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json={
                        'group_name': group_name, # Still pass group_name in body for consistency
                        'username': username,
                        'content': content
                    }, headers=headers, timeout=10.0)
                    resp.raise_for_status()
                    pg_response_data = resp.json()

                    # After successfully sending to access_postgresql, forward the message via Channels
                    if pg_response_data.get('status') == 'success' and 'message_data' in pg_response_data:
                        # Use the message data returned from access_postgresql for real-time update
                        message_data_for_channels = pg_response_data['message_data']
                    else:
                        # Fallback if access_postgresql doesn't return full message_data as expected
                        # It's crucial for access_postgresql to return this for consistency
                        message_data_for_channels = {
                            "sender": username,
                            "sender_id": None, # Should be filled by access_postgresql
                            "content": content,
                            "timestamp": datetime.now().isoformat(), # Fallback timestamp
                            "group_name": group_name
                        }

                    channel_layer = get_channel_layer()
                    if channel_layer is None:
                        return JsonResponse({'status': 'error', 'message': 'Real-time server not configured.'}, status=500)

                    channel_group_name = f"chat_{group_name}"

                    await channel_layer.group_send(
                        channel_group_name,
                        {
                            "type": "chat_message",
                            "message": message_data_for_channels
                        }
                    )
                    return JsonResponse({'status': 'success', 'message': 'Message sent and forwarded.'})
            except httpx.RequestError as exc:
                return JsonResponse({'status': 'error', 'message': 'Could not connect to data service to send message.'}, status=502)
            except httpx.HTTPStatusError as exc:
                return JsonResponse({'status': 'error', 'message': f'Error from data service: {exc.response.text}'}, status=exc.response.status_code)
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': 'Internal server error during message sending.'}, status=500)

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)


async def sse_chat_stream(request, group_name):
    """
    Server-Sent Events stream for real-time chat messages.
    Maps to: path("chat/stream/<str:group_name>/", views.sse_chat_stream, name="sse_chat_stream")
    This view directly handles SSE via Django Channels, it does not proxy to access_postgresql.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return StreamingHttpResponse("Internal Server Error: Channel layer not configured.", status=500, content_type="text/plain")

    channel_group_name = f"chat_{group_name}"
    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    # --- SSE Token Authentication (Crucial for security) ---
    # The frontend passes the token as a query parameter.
    # You MUST validate this token here against your authentication system.
    token_str = request.GET.get('token')
    if not token_str:
        await channel_layer.group_discard(channel_group_name, client_channel_name) # Discard channel on auth failure
        return StreamingHttpResponse("Unauthorized: Token required.", status=401, content_type="text/plain")

    # TODO: Implement actual token validation (e.g., JWT verification, Django Rest Framework Token lookup)
    # This example is a placeholder. For production, replace with proper security.
    # from rest_framework_simplejwt.authentication import JWTAuthentication
    # from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
    # try:
    #     auth = JWTAuthentication()
    #     # Remove "Bearer " prefix if present
    #     clean_token = token_str.replace('Bearer ', '')
    #     # get_validated_token also performs expiration checks
    #     validated_token = await sync_to_async(auth.get_validated_token)(clean_token)
    #     user = await sync_to_async(auth.get_user)(validated_token)
    #     if user:
    #         logger.info(f"live_chat (SSE): Authenticated user '{user.username}' for group '{group_name}'.")
    #         # Optionally, check if 'user' is allowed to access 'group_name' here
    #     else:
    #         raise InvalidToken("User not found for token.")
    # except (InvalidToken, TokenError) as e:
    #     logger.warning(f"live_chat (SSE): Invalid token for group '{group_name}': {e}")
    #     await channel_layer.group_discard(channel_group_name, client_channel_name)
    #     return StreamingHttpResponse("Unauthorized: Invalid token.", status=401, content_type="text/plain")
    # except Exception as e:
    #     logger.exception(f"live_chat (SSE): Error validating token for SSE stream for group '{group_name}': {e}")
    #     await channel_layer.group_discard(channel_group_name, client_channel_name)
    #     return StreamingHttpResponse("Internal Server Error during authentication.", status=500, content_type="text/plain")

    # --- END SSE Token Authentication ---


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
            print(f"SSE stream for group '{group_name}' (channel {client_channel_name}) cancelled.")
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        finally:
            # Ensure the channel is discarded when the generator exits
            await channel_layer.group_discard(channel_group_name, client_channel_name)

    response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no' # Essential for SSE to ensure events are sent immediately
    return response