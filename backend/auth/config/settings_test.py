# auth/config/settings_test.py

from .settings import * # Import all settings from your main settings.py
from datetime import timedelta
# =========================================================================
# Core Settings for Testing
# =========================================================================
DEBUG = True
SECRET_KEY = 'a-super-secret-key-for-testing-only-auth-service'
ALLOWED_HOSTS = ['*']

# =========================================================================
# Database Configuration for Tests
# =========================================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:', # In-memory database for fast, isolated tests
    }
}

# =========================================================================
# Email Configuration for Tests
# =========================================================================
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend' # Captures emails in django.core.mail.outbox

# =========================================================================
# CSRF and Security Settings for Tests
# =========================================================================
# Disable production-specific redirects for test client behavior
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None # Or ('HTTP_X_FORWARDED_PROTO', 'http')
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# =========================================================================
# Logging Configuration for Tests
# =========================================================================
# Simplify logging for tests to avoid external dependencies (Logstash).
# You typically only want console logging during tests.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'add_app_name': { # Keep this filter if it's used in your main settings
            '()': AddAppNameFilter, # Ensure AddAppNameFilter is available from .settings import *
        },
    },
    'formatters': {
        'text': {
            'format': '%(asctime)s [%(levelname)s] [%(name)s] [%(app_name)s] %(message)s',
            'class': 'logging.Formatter',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'text',
            'filters': ['add_app_name'], # Keep if you use AddAppNameFilter
        }
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO', # Reduce verbosity for Django's internal logs
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING', # Set root logger to a higher level
    },
}

# =========================================================================
# Simple JWT Settings for Tests
# =========================================================================
# You need a dummy signing key for JWTs in tests
SIMPLE_JWT = {
    'SIGNING_KEY': SECRET_KEY, # Use the test secret key for JWT signing
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5), # Define a timedelta here
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1), # Define a timedelta here
}
