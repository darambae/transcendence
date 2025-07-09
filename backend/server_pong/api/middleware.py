import logging
from functools import wraps

logger = logging.getLogger('api')

class RequestLoggingMiddleware:
    """
    Middleware to log all requests and diagnose view function issues
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log the incoming request
        logger.info(f"Processing request: {request.method} {request.path}",
                   extra={
                       'method': request.method,
                       'path': request.path,
                       'content_type': request.content_type or 'none',
                       'has_body': bool(request.body),
                   })
        
        response = self.get_response(request)
        
        # Log the response
        logger.info(f"Response: {response.status_code}",
                   extra={
                       'status_code': response.status_code,
                       'content_type': response.get('Content-Type', 'none'),
                   })
        
        return response

def log_view_call(view_func):
    """
    Decorator to log when a view function is called and with what arguments
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        logger = logging.getLogger('api')
        logger.info(f"Calling view: {view_func.__name__}",
                   extra={
                       'view_name': view_func.__name__,
                       'args_count': len(args),
                       'kwargs_count': len(kwargs),
                       'request_present': request is not None,
                   })
        return view_func(request, *args, **kwargs)
    return wrapper
