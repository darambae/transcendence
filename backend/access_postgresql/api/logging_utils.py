import logging
import time
from functools import wraps

# Logging utilities for access_postgresql microservice
api_logger = logging.getLogger('api.views')
microservice_logger = logging.getLogger('microservice.requests')
performance_logger = logging.getLogger('performance')

def log_api_request(action_type='API_CALL', **kwargs):
    """Log API requests with structured data"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            start_time = time.time()
            
            # Log the incoming request
            api_logger.info(f"API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'class_name': self.__class__.__name__,
                'method': request.method,
                'path': request.path,
                'query_params': dict(request.GET),
                'content_length': request.META.get('CONTENT_LENGTH', 0),
                'request': request,
                **kwargs
            })
            
            try:
                response = func(self, request, *args, **kwargs)
                duration = time.time() - start_time
                
                # Log successful response
                api_logger.info(f"API Request Completed: {action_type}", extra={
                    'action_type': action_type,
                    'view_name': func.__name__,
                    'class_name': self.__class__.__name__,
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

def log_database_operation(operation_type, model_name=None, **kwargs):
    """Log database operations"""
    api_logger.info(f"Database Operation: {operation_type}", extra={
        'operation_type': operation_type,
        'model_name': model_name,
        'db_operation': True,
        **kwargs
    })

def log_inter_service_request(service_name, endpoint, method='POST', **kwargs):
    """Log requests to other microservices"""
    microservice_logger.info(f"Inter-service Request: {service_name}", extra={
        'target_service': service_name,
        'endpoint': endpoint,
        'method': method,
        'request_type': 'outbound',
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

def log_data_operation(operation, table_name=None, record_id=None, **kwargs):
    """Log data access and manipulation operations"""
    api_logger.info(f"Data Operation: {operation}", extra={
        'operation': operation,
        'table_name': table_name,
        'record_id': record_id,
        'data_operation': True,
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

def log_profile_operation(operation, user=None, changes=None, **kwargs):
    """Log user profile operations for audit trail"""
    api_logger.info(f"Profile Operation: {operation}", extra={
        'profile_operation': operation,
        'user_id': getattr(user, 'id', None) if user else None,
        'user_name': getattr(user, 'user_name', None) if user else None,
        'changes': changes,
        'audit_log': True,
        **kwargs
    })
