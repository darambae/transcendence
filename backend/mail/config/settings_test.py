from .settings import * # Import all settings from your main settings.py

# =========================================================================
# Core Settings for Testing
# =========================================================================

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True # Keep DEBUG True for more detailed test output if needed

SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
# Use a dummy secret key for tests; no need for environment variable here
SECRET_KEY = 'a-super-secret-key-for-testing-only-dont-use-in-prod'

# Allow all hosts for testing purposes (often simpler)
ALLOWED_HOSTS = ['*']

# =========================================================================
# Database Configuration for Tests
# =========================================================================
# Use SQLite in-memory database for fast, isolated tests.
# This ensures tests don't interfere with real data and run quickly.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:', # In-memory database
    }
}

# =========================================================================
# Email Configuration for Tests
# =========================================================================
# Use the 'locmem' (local memory) email backend.
# This captures all sent emails into the `django.core.mail.outbox` list,
# allowing you to assert that emails were sent and inspect their content,
# without actually sending them over the network.
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
# No need for EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD here.

# =========================================================================
# CSRF and Security Settings for Tests
# =========================================================================
# For API tests using APIClient, CSRF is often not a concern as APIClient
# handles it or you explicitly disable it for testing.
# If you commented out 'django.middleware.csrf.CsrfViewMiddleware' in your main settings,
# it's already disabled. If it's active, APIClient usually manages it.
# However, you can explicitly disable these for test clarity if needed:
# CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_SECURE = False
# SECURE_SSL_REDIRECT = False
# SECURE_PROXY_SSL_HEADER = None # Or ('HTTP_X_FORWARDED_PROTO', 'http')

# =========================================================================
# Logging Configuration for Tests
# =========================================================================
# Simplify logging significantly for tests to avoid external dependencies (Logstash).
# You typically only want console logging during tests.
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'filters': {
#         'add_app_name': { # Keep this filter if you use APP_NAME in log records
#             '()': AddAppNameFilter, # Ensure AddAppNameFilter is still accessible (from .settings import *)
#         },
#     },
#     'formatters': {
#         'text': {
#             'format': '%(asctime)s [%(levelname)s] [%(name)s] [%(app_name)s] %(message)s',
#             'class': 'logging.Formatter',
#         },
#     },
#     'handlers': {
#         'console': {
#             'level': 'DEBUG',
#             'class': 'logging.StreamHandler',
#             'formatter': 'text',
#             'filters': ['add_app_name'], # Keep if you use AddAppNameFilter
#         }
#     },
#     'loggers': {
#         'django': {
#             'handlers': ['console'],
#             'level': 'INFO', # Use INFO to reduce verbosity in tests
#             'propagate': False,
#         },
#         'django.request': {
#             'handlers': ['console'],
#             'level': 'INFO',
#             'propagate': False,
#         },
#         'api': {
#             'handlers': ['console'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#     },
#     'root': {
#         'handlers': ['console'],
#         'level': 'WARNING',
#     },
# }
