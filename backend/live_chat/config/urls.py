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
from django.urls import path
#from django.contrib.auth import views as auth_views #pour créer un fenêtre d'auth//A SUPPRIMER

from api.views import sse_chat_stream, sse_notification_stream, ChatGroupListCreateView, ChatMessageView, blockedStatus, tournamentChat
urlpatterns = [
    path('chat/', ChatGroupListCreateView.as_view(), name='chatgroup_list_create'),# GET=list POST=create
    path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message'),  # GET=history # POST=send message
    path('chat/stream/<int:group_id>/', sse_chat_stream, name="sse_chat_stream"),
	path('chat/<int:targetUserId>/blockedStatus/', blockedStatus.as_view(), name="Blocked_status"),
	path('chat/stream/notification/<int:currentUserId>/', sse_notification_stream, name="sse_notification_stream"),
	path('chat/tournament/', tournamentChat.as_view(), name='tournament_chat')
]
