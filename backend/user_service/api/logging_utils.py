import logging
import time
from functools import wraps

api_logger = logging.getLogger('api')

def log_api_request(action_type='USER_API_CALL', **kwargs):
    """Log API requests specific to user service"""
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"User API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'method': request.method,
                'path': request.path,
                'request': request,
                **kwargs
            })
            
            try:
                response = func(request, *args, **func_kwargs)
                duration = time.time() - start_time
                
                api_logger.info(f"User API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"User API Request Failed: {action_type}", extra={
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

def log_authentication_event(event_type, user=None, success=True, **kwargs):
    """Log authentication events"""
    api_logger.info(f"Auth Event: {event_type}", extra={
        'auth_event_type': event_type,
        'user_id': getattr(user, 'id', None) if user else None,
        'user_name': getattr(user, 'user_name', None) if user else None,
        'auth_success': success,
        'log_category': 'authentication',
        **kwargs
    })

def log_validation_error(validation_type, error_details, **kwargs):
    """Log validation errors"""
    api_logger.warning(f"Validation Error: {validation_type}", extra={
        'validation_type': validation_type,
        'error_details': error_details,
        'log_category': 'validation',
        **kwargs
    })

def log_external_request(service_name, method, url, status_code=None, error=None, **kwargs):
    """Log external service requests"""
    if error:
        api_logger.error(f"External Request Failed: {service_name}", extra={
            'service_name': service_name,
            'method': method,
            'url': url,
            'error_message': str(error),
            'log_category': 'external_request',
            **kwargs
        })
    else:
        api_logger.info(f"External Request: {service_name}", extra={
            'service_name': service_name,
            'method': method,
            'url': url,
            'status_code': status_code,
            'log_category': 'external_request',
            **kwargs
        })

def log_user_action(action_type, username=None, success=True, **kwargs):
    """Log user actions like profile updates, friend actions"""
    api_logger.info(f"User Action: {action_type}", extra={
        'user_action_type': action_type,
        'username': username,
        'action_success': success,
        'log_category': 'user_action',
        **kwargs
    })

def log_file_operation(operation_type, filename=None, file_size=None, success=True, **kwargs):
    """Log file operations like avatar uploads"""
    level = api_logger.info if success else api_logger.error
    level(f"File Operation: {operation_type}", extra={
        'file_operation_type': operation_type,
        'filename': filename,
        'file_size_bytes': file_size,
        'operation_success': success,
        'log_category': 'file_operation',
        **kwargs
    })

def log_friend_action(action_type, username=None, target_user=None, success=True, **kwargs):
    """Log friend-related actions"""
    api_logger.info(f"Friend Action: {action_type}", extra={
        'friend_action_type': action_type,
        'username': username,
        'target_user': target_user,
        'action_success': success,
        'log_category': 'friend_action',
        **kwargs
    })
