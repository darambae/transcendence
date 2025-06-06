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
from api.views import info_link
from api.views import activate_account
from api.views import check_password

urlpatterns = [
    path('admin/', admin.site.urls),
	path('api/signup/', views.api_signup, name='api_signup'),
	path('api/info_link/', info_link.as_view(), name='info_link'),
	path('api/activate_account/', activate_account.as_view(), name='activate_account'),
	path('api/check_password/', check_password.as_view(), name='check_password')
]
