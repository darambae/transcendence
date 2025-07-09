# Enhanced logging configuration for proxy microservices
import os
import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APP_NAME = 'user-service'  # Change this for each service

class AddAppNameFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, 'app_name'):
            record.app_name = APP_NAME
        return True

class RequestContextFilter(logging.Filter):
    """Add request context to log records"""
    def filter(self, record):
        request = getattr(record, 'request', None)
        if request:
            record.user_id = getattr(request.user, 'id', 'anonymous') if hasattr(request, 'user') else 'unknown'
            record.user_name = getattr(request.user, 'user_name', 'anonymous') if hasattr(request, 'user') else 'unknown'
            record.request_id = getattr(request, 'META', {}).get('HTTP_X_REQUEST_ID', 'no-request-id')
            record.client_ip = self.get_client_ip(request)
            record.user_agent = request.META.get('HTTP_USER_AGENT', 'unknown')
            record.request_method = request.method
            record.request_path = request.path
            record.content_type = request.META.get('CONTENT_TYPE', 'unknown')
        else:
            record.user_id = 'system'
            record.user_name = 'system'
            record.request_id = 'system'
            record.client_ip = 'system'
            record.user_agent = 'system'
            record.request_method = 'system'
            record.request_path = 'system'
            record.content_type = 'system'
        return True
    
    def get_client_ip(self, request):
        """Get the real client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'add_app_name': {
            '()': AddAppNameFilter,
        },
        'request_context': {
            '()': RequestContextFilter,
        },
    },
    'formatters': {
        'text': {
            'format': '%(asctime)s [%(levelname)s] [%(app_name)s] [%(name)s] [User:%(user_name)s] [%(request_method)s %(request_path)s] %(message)s',
            'class': 'logging.Formatter',
        },
        'logstash': {
            '()': 'logstash_async.formatter.DjangoLogstashFormatter',
            'extra_fields': {
                'app_name': 'app_name',
                'user_id': 'user_id', 
                'user_name': 'user_name',
                'request_id': 'request_id',
                'client_ip': 'client_ip',
                'user_agent': 'user_agent',
                'request_method': 'request_method',
                'request_path': 'request_path',
                'content_type': 'content_type',
                'service_type': 'proxy_service',  # For proxy services
            },
        },
    },
    'handlers': {
        'logstash': {
            'level': 'INFO',
            'class': 'logstash_async.handler.AsynchronousLogstashHandler',
            'host': 'logstash',
            'port': 6006,
            'database_path': os.path.join(BASE_DIR, 'logstash.db'),
            'ssl_enable': False,
            'formatter': 'logstash',
            'ensure_ascii': True,
            'filters': ['add_app_name', 'request_context'],
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'text',
            'filters': ['add_app_name', 'request_context'],
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'logstash'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'logstash'],
            'level': 'INFO',
            'propagate': False,
        },
        'proxy.requests': {  # Custom logger for proxy requests
            'handlers': ['console', 'logstash'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
