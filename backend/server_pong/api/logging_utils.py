import logging
import time
from functools import wraps

# Loggers for game server service
game_logger = logging.getLogger('game.server')
match_logger = logging.getLogger('game.matches')
stream_logger = logging.getLogger('game.streams')
api_logger = logging.getLogger('api')

def log_game_event(event_type, game_id=None, player1_id=None, player2_id=None, **kwargs):
    """Log game-related events"""
    game_logger.info(f"Game Event: {event_type}", extra={
        'game_event_type': event_type,
        'game_id': game_id,
        'player1_id': player1_id,
        'player2_id': player2_id,
        'log_category': 'game_event',
        **kwargs
    })

def log_match_result(game_id, winner_id=None, loser_id=None, score=None, duration=None, **kwargs):
    """Log match completion results"""
    match_logger.info("Match Completed", extra={
        'game_id': game_id,
        'winner_id': winner_id,
        'loser_id': loser_id,
        'final_score': score,
        'match_duration_ms': duration,
        'log_category': 'match_result',
        **kwargs
    })

def log_player_action(action_type, game_id=None, player_id=None, action_data=None, **kwargs):
    """Log player actions during gameplay"""
    game_logger.info(f"Player Action: {action_type}", extra={
        'player_action_type': action_type,
        'game_id': game_id,
        'player_id': player_id,
        'action_data': action_data,
        'log_category': 'player_action',
        **kwargs
    })

def log_server_event(event_type, server_id=None, capacity=None, active_games=None, **kwargs):
    """Log game server events"""
    game_logger.info(f"Server Event: {event_type}", extra={
        'server_event_type': event_type,
        'server_id': server_id,
        'server_capacity': capacity,
        'active_games_count': active_games,
        'log_category': 'server_event',
        **kwargs
    })

def log_stream_connection_event(event_type, connection_id=None, game_id=None, player_id=None, **kwargs):
    """Log SSE streaming connection events for client-side connections"""
    stream_logger.info(f"Stream Connection Event: {event_type}", extra={
        'stream_event_type': event_type,
        'connection_id': connection_id,
        'game_id': game_id,
        'player_id': player_id,
        'log_category': 'stream_connection',
        **kwargs
    })

def log_game_state_change(game_id, old_state=None, new_state=None, trigger=None, **kwargs):
    """Log game state transitions"""
    game_logger.info("Game State Change", extra={
        'game_id': game_id,
        'old_state': old_state,
        'new_state': new_state,
        'state_change_trigger': trigger,
        'log_category': 'game_state',
        **kwargs
    })

def log_game_api_request(action_type='GAME_API_CALL', **kwargs):
    """Log API requests specific to game service"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **func_kwargs):
            start_time = time.time()
            
            api_logger.info(f"Game API Request Started: {action_type}", extra={
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
                
                api_logger.info(f"Game API Request Completed: {action_type}", extra={
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
                
                api_logger.error(f"Game API Request Failed: {action_type}", extra={
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

def log_player_disconnect(game_id, player_id=None, disconnect_reason=None, **kwargs):
    """Log player disconnections"""
    game_logger.warning("Player Disconnected", extra={
        'game_id': game_id,
        'player_id': player_id,
        'disconnect_reason': disconnect_reason,
        'log_category': 'player_disconnect',
        **kwargs
    })

def log_game_error(error_type, game_id=None, error_details=None, **kwargs):
    """Log game-specific errors"""
    game_logger.error(f"Game Error: {error_type}", extra={
        'game_error_type': error_type,
        'game_id': game_id,
        'error_details': error_details,
        'log_category': 'game_error',
        **kwargs
    })
