"""
URL configuration for app project.

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
# from django.contrib.auth.views import LogoutView, PasswordChangeView, PasswordChangeDoneView
# from . import views
from django.urls import path, include
from django.views.generic.base import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
	# path('user_service/', include('user.urls')),
	path('', TemplateView.as_view(template_name="index.html"))
]

# urlpatterns = [
#     path('', views.index_view.as_view(), name='index'),
#     path('admin/', admin.site.urls),
#     path('login/', views.login_view.as_view(), name='login'),
#     path('register/', views.register_view.as_view(), name='register'),
#     path('profile/', views.profile_view.as_view(), name='profile'),
#     path('logout/', LogoutView.as_view(), name='logout'),
#     path('change_password/', PasswordChangeView.as_view(), name='change_password'),
#     path('password_change/done/', PasswordChangeDoneView.as_view(template_name='password_change_done.html'), name='password_change_done')
#     # Add your app URLs here
# 
# ]
