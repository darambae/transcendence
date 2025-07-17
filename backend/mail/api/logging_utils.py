import logging
import time
from functools import wraps

mail_logger = logging.getLogger('mail.sender')
api_logger = logging.getLogger('api')

def log_mail_event(event_type, recipient=None, subject=None, template_name=None, success=True, **kwargs):
    """Log email sending events"""
    level = logging.INFO if success else logging.ERROR
    
    mail_logger.log(level, f"Email Event: {event_type}", extra={
        'email_event_type': event_type,
        'recipient': recipient,
        'email_subject': subject,
        'template_name': template_name,
        'email_success': success,
        'log_category': 'email_delivery',
        **kwargs
    })

def log_mail_api_request(action_type='MAIL_API_CALL', **kwargs):
    """Log API requests specific to mail service"""
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
            
            api_logger.info(f"Mail API Request Started: {action_type}", extra={
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
                
                api_logger.info(f"Mail API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Mail API Request Failed: {action_type}", extra={
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
