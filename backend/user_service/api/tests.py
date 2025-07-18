from django.test import TestCase
from unittest.mock import patch

class SignupTestCase(TestCase):
    def setUp(self):
        self.valid_user = {
            'username': 'validuser',
            'password': 'ValidPassword1!',
            'mail': 'valid@email.com',
            'firstName': 'Valid',
            'lastName': 'User'
        }

    def test_username_too_long(self):
        user = self.valid_user.copy()
        user['username'] = 'a' * 30  # too long
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)

    @patch('backend.user_service.api.models.USER.objects')
    def test_username_exists(self, mock_user_objects):
        mock_user_objects.filter.return_value.exists.return_value = True
        response = self.client.post('/user-service/signup/', self.valid_user)
        self.assertEqual(response.status_code, 400)

    def test_invalid_email(self):
        user = self.valid_user.copy()
        user['mail'] = 'not-an-email'
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)

    def test_password_too_short(self):
        user = self.valid_user.copy()
        user['password'] = 'short'
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)

    def test_password_without_uppercase(self):
        user = self.valid_user.copy()
        user['password'] = 'lowercasetest1!'
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)
    def test_password_without_digit(self):
        user = self.valid_user.copy()
        user['password'] = 'NoDigitprovided!'
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)
    def test_password_without_special_char(self):
        user = self.valid_user.copy()
        user['password'] = 'NoSpecialChar1'
        response = self.client.post('/user-service/signup/', user)
        self.assertEqual(response.status_code, 400)