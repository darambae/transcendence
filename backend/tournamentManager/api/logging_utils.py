import logging
import time
from functools import wraps

# Loggers for tournament service
tournament_logger = logging.getLogger('tournament.manager')
bracket_logger = logging.getLogger('tournament.brackets')
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

def log_bracket_operation(operation, tournament_id=None, bracket_data=None, **kwargs):
    """Log bracket generation and management"""
    bracket_logger.info(f"Bracket Operation: {operation}", extra={
        'bracket_operation': operation,
        'tournament_id': tournament_id,
        'bracket_data': bracket_data,
        'log_category': 'bracket_management',
        **kwargs
    })

def log_participant_action(action, tournament_id=None, participant_id=None, **kwargs):
    """Log participant actions in tournaments"""
    tournament_logger.info(f"Participant Action: {action}", extra={
        'participant_action': action,
        'tournament_id': tournament_id,
        'participant_id': participant_id,
        'log_category': 'participant_action',
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

def log_tournament_progression(event, tournament_id=None, current_round=None, remaining_players=None, **kwargs):
    """Log tournament progression events"""
    tournament_logger.info(f"Tournament Progression: {event}", extra={
        'progression_event': event,
        'tournament_id': tournament_id,
        'current_round': current_round,
        'remaining_players': remaining_players,
        'log_category': 'tournament_progression',
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

def log_seeding_operation(operation, tournament_id=None, seed_algorithm=None, **kwargs):
    """Log tournament seeding operations"""
    tournament_logger.info(f"Seeding Operation: {operation}", extra={
        'seeding_operation': operation,
        'tournament_id': tournament_id,
        'seed_algorithm': seed_algorithm,
        'log_category': 'tournament_seeding',
        **kwargs
    })

def log_tournament_completion(tournament_id, winner_id=None, duration=None, **kwargs):
    """Log tournament completion"""
    tournament_logger.info("Tournament Completed", extra={
        'tournament_id': tournament_id,
        'winner_id': winner_id,
        'tournament_duration_ms': duration,
        'log_category': 'tournament_completion',
        **kwargs
    })

def log_tournament_performance(metric_name, value, tournament_id=None, **kwargs):
    """Log tournament performance metrics"""
    tournament_logger.info(f"Tournament Performance: {metric_name}", extra={
        'metric_type': 'tournament_performance',
        'metric_name': metric_name,
        'metric_value': value,
        'tournament_id': tournament_id,
        'app_name': 'tournamentManager',
        'service_type': 'tournament_service',
        **kwargs
    })

def log_registration_event(event_type, tournament_id=None, user_id=None, **kwargs):
    """Log tournament registration events"""
    tournament_logger.info(f"Registration Event: {event_type}", extra={
        'registration_event': event_type,
        'tournament_id': tournament_id,
        'user_id': user_id,
        'log_category': 'tournament_registration',
        **kwargs
    })
