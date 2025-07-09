import logging
import time
import requests
from functools import wraps

# Loggers for different purposes
proxy_logger = logging.getLogger('proxy.requests')
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

def log_proxy_request(target_service, **kwargs):
    """Decorator for logging proxy requests to other services"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **func_kwargs):
            start_time = time.time()
            request = args[1] if len(args) > 1 else func_kwargs.get('request')
            
            # Log the incoming request
            proxy_logger.info(f"Proxy Request Started: {target_service}", extra={
                'target_service': target_service,
                'proxy_action': 'request_start',
                'function_name': func.__name__,
                'request': request,
                **kwargs
            })
            
            try:
                result = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                # Log successful proxy request
                proxy_logger.info(f"Proxy Request Completed: {target_service}", extra={
                    'target_service': target_service,
                    'proxy_action': 'request_complete',
                    'function_name': func.__name__,
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Log failed proxy request
                proxy_logger.error(f"Proxy Request Failed: {target_service}", extra={
                    'target_service': target_service,
                    'proxy_action': 'request_failed',
                    'function_name': func.__name__,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'duration_ms': round(duration * 1000, 2),
                    'request': request,
                    **kwargs
                })
                raise
                
        return wrapper
    return decorator

def log_external_request(url, method='POST', timeout=None, **kwargs):
    """Log outbound HTTP requests to other services"""
    start_time = time.time()
    
    # Extract service name from URL
    service_name = 'unknown'
    if '://' in url:
        parts = url.split('://')[1].split('/')
        if parts:
            service_name = parts[0].split(':')[0]
    
    proxy_logger.info("External Request Started", extra={
        'target_service': service_name,
        'target_url': url,
        'method': method,
        'timeout': timeout,
        'request_type': 'outbound',
        **kwargs
    })
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, timeout=timeout, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(url, timeout=timeout, **kwargs)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, timeout=timeout, **kwargs)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, timeout=timeout, **kwargs)
        else:
            response = requests.request(method, url, timeout=timeout, **kwargs)
        
        duration = time.time() - start_time
        
        proxy_logger.info("External Request Completed", extra={
            'target_service': service_name,
            'target_url': url,
            'method': method,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'response_size': len(response.content) if response.content else 0,
            'request_type': 'outbound',
        })
        
        return response
        
    except requests.exceptions.RequestException as e:
        duration = time.time() - start_time
        
        proxy_logger.error("External Request Failed", extra={
            'target_service': service_name,
            'target_url': url,
            'method': method,
            'error_type': type(e).__name__,
            'error_message': str(e),
            'duration_ms': round(duration * 1000, 2),
            'request_type': 'outbound',
        })
        raise

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
