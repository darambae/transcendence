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

from api.views import sse_chat_stream, ChatGroupListCreateView, ChatMessageHistoryView, ChatMessageSendView
urlpatterns = [
    path('chat/', ChatGroupListCreateView.as_view(), name='chatgroup_list_create'),  # POST=create, GET=list
    path("chat/stream/<str:group_name>/", sse_chat_stream, name="sse_chat_stream"),
    # RESTful chat message endpoints
    path('chat/<str:group_name>/messages/', ChatMessageHistoryView.as_view(), name='chat_message_history'),  # GET=history
    path('chat/<str:group_name>/messages/', ChatMessageSendView.as_view(), name='chat_message_send'),  # POST=send message
]
