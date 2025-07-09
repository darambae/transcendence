from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
from .views import decodeJWT, dictApiSp, apiKeys
from .logging_utils import log_game_error, log_game_event, game_logger

@method_decorator(csrf_exempt, name='dispatch')
class ApiKeySPView(View):
    """
    Class-based view to handle API key requests for single player games.
    This view is used instead of the function-based setApiKeySp to avoid request parameter issues.
    """
    
    def post(self, request):
        """Handle POST requests for API key creation"""
        game_logger.info(f"ApiKeySPView POST called", 
                       extra={
                           'path': request.path,
                           'method': request.method,
                           'origin': request.META.get('HTTP_ORIGIN', 'unknown'),
                           'referer': request.META.get('HTTP_REFERER', 'unknown'),
                           'content_type': request.content_type or 'none',
                       })
        
        JWT = decodeJWT(request, "setApiKeySp")
        
        if not JWT[0]:
            log_game_error('UNAUTHORIZED_API_KEY_REQUEST', 
                         error_details='Missing or invalid JWT',
                         ip=request.META.get('REMOTE_ADDR'))
            return HttpResponse(status=401)  # Unauthorized
            
        user_id = JWT[0]['payload'].get('username', 'unknown')
        
        try:
            body = json.loads(request.body)
            apikey = body.get('apiKey')
            
            if not apikey:
                log_game_error('INVALID_API_KEY_REQUEST', 
                             error_details='Missing API key in request body',
                             user_id=user_id)
                return JsonResponse({'error': 'Missing API key'}, status=400)
            
            # Register the API key
            dictApiSp[apikey] = 1
            apiKeys.append(apikey)
            
            # Log the event - removing the duplicate event_type parameter
            log_game_event('API_KEY_REGISTERED', 
                         game_id=apikey, 
                         player1_id=user_id,
                         game_type='single_player')
            
            return JsonResponse({"playable": "Game can start"})
            
        except json.JSONDecodeError:
            log_game_error('MALFORMED_REQUEST', 
                         error_details='Invalid JSON in request body',
                         user_id=user_id)
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            log_game_error('API_KEY_REGISTRATION_FAILED',
                         error_details=str(e),
                         error_type=type(e).__name__,
                         user_id=user_id)
            return JsonResponse({'error': f'Internal server error: {str(e)}'}, status=500)
