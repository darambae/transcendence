"""
URL configuration for user_service project.

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
from django.contrib import admin
from django.urls import path
from api import views
from api.views import infoUser, avatar
from api.views import saveImg, savePrivateInfo, saveProfile, saveNewPassword
from api.views import searchUsers, infoOtherUser, avatarOther, addFriend, listennerFriends

urlpatterns = [
    path('admin/', admin.site.urls),
	path('user-service/csrf/', views.get_csrf_token, name='csrf'),
	path('user-service/signup/', views.signup, name='signup'),
	path('user-service/infoUser/', infoUser.as_view(), name='infoUser'),
	path('user-service/infoOtherUser/<str:username>/', infoOtherUser.as_view(), name='infoOtherUser'),
	path('user-service/avatar/', avatar.as_view(), name='avatar'),
	path('user-service/avatarOther/<str:username>/', avatarOther.as_view(), name='avatarOther'),
	path('user-service/saveImg/', saveImg.as_view(), name='saveImg'),
	path('user-service/saveNewPassword/', saveNewPassword.as_view(), name='saveNewPassword'),
	path('user-service/savePrivateInfo/', savePrivateInfo.as_view(), name='savePrivateInfo'),
	path('user-service/saveProfile/', saveProfile.as_view(), name='saveProfile'),
	path('user-service/searchUsers/', searchUsers.as_view(), name='searchUsers'),
	path('user-service/add/friend/', addFriend.as_view(), name='addFriend'),
	path('user-service/listennerFriends/', listennerFriends.as_view(), name='listennerFriends'),
]
