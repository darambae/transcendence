import logging
import time
from functools import wraps

api_logger = logging.getLogger('api')

def log_api_request(action_type='USER_API_CALL', **kwargs):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **func_kwargs):
            if len(args) > 1 and hasattr(args[1], 'method'):
                request = args[1]
            elif len(args) > 0 and hasattr(args[0], 'method'):
                request = args[0]
            else:
                return func(*args, **func_kwargs)
                
            start_time = time.time()
            
            api_logger.info(f"User API Request Started: {action_type}", extra={
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
    api_logger.info(f"Auth Event: {event_type}", extra={
        'auth_event_type': event_type,
        'user_id': getattr(user, 'id', None) if user else None,
        'user_name': getattr(user, 'user_name', None) if user else None,
        'auth_success': success,
        'log_category': 'authentication',
        **kwargs
    })

def log_validation_error(validation_type, error_details, **kwargs):
    api_logger.warning(f"Validation Error: {validation_type}", extra={
        'validation_type': validation_type,
        'error_details': error_details,
        'log_category': 'validation',
        **kwargs
    })

def log_external_request(service_name, method, url, status_code=None, error=None, **kwargs):
    if error:
        api_logger.error(f"External Request Failed: {service_name}", extra={
            'service_name': service_name,
            'http_method': method,
            'request_url': url, 
            'error_message': str(error),
            'log_category': 'external_request',
            **kwargs
        })
    else:
        api_logger.info(f"External Request: {service_name}", extra={
            'service_name': service_name,
            'http_method': method,  
            'request_url': url,
            'status_code': status_code,
            'log_category': 'external_request',
            **kwargs
        })

def log_user_action(action_type, username=None, success=True, **kwargs):
    api_logger.info(f"User Action: {action_type}", extra={
        'user_action_type': action_type,
        'username': username,
        'action_success': success,
        'log_category': 'user_action',
        **kwargs
    })

def log_file_operation(operation_type, filename=None, file_size=None, success=True, **kwargs):
    level = api_logger.info if success else api_logger.error
    level(f"File Operation: {operation_type}", extra={
        'file_operation_type': operation_type,
        'file_name': filename,
        'file_size_bytes': file_size,
        'operation_success': success,
        'log_category': 'file_operation',
        **kwargs
    })

def log_friend_action(action_type, username=None, target_user=None, success=True, **kwargs):
    api_logger.info(f"Friend Action: {action_type}", extra={
        'friend_action_type': action_type,
        'username': username,
        'target_user': target_user,
        'action_success': success,
        'log_category': 'friend_action',
        **kwargs
    })

def log_password_change(success=True, error_reason=None, **kwargs):
    level = api_logger.info if success else api_logger.warning
    level(f"Password Change: {'SUCCESS' if success else 'FAILED'}", extra={
        'password_change_success': success,
        'error_reason': error_reason,
        'log_category': 'password_change',
        **kwargs
    })

def log_search_action(search_type, query=None, results_count=None, success=True, **kwargs):
    api_logger.info(f"Search Action: {search_type}", extra={
        'search_type': search_type,
        'query': query,
        'results_count': results_count,
        'search_success': success,
        'log_category': 'search_action',
        **kwargs
    })

def log_proxy_request(target_service, method, endpoint, status_code=None, error=None, **kwargs):
    if error:
        api_logger.error(f"Proxy Request Failed: {target_service}", extra={
            'target_service': target_service,
            'http_method': method,
            'endpoint': endpoint,
            'error_message': str(error),
            'log_category': 'proxy_request',
            **kwargs
        })
    else:
        api_logger.info(f"Proxy Request: {target_service}", extra={
            'target_service': target_service,
            'http_method': method,
            'endpoint': endpoint,
            'status_code': status_code,
            'log_category': 'proxy_request',
            **kwargs
        })
