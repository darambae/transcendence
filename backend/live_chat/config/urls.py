"""
URL configuration for live_chat_sse project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
#from django.contrib.auth import views as auth_views #pour créer un fenêtre d'auth//A SUPPRIMER
from api import views

urlpatterns = [
    path("chat/", views.chat_page, name="chat_page"),
    path("chat/send/", views.send_message, name="send_message"),
    path("chat/group/create/private", views.create_or_get_private_group, name="create_private_group"),
    path("chat/stream/<str:group_name>/", views.sse_chat_stream, name="sse_chat_stream"),
    # NOUVELLE URL pour l'historique
    path("chat/history/<str:group_name>/", views.get_message_history, name="get_message_history"),

]
