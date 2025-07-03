"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
	https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from api.views import info_link, api_signup, activate_account, checkPassword, checkTfa, checkCurrentPassword, forgotPassword
from api.views import DecodeJwt, addResultGames, keyGame, api_signup, InfoUser
from api.views import uploadImgAvatar, uploadPrivateInfoUser, uploadProfile, uploadNewPassword, refreshToken
from api.views import infoOtherUser, searchUsers, listennerFriends, addFriend
from api.views import ChatGroupListCreateView, ChatMessageView
from api.views import info_link, api_signup, activate_account, checkPassword, checkTfa, InfoUser, declineInvite, acceptInvite, logout, disconnected
from api.views import ChatGroupListCreateView, blockedStatus
#, ChatMessageHistoryView, ChatMessageSendView
from api.views import matchHistory
from rest_framework_simplejwt.views import (TokenRefreshView)


urlpatterns = [
    # path('admin/', admin.site.urls),
	path('api/signup/', api_signup.as_view(), name='api_signup'),
	path('api/info_link/', info_link.as_view(), name='info_link'),
	path('api/activate_account/', activate_account.as_view(), name='activate_account'),
	path('api/checkPassword/', checkPassword.as_view(), name='checkPassword'),
	path('api/checkCurrentPassword/', checkCurrentPassword.as_view(), name='checkCurrentPassword'),
	path('api/checkTfa/', checkTfa.as_view(), name='checkTfa'),
	path('api/token/refresh/', refreshToken.as_view(), name='token_refresh'),
	path('api/DecodeJwt/', DecodeJwt.as_view(), name='DecodeJwt'),
	path('api/disconnected/<str:token>/', disconnected.as_view(), name='DecodeJwtExpired'),
	path('api/InfoUser/', InfoUser.as_view(), name='InfoUser'),
	path('api/infoOtherUser/<str:username>/', infoOtherUser.as_view(), name='infoOtherUser'),
	path('api/uploadImgAvatar/', uploadImgAvatar.as_view(), name='uploadImgAvatar'),
	path('api/uploadProfile/', uploadProfile.as_view(), name='uploadProfile'),
	path('api/uploadPrivateInfoUser/', uploadPrivateInfoUser.as_view(), name='uploadPrivateInfoUser'),
	path('api/uploadNewPassword/', uploadNewPassword.as_view(), name='uploadNewPassword'),
	path('api/addResultGames/', addResultGames.as_view(), name='addResultGames'),
	path('api/game/<str:key>/', keyGame.as_view(), name='keyGame'),
	path('api/searchUsers/', searchUsers.as_view(), name='searchUsers'),
	path('api/listennerFriends/', listennerFriends.as_view(), name='listennerFriends'),
	path('api/add/friend/', addFriend.as_view(), name='addFriend'),
	path('api/declineInvite/', declineInvite.as_view(), name='declineInvite'),
	path('api/acceptInvite/', acceptInvite.as_view(), name='acceptInvite'),
	path('api/matchHistory/', matchHistory.as_view(), name='matchHistory'),
    path('api/chat/', ChatGroupListCreateView.as_view(), name='chatgroup_list_create'),  # POST=create, GET=list
	path('api/logout/', logout.as_view(), name='logout'),
	path('api/forgotPassword/', forgotPassword.as_view(), name='forgotPassword'),

    # RESTful chat message endpoints
    path('api/chat/<int:group_id>/messages/', ChatMessageView.as_view(), name='chat_message'),  # GET=history POST=send message
	path('api/chat/<str:targetUser>/blockedStatus/', blockedStatus.as_view(), name='blockedUser')
]
