import logging
import time
from functools import wraps

# Loggers for mail service
mail_logger = logging.getLogger('mail.sender')
template_logger = logging.getLogger('mail.templates')
api_logger = logging.getLogger('api')

def log_email_event(event_type, recipient=None, subject=None, template_name=None, success=True, **kwargs):
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

def log_template_processing(template_name, user_id=None, processing_time=None, **kwargs):
    """Log email template processing"""
    template_logger.info(f"Template Processing: {template_name}", extra={
        'template_name': template_name,
        'user_id': user_id,
        'processing_time_ms': processing_time,
        'log_category': 'template_processing',
        **kwargs
    })

def log_email_validation(validation_type, email_address=None, is_valid=True, **kwargs):
    """Log email validation events"""
    mail_logger.info(f"Email Validation: {validation_type}", extra={
        'validation_type': validation_type,
        'email_address': email_address,
        'is_valid': is_valid,
        'log_category': 'email_validation',
        **kwargs
    })

def log_delivery_status(status, recipient=None, message_id=None, error_details=None, **kwargs):
    """Log email delivery status"""
    level = logging.INFO if status == 'delivered' else logging.WARNING
    
    mail_logger.log(level, f"Email Delivery Status: {status}", extra={
        'delivery_status': status,
        'recipient': recipient,
        'message_id': message_id,
        'error_details': error_details,
        'log_category': 'delivery_status',
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

def log_smtp_connection(event_type, smtp_server=None, success=True, **kwargs):
    """Log SMTP connection events"""
    level = logging.INFO if success else logging.ERROR
    
    mail_logger.log(level, f"SMTP Connection: {event_type}", extra={
        'smtp_event_type': event_type,
        'smtp_server': smtp_server,
        'connection_success': success,
        'log_category': 'smtp_connection',
        **kwargs
    })

def log_email_queue(action, queue_size=None, email_id=None, **kwargs):
    """Log email queue operations"""
    mail_logger.info(f"Email Queue {action}", extra={
        'queue_action': action,
        'queue_size': queue_size,
        'email_id': email_id,
        'log_category': 'email_queue',
        **kwargs
    })

def log_email_attachment(action, filename=None, file_size=None, **kwargs):
    """Log email attachment processing"""
    mail_logger.info(f"Email Attachment {action}", extra={
        'attachment_action': action,
        'filename': filename,
        'file_size_bytes': file_size,
        'log_category': 'email_attachment',
        **kwargs
    })

def log_email_bounce(bounce_type, recipient=None, bounce_reason=None, **kwargs):
    """Log email bounce events"""
    mail_logger.warning(f"Email Bounce: {bounce_type}", extra={
        'bounce_type': bounce_type,
        'recipient': recipient,
        'bounce_reason': bounce_reason,
        'log_category': 'email_bounce',
        **kwargs
    })

def log_mail_performance_metric(metric_name, value, **kwargs):
    """Log mail service performance metrics"""
    mail_logger.info(f"Mail Performance Metric: {metric_name}", extra={
        'metric_type': 'mail_performance',
        'metric_name': metric_name,
        'metric_value': value,
        'app_name': 'mail',
        'service_type': 'mail_service',
        **kwargs
    })
