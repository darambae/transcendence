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
            
            api_logger.info(f"Tournament API Request Started: {action_type}", extra={
                'action_type': action_type,
                'view_name': func.__name__,
                'http_method': request.method,  # Changed from 'method' to 'http_method'
                'request_path': request.path,   # Changed from 'path' to 'request_path'
                'request': request,
                **kwargs
            })
            
            try:
                response = func(*args, **func_kwargs)
                duration = time.time() - start_time
                
                api_logger.info(f"Tournament API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Tournament API Request Failed: {action_type}", extra={
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
