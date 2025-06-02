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
class AuthAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        # Create a test user
        self.test_user = USER.objects.create(
            user_name='testuser',
            first_name='Test',
            last_name='User',
            mail='baedaram@gmail.com',
            password=make_password('testpassword'),
            two_factor_Auth=None
        )
        # Create an invalid user
        self.invalid_user = USER.objects.create(
            user_name='invaliduser',
            first_name='Invalid',
            last_name='User',
            mail='baedaram@gmail.com',
            password=make_password('invalidpassword'),
            two_factor_Auth=None
        )

        self.login_url = reverse('auth/login')
        self.token_url = reverse('auth/token')

    def test_login_success(self, mock_generate_otp, mock_refresh_token):
        login_data = {
            'mail': self.test_user.mail,
            'password': self.test_user.password
        }
        response = self.client.post(self.login_url, data=json.dumps(login_data), content_type='application/json')
        self.assertEqual(response.status_code, 200) 
        response_data = response.json()
        self.assertEqual(response_data['success'], 'authentication code sent')
        self.assertEqual(response_data['user_id'], self.test_user.id)

        self.test_user.refresh_from_db()
        self.assertIsNotNone(self.test_user.two_factor_Auth)
        self.assertTrue(check_password('123456', self.test_user.two_factor_Auth))

        mock_generate_otp.assert_called_once_with(self.test_user)

    