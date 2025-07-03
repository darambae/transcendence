# live_chat/views.py

import json
from django.http import JsonResponse, StreamingHttpResponse
from django.views import View
from channels.layers import get_channel_layer
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


            target_user_id = data.get('target_user_id')
            current_user_id = data.get('current_user_id')
            if not target_user_id or not current_user_id:
                return JsonResponse({'status': 'error', 'message': 'user ids are required.'}, status=400)

            # Get current user from the authenticated request
            logger.info(f"Creating private chat for user {current_user_id} with target user {target_user_id}")
            access_token = request.COOKIES.get('access_token')
            if not access_token:
                return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
            url = f"{ACCESS_PG_BASE_URL}/api/chat/"
            try:
                resp = requests.post(url, json={
                    'current_user_id': current_user_id,
                    'target_user_id': target_user_id
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
    # Get access token from cookies (consistent with other views)
    access_token = request.COOKIES.get('access_token')
    if not access_token:
        await channel_layer.group_discard(channel_group_name, client_channel_name)
        return StreamingHttpResponse("Unauthorized: No access token", status=401, content_type="text/plain")

    # Validate the token by making a request to access_postgresql
    # This matches the pattern used in other views
    try:
        # We need to use httpx which supports async requests
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{ACCESS_PG_BASE_URL}/api/DecodeJwt/",  # Adjust endpoint as needed
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Host': 'localhost'
                },
                timeout=10
            )

        if resp.status_code != 200:
            logger.warning(f"live_chat (SSE): Invalid token for group '{group_id}'")
            await channel_layer.group_discard(channel_group_name, client_channel_name)
            return StreamingHttpResponse("Unauthorized: Invalid token", status=401, content_type="text/plain")

        # Optional: Check if user has access to this specific group
        # You might need another endpoint or include group_id in verification
        user_data = resp.json()
        logger.info(f"live_chat (SSE): Authenticated user '{user_data.get('user_name')}' for group '{group_id}'")

    except httpx.RequestError as e:
        logger.exception(f"live_chat (SSE): Error validating token for group '{group_id}': {e}")
        await channel_layer.group_discard(channel_group_name, client_channel_name)
        return StreamingHttpResponse("Internal Server Error during authentication", status=500, content_type="text/plain")
    # --- END SSE Token Authentication ---
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


            except asyncio.TimeoutError:
                yield ":heartbeat\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
    finally:
        await channel_layer.group_discard(channel_group_name, client_channel_name)
