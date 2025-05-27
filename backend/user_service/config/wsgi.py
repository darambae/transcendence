"""
WSGI config for user_management project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

<<<<<<<< HEAD:backend/user_service/user_management/user_management/wsgi.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_management.settings')
========
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
>>>>>>>> elk:backend/user_service/config/wsgi.py

application = get_wsgi_application()
