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
        def wrapper(self, request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"Mail API Request Started: {action_type}", extra={
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
                
                api_logger.info(f"Mail API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Mail API Request Failed: {action_type}", extra={
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
