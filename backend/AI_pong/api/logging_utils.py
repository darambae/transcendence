import logging
import time
from functools import wraps

ai_logger = logging.getLogger('ai.game')
performance_logger = logging.getLogger('ai.performance')
api_logger = logging.getLogger('api')

def log_ai_operation(operation_type, **kwargs):
    """Log AI-specific operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **func_kwargs):
            start_time = time.time()
            
            ai_logger.info(f"AI Operation Started: {operation_type}", extra={
                'ai_operation': operation_type,
                'function_name': func.__name__,
                **kwargs
            })
            
            try:
                result = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                ai_logger.info(f"AI Operation Completed: {operation_type}", extra={
                    'ai_operation': operation_type,
                    'function_name': func.__name__,
                    'duration_ms': round(duration * 1000, 2),
                    'success': True,
                    **kwargs
                })
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                ai_logger.error(f"AI Operation Failed: {operation_type}", extra={
                    'ai_operation': operation_type,
                    'function_name': func.__name__,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'duration_ms': round(duration * 1000, 2),
                    'success': False,
                    **kwargs
                })
                raise
                
        return wrapper
    return decorator

def log_game_event(event_type, game_id=None, player_info=None, **kwargs):
    """Log game-related events"""
    ai_logger.info(f"Game Event: {event_type}", extra={
        'event_type': event_type,
        'game_id': game_id,
        'player_info': player_info,
        'log_category': 'game_event',
        **kwargs
    })

def log_api_request(action_type='AI_API_CALL', **kwargs):
    """Log API requests specific to AI service"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"AI API Request Started: {action_type}", extra={
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
                
                api_logger.info(f"AI API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"AI API Request Failed: {action_type}", extra={
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
