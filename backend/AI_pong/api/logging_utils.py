import logging
import time
from functools import wraps

# Loggers for AI service
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

def log_ai_decision(decision_type, difficulty=None, player_position=None, ball_position=None, **kwargs):
    """Log AI decision-making process"""
    ai_logger.info(f"AI Decision: {decision_type}", extra={
        'decision_type': decision_type,
        'difficulty': difficulty,
        'player_position': player_position,
        'ball_position': ball_position,
        'log_category': 'ai_decision',
        **kwargs
    })

def log_performance_metric(metric_name, value, game_id=None, **kwargs):
    """Log performance metrics for AI"""
    performance_logger.info(f"AI Performance Metric: {metric_name}", extra={
        'metric_type': 'ai_performance',
        'metric_name': metric_name,
        'metric_value': value,
        'game_id': game_id,
        'app_name': 'AI_pong',
        'service_type': 'ai_service',
        **kwargs
    })

def log_websocket_event(event_type, connection_id=None, **kwargs):
    """Log WebSocket events for real-time game communication"""
    api_logger.info(f"WebSocket Event: {event_type}", extra={
        'event_type': event_type,
        'connection_id': connection_id,
        'log_category': 'websocket',
        'communication_type': 'websocket',
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
