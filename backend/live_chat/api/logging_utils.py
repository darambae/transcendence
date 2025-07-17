import logging
import time
from functools import wraps

chat_logger = logging.getLogger('chat.sse')
message_logger = logging.getLogger('chat.messages')
api_logger = logging.getLogger('api')

def log_sse_connection(event_type, connection_id=None, user_id=None, **kwargs):
    chat_logger.info(f"SSE {event_type}", extra={
        'sse_event': event_type,
        'connection_id': connection_id,
        'user_id': user_id,
        'log_category': 'sse_connection',
        **kwargs
    })

def log_message_event(event_type, message_id=None, sender_id=None, recipient_id=None, chat_room=None, **kwargs):
    message_logger.info(f"Message Event: {event_type}", extra={
        'message_event_type': event_type,
        'message_id': message_id,
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'chat_room': chat_room,
        'log_category': 'chat_message',
        **kwargs
    })

def log_chat_room_event(event_type, room_id=None, user_id=None, **kwargs):
    chat_logger.info(f"Chat Room Event: {event_type}", extra={
        'room_event_type': event_type,
        'room_id': room_id,
        'user_id': user_id,
        'log_category': 'chat_room',
        **kwargs
    })

def log_chat_api_request(action_type='CHAT_API_CALL', **kwargs):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **func_kwargs):
            # Handle both function-based and class-based views
            if len(args) > 1 and hasattr(args[1], 'method'):
                # Class-based view: first argument is self, second is request
                request = args[1]
            elif len(args) > 0 and hasattr(args[0], 'method'):
                # Function-based view: first argument is request
                request = args[0]
            else:
                # No valid request found
                return func(*args, **func_kwargs)
                
            start_time = time.time()
            
            api_logger.info(f"Chat API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'http_method': request.method,  
                'request_path': request.path,   
                'request': request,
                **kwargs
            })
            
            try:
                response = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                api_logger.info(f"Chat API Request Completed: {action_type}", extra={
                    'action_type': action_type,
                    'view_name': func.__name__,
                    'status_code': getattr(response, 'status_code', 'unknown'),
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                
                return response
                
            except Exception as e:
                duration = time.time() - start_time
                
                api_logger.error(f"Chat API Request Failed: {action_type}", extra={
                    'action_type': action_type,
                    'view_name': func.__name__,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                raise
                
        return wrapper
    return decorator
    return decorator

def log_message_filter(filter_type, message_content=None, sender_id=None, action_taken=None, **kwargs):
    message_logger.info(f"Message Filter: {filter_type}", extra={
        'filter_type': filter_type,
        'message_content_length': len(message_content) if message_content else 0,
        'sender_id': sender_id,
        'filter_action': action_taken,
        'log_category': 'message_filtering',
        **kwargs
    })

def log_broadcast_event(event_type, recipient_count=0, message_type=None, **kwargs):
    chat_logger.info(f"Broadcast Event: {event_type}", extra={
        'broadcast_type': event_type,
        'recipient_count': recipient_count,
        'message_type': message_type,
        'log_category': 'broadcast',
        **kwargs
    })
