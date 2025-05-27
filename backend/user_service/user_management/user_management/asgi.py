"""
ASGI config for user_management project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

<<<<<<<< HEAD:backend/user_service/user_management/user_management/asgi.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_management.settings')
========
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
>>>>>>>> elk:backend/user_service/config/asgi.py

application = get_asgi_application()
