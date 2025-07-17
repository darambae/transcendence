import logging
import time
from functools import wraps

# Loggers for tournament service
tournament_logger = logging.getLogger('tournament.manager')
api_logger = logging.getLogger('api')

def log_tournament_event(event_type, tournament_id=None, participant_count=None, **kwargs):
    """Log tournament-related events"""
    tournament_logger.info(f"Tournament Event: {event_type}", extra={
        'tournament_event_type': event_type,
        'tournament_id': tournament_id,
        'participant_count': participant_count,
        'log_category': 'tournament_event',
        **kwargs
    })

def log_tournament_match(match_event, tournament_id=None, match_id=None, round_number=None, **kwargs):
    """Log tournament match events"""
    tournament_logger.info(f"Tournament Match: {match_event}", extra={
        'match_event_type': match_event,
        'tournament_id': tournament_id,
        'match_id': match_id,
        'round_number': round_number,
        'log_category': 'tournament_match',
        **kwargs
    })

def log_tournament_api_request(action_type='TOURNAMENT_API_CALL', **kwargs):
    """Log API requests specific to tournament service"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"Tournament API Request Started: {action_type}", extra={
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
                
                api_logger.info(f"Tournament API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Tournament API Request Failed: {action_type}", extra={
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
