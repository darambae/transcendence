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
from .logging_utils import (
    log_broadcast_event, log_chat_api_request, log_chat_room_event, 
    log_message_event, log_websocket_connection, log_message_filter,
    log_user_activity, chat_logger, message_logger, api_logger
)

logger = logging.getLogger(__name__)

ACCESS_PG_BASE_URL = "https://access_postgresql:4000"

class ChatGroupListCreateView(View):    
    @log_chat_api_request(action_type='LIST_CHAT_GROUPS')
    def get(self, request, *args, **kwargs):
        """
        Lists chat groups for the logged-in user by proxying to access_postgresql.
        Expects Authorization header for user identification to be passed along.
        """
        access_token = request.COOKIES.get('access_token')
        if not access_token:
            api_logger.warning("Chat group list request missing access token", extra={
                'path': request.path,
                'method': request.method,
                'action_type': 'LIST_CHAT_GROUPS'
            })
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            
        # Forward the access token in the request headers to access_postgresql
        headers = {'Content-Type': 'application/json', 'Host': 'localhost','Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}/api/chat/"
        
        try:
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            
            # Log successful retrieval
            log_chat_room_event('LIST_GROUPS_SUCCESS', user_id=None, 
                              status_code=resp.status_code)
                              
            return JsonResponse(resp.json(), status=resp.status_code)
            
        except requests.RequestException as exc:
            api_logger.error("Chat group list request failed", extra={
                'error_type': type(exc).__name__,
                'error_message': str(exc),
                'action_type': 'LIST_CHAT_GROUPS',
                'service': 'access_postgresql'
            })
            return JsonResponse({'status': 'error', 'message': 'Could not connect to chat data service.'}, status=502)
            
        except Exception as e:
            api_logger.error("Failed to process chat groups response", extra={
                'error_type': type(e).__name__,
                'error_message': str(e),
                'action_type': 'LIST_CHAT_GROUPS'
            })
            return JsonResponse({'status': 'error', 'message': 'Internal server error during chat list retrieval.'}, status=500)

    @log_chat_api_request(action_type='CREATE_CHAT_GROUP')
    def post(self, request, *args, **kwargs):
        """
        Creates or retrieves a private chat group by proxying to access_postgresql.
        Expects 'current_username' and 'target_username' in the JSON body.
        """
        try:
            data = json.loads(request.body)
            chat_logger.info("Chat group creation requested", extra={
                'current_user': data.get('current_username'),
                'target_user': data.get('target_username')
            })
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
    @log_chat_api_request(action_type='GET_CHAT_MESSAGES')
    def get(self, request, group_id):
        offset = request.GET.get('offset', 0)
        limit = request.GET.get('limit', 20)

        log_message_event('FETCH_MESSAGES_REQUEST', chat_room=group_id, 
                        offset=offset, limit=limit)

        access_token = request.COOKIES.get('access_token')
        if not access_token:
            message_logger.warning("Message history request missing access token", extra={
                'chat_room': group_id,
                'action_type': 'GET_CHAT_MESSAGES'
            })
            return JsonResponse({'status': 'error', 'message': 'No access token'}, status=401)
            
        headers = {'Content-Type': 'application/json', 'Host': 'localhost', 'Authorization': f'Bearer {access_token}'}
        url = f"{ACCESS_PG_BASE_URL}/api/chat/{group_id}/messages/"
        params = {'offset': offset, 'limit': limit}
        
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
            resp.raise_for_status()
            
            # Log successful retrieval
            message_count = len(resp.json().get('messages', [])) if resp.json() else 0
            log_message_event('FETCH_MESSAGES_SUCCESS', chat_room=group_id,
                            message_count=message_count, offset=offset, limit=limit)
                            
            return JsonResponse(resp.json(), status=resp.status_code)
            
        except requests.RequestException as exc:
            message_logger.error("Failed to fetch message history", extra={
                'error_type': type(exc).__name__,
                'error_message': str(exc),
                'chat_room': group_id,
                'service': 'access_postgresql'
            })
            return JsonResponse({'status': 'error', 'message': 'Could not connect to data service for message history.'}, status=502)
            
        except Exception as e:
            message_logger.error("Error processing message history response", extra={
                'error_type': type(e).__name__,
                'error_message': str(e),
                'chat_room': group_id
            })
            return JsonResponse({'status': 'error', 'message': 'Internal server error during message history retrieval.'}, status=500)


    """
    Handles sending a message to a specific chat group by proxying to access_postgresql.
    Maps to: path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message')
    Communicates with access_postgresql's /api/chat/<int:group_id>/messages/ endpoint (POST).
    """
    @log_chat_api_request(action_type='SEND_CHAT_MESSAGE')
    def post(self, request, group_id):
        try:
            data = json.loads(request.body)
            content = data.get('content')
            MIN_LENGTH = 1
            MAX_LENGTH = 1000
            
            log_message_event('SEND_MESSAGE_ATTEMPT', chat_room=group_id, 
                            content_length=len(content) if content else 0)
            
            if not content:
                log_message_filter('EMPTY_CONTENT', chat_room=group_id, action_taken='reject')
                return JsonResponse({'status': 'error', 'message': 'content are required.'}, status=400)
                
            if not content or len(content) < MIN_LENGTH:
                log_message_filter('EMPTY_CONTENT', chat_room=group_id, action_taken='reject')
                return JsonResponse({'status': 'error', 'message': 'Message is empty'}, status=400)
                
            if len(content) > MAX_LENGTH:
                log_message_filter('EXCEEDS_MAX_LENGTH', chat_room=group_id, 
                                 content_length=len(content), max_length=MAX_LENGTH, 
                                 action_taken='reject')
                return JsonResponse(
                    {'status': 'error', 'message': f'Message exceeds maximum length of {MAX_LENGTH} characters'}, 
                    status=400
                )
                
            access_token = request.COOKIES.get('access_token')
            if not access_token:
                message_logger.warning("Message send attempt missing access token", extra={
                    'chat_room': group_id,
                    'action_type': 'SEND_CHAT_MESSAGE'
                })
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
                    message_id = message_data_for_channels.get('id')
                    sender_id = message_data_for_channels.get('sender_id')
                else:
                    message_data_for_channels = {
                        "content": content,
                        "timestamp": datetime.now().isoformat(),
                        "group_id": group_id
                    }
                    message_id = None
                    sender_id = None

                channel_layer = get_channel_layer()
                if channel_layer is None:
                    log_message_event('BROADCAST_FAILED', chat_room=group_id, 
                                    message_id=message_id, error='channel_layer_not_configured')
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
                
                # Log successful message sending and broadcasting
                log_message_event('SEND_MESSAGE_SUCCESS', message_id=message_id, 
                                sender_id=sender_id, chat_room=group_id)
                                
                log_broadcast_event('MESSAGE_BROADCAST', recipient_count=None, 
                                  message_type='chat_message', chat_room=group_id,
                                  message_id=message_id)
                                  
                return JsonResponse({'status': 'success', 'message': 'Message sent and forwarded.'})
                
            except requests.RequestException as exc:
                log_message_event('SEND_MESSAGE_FAILED', chat_room=group_id,
                                error_type='connection_error', error_message=str(exc))
                return JsonResponse({'status': 'error', 'message': 'Could not connect to data service to send message.'}, status=502)
                
            except Exception as e:
                log_message_event('SEND_MESSAGE_ERROR', chat_room=group_id,
                                error_type=type(e).__name__, error_message=str(e))
                return JsonResponse({'status': 'error', 'message': 'Internal server error during message sending.'}, status=500)

        except json.JSONDecodeError:
            log_message_filter('INVALID_JSON', chat_room=group_id, action_taken='reject')
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON format.'}, status=400)
            
        except Exception as e:
            message_logger.error("Unhandled error in message send", extra={
                'chat_room': group_id,
                'error_type': type(e).__name__,
                'error_message': str(e)
            })
            return JsonResponse({'status': 'error', 'message': f'Internal server error: {e}'}, status=500)

async def sse_chat_stream(request, group_id):
    """
    Server-Sent Events stream for real-time chat messages.
    """
    # Log SSE connection attempt
    connection_id = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    
    chat_logger.info(f"SSE connection requested for chat group {group_id}", extra={
        'connection_id': connection_id,
        'chat_room': group_id,
        'event_type': 'sse_connection_attempt'
    })
    
    # Create a response object first
    response = StreamingHttpResponse(_generate_events(request, group_id), 
                                    content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

async def _generate_events(request, group_id):
    """Internal generator for SSE events."""
    connection_id = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    
    channel_layer = get_channel_layer()
    if channel_layer is None:
        log_websocket_connection('CONFIGURATION_ERROR', connection_id=connection_id,
                               error_type='missing_channel_layer', chat_room=group_id)
        yield f"event: error\ndata: {json.dumps({'message': 'Channel layer not configured'})}\n\n"
        return  # Empty return to stop the generator
    
    channel_group_name = f"chat_{group_id}"
    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    connection_id = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    
    # --- SSE Token Authentication ---
    try:
        # Your token expiration check code
        access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            log_websocket_connection('AUTH_FAILURE', connection_id=connection_id,
                                   error_type='missing_token', chat_room=group_id)
            yield f"event: error\ndata: {json.dumps({'message': 'No authentication token'})}\n\n"
            return
            
        token_data = jwt.decode(access_token, verify=False)
        expiry_time = token_data.get('exp')
        
        current_time = time.time()
        if expiry_time and (expiry_time - current_time < 300):
            log_websocket_connection('TOKEN_EXPIRING_SOON', connection_id=connection_id,
                                   seconds_remaining=(expiry_time - current_time),
                                   chat_room=group_id)
            yield f"event: refresh_token\ndata: {{}}\n\n"
            
    except Exception as e:
        log_websocket_connection('TOKEN_CHECK_ERROR', connection_id=connection_id,
                               error_type=type(e).__name__, 
                               error_message=str(e),
                               chat_room=group_id)
    
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
            log_websocket_connection('AUTH_REJECTED', connection_id=connection_id,
                                   status_code=resp.status_code,
                                   chat_room=group_id)
            await channel_layer.group_discard(channel_group_name, client_channel_name)
            yield f"event: error\ndata: {json.dumps({'message': 'Unauthorized'})}\n\n"
            return
            
        user_data = resp.json()
        user_id = user_data.get('payload', {}).get('username')
        
        log_websocket_connection('AUTH_SUCCESS', connection_id=connection_id,
                               user_id=user_id,
                               chat_room=group_id)
                               
        log_chat_room_event('USER_CONNECTED', room_id=group_id,
                          user_id=user_id)
        
    except httpx.RequestError as e:
        logger.exception(f"live_chat (SSE): Error validating token: {e}")
        await channel_layer.group_discard(channel_group_name, client_channel_name)
        yield f"event: error\ndata: {json.dumps({'message': 'Authentication error'})}\n\n"
        return

    connection_id = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    user_id = user_data.get('payload', {}).get('username') if 'user_data' in locals() else None
    
    try:
        heartbeat_count = 0
        while True:
            try:
                message = await asyncio.wait_for(
                    channel_layer.receive(client_channel_name),
                    timeout=20
                )

                if message and message["type"] == "chat_message":
                    sse_data = json.dumps(message["message"])
                    
                    message_id = message["message"].get("id")
                    sender_id = message["message"].get("sender_id")
                    
                    log_message_event('MESSAGE_DELIVERED', 
                                     message_id=message_id, 
                                     sender_id=sender_id, 
                                     recipient_id=user_id, 
                                     chat_room=group_id)
                                     
                    yield f"data: {sse_data}\n\n"
                else:
                    # Only log occasional heartbeats to avoid log spam
                    if heartbeat_count % 5 == 0:
                        chat_logger.info(f"Chat connection heartbeat", extra={
                            'metric_type': 'chat_performance',
                            'metric_name': 'HEARTBEAT',
                            'metric_value': heartbeat_count,
                            'connection_id': connection_id,
                            'chat_room': group_id
                        })
                    heartbeat_count += 1
                    yield ":heartbeat\n\n"
                    
            except asyncio.TimeoutError:
                # Only log occasional heartbeats to avoid log spam
                if heartbeat_count % 5 == 0:
                    chat_logger.info(f"Chat connection timeout heartbeat", extra={
                        'metric_type': 'chat_performance',
                        'metric_name': 'HEARTBEAT_TIMEOUT',
                        'metric_value': heartbeat_count,
                        'connection_id': connection_id,
                        'chat_room': group_id
                    })
                heartbeat_count += 1
                yield ":heartbeat\n\n"
                
    except Exception as e:
        log_websocket_connection('CONNECTION_ERROR', 
                               connection_id=connection_id,
                               user_id=user_id,
                               chat_room=group_id,
                               error_type=type(e).__name__,
                               error_message=str(e))
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        
    finally:
        log_chat_room_event('USER_DISCONNECTED', 
                          room_id=group_id,
                          user_id=user_id)
                          
        log_websocket_connection('DISCONNECTED', 
                               connection_id=connection_id,
                               user_id=user_id,
                               chat_room=group_id)
                               
        await channel_layer.group_discard(channel_group_name, client_channel_name)