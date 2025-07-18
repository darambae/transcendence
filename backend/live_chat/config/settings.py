
from pathlib import Path
import os
import logging


APP_NAME = 'live_chat'

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend/')
DOMAIN = os.getenv('DOMAIN', 'localhost')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

DEBUG = True

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    "https://transcendence.42.fr:8443",
    "https://localhost:8443",
    "https://192.168.1.34:8443"
]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_HEADERS = True

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = False


INSTALLED_APPS = [
	'channels',
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
	'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("redis", 6379)],
        },
    },
}

WSGI_APPLICATION = 'config.wsgi.application'


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = FRONTEND_DIR

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

class AddAppNameFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, 'app_name'):
            record.app_name = APP_NAME
        return True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'add_app_name': {
            '()': AddAppNameFilter,
        },
    },
    'formatters': {
        'text': {
            'format': '%(asctime)s [%(levelname)s] [%(name)s] [%(app_name)s] %(message)s',
            'class': 'logging.Formatter',
        },
        'logstash': {
            '()': 'logstash_async.formatter.DjangoLogstashFormatter',
        },
    },
    'handlers': {
        'logstash': {
            'level': 'DEBUG',
            'class': 'logstash_async.handler.AsynchronousLogstashHandler',
            'host': 'logstash',
            'port': 6006,
            'database_path': os.path.join(BASE_DIR, 'logstash.db'),
            'ssl_enable': False,
            'formatter': 'logstash',
            'ensure_ascii': True,
            'filters': ['add_app_name'],
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'text',
            'filters': ['add_app_name'],
        }
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
            'handlers': ['console' ,'logstash'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'logstash'],
        'level': 'WARNING',
    },
}

