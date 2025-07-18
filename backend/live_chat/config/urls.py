
from django.urls import path

from api.views import sse_chat_stream, sse_notification_stream, ChatGroupListCreateView, ChatMessageView, blockedStatus
urlpatterns = [
    path('chat/', ChatGroupListCreateView.as_view(), name='chatgroup_list_create'),
    path('chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message'),
    path('chat/stream/<int:group_id>/', sse_chat_stream, name="sse_chat_stream"),
    path('chat/<int:targetUserId>/blockedStatus/', blockedStatus.as_view(), name="Blocked_status"),
    path('chat/stream/notification/<int:currentUserId>/', sse_notification_stream, name="sse_notification_stream"),
]
