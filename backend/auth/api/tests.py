from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.hashers import make_password, check_password
from django.http import JsonResponse
import json
from unittest.mock import patch, MagicMock
from .models import USER

# Create your tests here.
@patch('backend.auth.api.views.generate_otp_send_mail', return_value='123456')
@patch('backend.auth.api.views.RefreshToken')
class LoginTestCase(TestCase):
    def setUp(self):
        self.valid_user = {
            'username': 'validuser',
            'password': 'ValidPassword1!'
        }
    # Login with non-existing user
    # Login with incorrect password
    # Login without accepting email authentication
    # Login with incorrect 2FA code
    # Forgot password
