import logging
import time
from functools import wraps

api_logger = logging.getLogger('api.views')
performance_logger = logging.getLogger('performance')

def log_api_request(action_type='API_CALL', **kwargs):
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
            
            # Log the incoming request
            api_logger.info(f"API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'http_method': request.method,  # Changed from 'method' to 'http_method'
                'request_path': request.path,   # Changed from 'path' to 'request_path'
                'query_params': dict(request.GET),
                'content_length': request.META.get('CONTENT_LENGTH', 0),
                'request': request,
                **kwargs
            })
            
            try:
                response = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                # Log successful response
                api_logger.info(f"API Request Completed: {action_type}", extra={
                    'action_type': action_type,
                    'view_name': func.__name__,
                    'status_code': getattr(response, 'status_code', 'unknown'),
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                
                # Log performance metrics
                performance_logger.info("API Performance", extra={
                    'metric_type': 'api_response_time',
                    'endpoint': f"{request.method} {request.path}",
                    'duration_ms': round(duration * 1000, 2),
                    'status_code': getattr(response, 'status_code', 'unknown'),
                    'app_name': 'access-postgresql',
                    'service_type': 'data_manager',
                    'request': request,
                })
                
                return response
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Log error
                api_logger.error(f"API Request Failed: {action_type}", extra={
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

def log_database_operation(operation_type, model_name=None, **kwargs):
    """Log database operations"""
    api_logger.info(f"Database Operation: {operation_type}", extra={
        'operation_type': operation_type,
        'model_name': model_name,
        'db_operation': True,
        **kwargs
    })

def log_user_action(action, user=None, **kwargs):
    """Log user actions for audit trail"""
    api_logger.info(f"User Action: {action}", extra={
        'action': action,
        'user_id': getattr(user, 'id', None) if user else None,
        'user_name': getattr(user, 'user_name', None) if user else None,
        'audit_log': True,
        **kwargs
    })

def log_authentication_event(event_type, user=None, success=True, **kwargs):
    """Log authentication and authorization events"""
    level = api_logger.info if success else api_logger.warning
    level(f"Auth Event: {event_type}", extra={
        'auth_event': event_type,
        'user_id': getattr(user, 'id', None) if user else None,
        'user_name': getattr(user, 'user_name', None) if user else None,
        'success': success,
        'security_log': True,
        **kwargs
    })
