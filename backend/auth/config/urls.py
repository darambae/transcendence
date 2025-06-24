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
from django.contrib import admin
from django.urls import path
from api import views
from api.views import data_link
from api.views import login
from api.views import verifyTwofa, refreshToken

urlpatterns = [
    path('admin/', admin.site.urls),
	path('auth_api/data_link/', data_link.as_view(), name='data_link'),
    path('auth/login/', login.as_view(), name='login'),
    path('auth/verifyTwofa/', verifyTwofa.as_view(), name='verifyTwofa'),
	path('auth/activate_account/<uidb64>/<token>/', views.activate_account, name='activate_account'),
    path('auth/refresh-token/', refreshToken.as_view(), name='refreshToken')
] 
