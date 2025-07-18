
from django.urls import path
from api.views import confirm_singup
from api.views import send_tfa, send_temp_password

urlpatterns = [
	path('mail/confirm_singup/', confirm_singup.as_view(), name='confirm_singup'),
	path('mail/send_tfa/', send_tfa.as_view(), name='send_tfa'),
	path('mail/send_temp_password/', send_temp_password.as_view(), name='sent_temp_password')
]
