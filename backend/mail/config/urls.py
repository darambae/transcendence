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
from api.views import confirm_singup
from api.views import send_tfa, send_temp_password

urlpatterns = [
	path('mail/confirm_singup/', confirm_singup.as_view(), name='confirm_singup'),
	path('mail/send_tfa/', send_tfa.as_view(), name='send_tfa'),
	path('mail/send_temp_password/', send_temp_password.as_view(), name='sent_temp_password')
]
