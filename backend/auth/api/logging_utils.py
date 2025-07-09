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

def log_token_operation(operation, token_type=None, success=True, **kwargs):
    """Log token-related operations (JWT, refresh tokens, etc.)"""
    auth_logger.info(f"Token Operation: {operation}", extra={
        'token_operation': operation,
        'token_type': token_type,
        'operation_success': success,
        'log_category': 'token_management',
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

def log_session_event(event_type, session_id=None, **kwargs):
    """Log session management events"""
    auth_logger.info(f"Session Event: {event_type}", extra={
        'session_event_type': event_type,
        'session_id': session_id,
        'log_category': 'session_management',
        **kwargs
    })

def log_auth_api_request(action_type='AUTH_API_CALL', **kwargs):
    """Log API requests specific to auth service"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"Auth API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'class_name': self.__class__.__name__,
                'method': request.method,
                'path': request.path,
                'request': request,
                **kwargs
            })
            
            try:
                response = func(self, request, *args, **func_kwargs)
                duration = time.time() - start_time
                
                api_logger.info(f"Auth API Request Completed: {action_type}", extra={
                    'action_type': action_type,
                    'view_name': func.__name__,
                    'class_name': self.__class__.__name__,
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
                    'class_name': self.__class__.__name__,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                raise
                
        return wrapper
    return decorator

def log_password_policy_violation(violation_type, user_id=None, **kwargs):
    """Log password policy violations"""
    security_logger.warning(f"Password Policy Violation: {violation_type}", extra={
        'violation_type': violation_type,
        'user_id': user_id,
        'log_category': 'password_policy',
        **kwargs
    })

def log_failed_login_attempt(user_identifier, attempt_count=1, **kwargs):
    """Log failed login attempts for brute force detection"""
    security_logger.warning("Failed Login Attempt", extra={
        'user_identifier': user_identifier,
        'attempt_count': attempt_count,
        'log_category': 'failed_login',
        'security_concern': 'brute_force',
        **kwargs
    })
