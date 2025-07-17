import logging
import time
from functools import wraps

# Loggers for auth service
auth_logger = logging.getLogger('auth.events')
security_logger = logging.getLogger('auth.security')
api_logger = logging.getLogger('api')

def log_auth_attempt(auth_type, success=True, **kwargs):
    """Log authentication attempts"""
    level = logging.INFO if success else logging.WARNING
    
    auth_logger.log(level, f"Authentication Attempt: {auth_type}", extra={
        'auth_type': auth_type,
        'auth_success': success,
        'log_category': 'authentication',
        **kwargs
    })

def log_security_event(event_type, severity='INFO', **kwargs):
    """Log security-related events"""
    severity_levels = {
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    level = severity_levels.get(severity, logging.INFO)
    
    security_logger.log(level, f"Security Event: {event_type}", extra={
        'security_event_type': event_type,
        'severity': severity,
        'log_category': 'security',
        **kwargs
    })

def log_2fa_event(event_type, user_id=None, success=True, **kwargs):
    """Log two-factor authentication events"""
    auth_logger.info(f"2FA Event: {event_type}", extra={
        'tfa_event_type': event_type,
        'user_id': user_id,
        'tfa_success': success,
        'log_category': '2fa',
        **kwargs
    })

def log_auth_api_request(action_type='AUTH_API_CALL', **kwargs):
    """Log API requests specific to auth service"""
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
            
            api_logger.info(f"Auth API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'http_method': request.method,  # Changed from 'method'
                'request_path': request.path,   # Changed from 'path'
                'request': request,
                **kwargs
            })
            
            try:
                response = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                api_logger.info(f"Auth API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Auth API Request Failed: {action_type}", extra={
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
