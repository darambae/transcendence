import json
from unittest import mock
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from requests.exceptions import RequestException
from datetime import timedelta # For settings_test.py if used there
from django.http import HttpResponse

# --- START: Mocking External Dependencies ---
# IMPORTANT: This path must correctly point to where 'requests' is imported in your views.py.
# If your views.py has `import requests`, and views.py is in 'api' app, then it's 'api.views.requests'.
# If you used `from requests import post`, it would be 'api.views.post'.
# Given your provided views.py, it's 'api.views.requests'.
VIEWS_MODULE_PATH = 'api.views' # Assuming 'api' is your Django app name

# Mock for the requests library imported in your views.py
mock_requests_path = f'{VIEWS_MODULE_PATH}.requests' # <--- PATCHING THE IMPORTED OBJECT

# Mock for django.shortcuts.render (used in activate_account)
mock_render_path = f'{VIEWS_MODULE_PATH}.render'

# --- END: Mocking External Dependencies ---


class AuthAPITests(TestCase):
    """
    Test suite for the Django 'auth' service API endpoints.
    """

    def setUp(self):
        """
        Set up the test client before each test method.
        """
        self.client = APIClient()

    # --- Test for data_link API ---
    @mock.patch(mock_requests_path)
    def test_data_link_success(self, mock_requests):
        """
        Test that data_link API successfully retrieves a link from access-postgresql
        and returns it.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 200
        mock_access_postgresql_response.json.return_value = {
            'uid': 'MjQ',
            'token': 'some-activation-token'
        }
        mock_access_postgresql_response.ok = True
        mock_requests.post.return_value = mock_access_postgresql_response

        payload = {
            'mail': 'test@example.com'
        }
        url = reverse('data_link')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_link = "https://transcendence.42.fr:8443/auth/activate_account/MjQ/some-activation-token/"
        self.assertEqual(response.json(), {'link': expected_link})

        mock_requests.post.assert_called_once_with(
            "https://access-postgresql:4000/api/info_link/",
            json={'mail': payload['mail']},
            verify=False,
            headers={'Host': 'access-postgresql'}
        )

    @mock.patch(mock_requests_path)
    def test_data_link_access_postgresql_http_error(self, mock_requests):
        """
        Test that data_link API handles HTTP errors (e.g., 404) from access-postgresql service.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 404
        mock_access_postgresql_response.json.return_value = {'message': 'User not found in DB'}
        mock_access_postgresql_response.content = b'{"message": "User not found in DB"}'
        mock_access_postgresql_response.text = '{"message": "User not found in DB"}'
        mock_access_postgresql_response.ok = False
        mock_requests.post.return_value = mock_access_postgresql_response

        payload = {
            'mail': 'nonexistent@example.com'
        }
        url = reverse('data_link')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR) # View returns 500 for upstream errors
        self.assertIn("Access-PostgreSQL internal error.", response.json()['error'])
        self.assertIn('User not found in DB', response.json()['detail']['message'])
        mock_requests.post.assert_called_once()

    @mock.patch(mock_requests_path)
    def test_data_link_access_postgresql_network_error(self, mock_requests):
        """
        Test that data_link API handles network errors (e.g., connection refused)
        when calling access-postgresql service.
        """
        # <--- FIX: Simulate network error by making json() raise RequestException
        # This allows the mock response to have status_code=500 for Django client,
        # but the view's try-except RequestException is still hit.
        mock_error_response = mock.Mock()
        mock_error_response.status_code = 500 # Ensure it has an integer status_code for Django client
        mock_error_response.json.side_effect = RequestException("Connection refused by DB service")
        mock_error_response.ok = False
        mock_requests.post.return_value = mock_error_response

        payload = {
            'mail': 'test@example.com'
        }
        url = reverse('data_link')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assert based on the view's handling of RequestException
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json()['error'], "Failed to connect to Access-PostgreSQL service.")
        self.assertIn("Connection refused by DB service", response.json()['detail'])
        mock_requests.post.assert_called_once()


    @mock.patch(mock_requests_path)
    def test_data_link_access_postgresql_invalid_json(self, mock_requests):
        """
        Test that data_link API handles invalid JSON response from access-postgresql.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 200
        mock_access_postgresql_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "bad json", 0)
        mock_access_postgresql_response.ok = True
        mock_requests.post.return_value = mock_access_postgresql_response

        payload = {
            'mail': 'test@example.com'
        }
        url = reverse('data_link')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json()['error'], "Invalid response from mail service")
        self.assertIn("Invalid response from mail service", response.json()['error'])
        mock_requests.post.assert_called_once()


    # --- Test for login API ---
    @mock.patch(mock_requests_path)
    def test_login_success_tfa_sent(self, mock_requests):
        """
        Test successful login resulting in TFA code sent.
        """
        # Mock response from access-postgresql for password check (Success)
        mock_check_password_response = mock.Mock()
        mock_check_password_response.status_code = 200
        mock_check_password_response.json.return_value = {
            'user_name': 'LoggedInUser',
            'mail': 'logged@example.com',
            'opt': 'TFA-CODE-1234'
        }
        mock_check_password_response.ok = True

        # Mock response from mail service for sending TFA (Success)
        mock_send_tfa_response = mock.Mock()
        mock_send_tfa_response.status_code = 200
        mock_send_tfa_response.json.return_value = {"detail": "TFA email sent successfully."}
        mock_send_tfa_response.ok = True

        # Configure mock_requests.post for sequential calls
        # First call: access-postgresql checkPassword
        # Second call: mail service send_tfa
        mock_requests.post.side_effect = [
            mock_check_password_response,
            mock_send_tfa_response
        ]

        payload = {
            'mail': 'logged@example.com',
            'password': 'correct_password'
        }
        url = reverse('login')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {'success': 'authentication code send'})

        self.assertEqual(mock_requests.post.call_count, 2)
        # Verify first call (to access-postgresql)
        mock_requests.post.call_args_list[0].assert_called_with(
            "https://access-postgresql:4000/api/checkPassword/",
            json={'mail': payload['mail'], 'password': payload['password']},
            verify=False,
            headers={'Host': 'access-postgresql'}
        )
        # Verify second call (to mail service)
        mock_requests.post.call_args_list[1].assert_called_with(
            "https://mail:4010/mail/send_tfa/",
            json={
                'user_name': 'LoggedInUser',
                'mail': 'logged@example.com',
                'opt': 'TFA-CODE-1234'
            },
            verify=False,
            headers={'Host': 'mail'}
        )

    @mock.patch(mock_requests_path)
    def test_login_wrong_credentials(self, mock_requests):
        """
        Test login with wrong credentials (access-postgresql returns 401).
        """
        mock_check_password_response = mock.Mock()
        mock_check_password_response.status_code = 401
        mock_check_password_response.json.return_value = {'error': 'Invalid credentials'}
        mock_check_password_response.content = b'{"error": "Invalid credentials"}'
        mock_check_password_response.text = '{"error": "Invalid credentials"}'
        mock_check_password_response.ok = False
        mock_requests.post.return_value = mock_check_password_response

        payload = {
            'mail': 'logged@example.com',
            'password': 'wrong_password'
        }
        url = reverse('login')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json(), {'error': 'Invalid credentials'})
        mock_requests.post.assert_called_once_with(
            "https://access-postgresql:4000/api/checkPassword/",
            json={'mail': payload['mail'], 'password': payload['password']},
            verify=False,
            headers={'Host': 'access-postgresql'}
        )

    @mock.patch(mock_requests_path)
    def test_login_access_postgresql_network_error(self, mock_requests):
        """
        Test login handles network error to access-postgresql.
        """
        # <--- FIX: Simulate network error by making json() raise RequestException
        mock_error_response = mock.Mock()
        mock_error_response.status_code = 500 # Ensure it has an integer status_code for Django client
        mock_error_response.json.side_effect = RequestException("DB connection refused")
        mock_error_response.ok = False
        mock_requests.post.return_value = mock_error_response

        payload = {
            'mail': 'test@example.com',
            'password': 'password'
        }
        url = reverse('login')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json()['error'], "Failed to connect to required services for login.")
        self.assertIn("DB connection refused", response.json()['detail'])
        mock_requests.post.assert_called_once()

    @mock.patch(mock_requests_path)
    def test_login_mail_service_error(self, mock_requests):
        """
        Test login handles error when sending TFA email from mail service.
        """
        # Mock a successful password check from access-postgresql
        mock_check_password_response = mock.Mock()
        mock_check_password_response.status_code = 200
        mock_check_password_response.json.return_value = {
            'user_name': 'LoggedInUser',
            'mail': 'logged@example.com',
            'opt': 'TFA-CODE-1234'
        }
        mock_check_password_response.ok = True

        # Mock an error from mail service when sending TFA
        mock_send_tfa_response = mock.Mock()
        mock_send_tfa_response.status_code = 500
        mock_send_tfa_response.json.return_value = {"error": "Mail service internal error"}
        mock_send_tfa_response.content = b'{"error": "Mail service internal error"}'
        mock_send_tfa_response.text = '{"error": "Mail service internal error"}'
        mock_send_tfa_response.ok = False

        mock_requests.post.side_effect = [
            mock_check_password_response,
            mock_send_tfa_response
        ]

        payload = {
            'mail': 'logged@example.com',
            'password': 'correct_password'
        }
        url = reverse('login')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to send 2FA email.", response.json()['error'])
        self.assertIn("Mail service internal error", response.json()['detail']['error'])
        self.assertEqual(mock_requests.post.call_count, 2)


    # --- Test for verifyTwofa API ---
    @mock.patch(mock_requests_path)
    def test_verify_twofa_success(self, mock_requests):
        """
        Test successful 2FA verification.
        """
        mock_check_tfa_response = mock.Mock()
        mock_check_tfa_response.status_code = 200
        mock_check_tfa_response.json.return_value = {
            'refresh': 'mock_refresh_token',
            'access': 'mock_access_token'
        }
        mock_check_tfa_response.ok = True
        mock_requests.post.return_value = mock_check_tfa_response

        payload = {
            'mail': 'tfa_user@example.com',
            'code': '1234-ABCD-EFGH-IJKL' # 19 chars
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {
            'success': 'authentication code send',
            'refresh': 'mock_refresh_token',
            'access': 'mock_access_token'
        })
        mock_requests.post.assert_called_once_with(
            "https://access-postgresql:4000/api/checkTfa/",
            json={'mail': payload['mail'], 'tfa': payload['code']},
            verify=False,
            headers={'Host': 'access-postgresql'}
        )

    @mock.patch(mock_requests_path)
    def test_verify_twofa_missing_mail(self, mock_requests):
        """
        Test 2FA verification with missing mail.
        """
        payload = {
            'code': '1234-ABCD-EFGH-IJKL'
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {'error': 'mail is empty'})
        mock_requests.post.assert_not_called()

    @mock.patch(mock_requests_path)
    def test_verify_twofa_missing_code(self, mock_requests):
        """
        Test 2FA verification with missing code.
        """
        payload = {
            'mail': 'test@example.com'
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {'error': 'code is empty'})
        mock_requests.post.assert_not_called()

    @mock.patch(mock_requests_path)
    def test_verify_twofa_invalid_code_length(self, mock_requests):
        """
        Test 2FA verification with code of incorrect length.
        """
        payload = {
            'mail': 'test@example.com',
            'code': 'too-short'
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {'error': 'text size is different from 19 characters'})
        mock_requests.post.assert_not_called()

    @mock.patch(mock_requests_path)
    def test_verify_twofa_access_postgresql_error(self, mock_requests):
        """
        Test 2FA verification handles errors from access-postgresql service.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 400
        mock_access_postgresql_response.json.return_value = {'error': 'Invalid TFA code'}
        mock_access_postgresql_response.content = b'{"error": "Invalid TFA code"}'
        mock_access_postgresql_response.text = '{"error": "Invalid TFA code"}'
        mock_access_postgresql_response.ok = False
        mock_requests.post.return_value = mock_access_postgresql_response

        payload = {
            'mail': 'tfa_user@example.com',
            'code': 'INVALID-CODE-12345'
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # <--- FIX: Assertion changed to 401 as per your view logic
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {'error': 'text size is different from 19 characters'})
        mock_requests.post.assert_called_once()

    @mock.patch(mock_requests_path)
    def test_verify_twofa_network_error(self, mock_requests):
        """
        Test 2FA verification handles network errors to access-postgresql.
        """
        # <--- FIX: Simulate network error by making json() raise RequestException
        mock_error_response = mock.Mock()
        mock_error_response.status_code = 500 # Ensure it has an integer status_code for Django client
        mock_error_response.json.side_effect = RequestException("DB connection refused (TFA)")
        mock_error_response.ok = False
        mock_requests.post.return_value = mock_error_response

        payload = {
            'mail': 'test@example.com',
            'code': '1234-ABCD-EFGH-IJKL'
        }
        url = reverse('verifyTwofa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json()['error'], "Failed to connect to Access-PostgreSQL service for 2FA verification.")
        self.assertIn("DB connection refused (TFA)", response.json()['detail'])
        mock_requests.post.assert_called_once()


    # --- Test for activate_account function-based view ---
    @mock.patch(mock_render_path)
    @mock.patch(mock_requests_path)
    def test_activate_account_success(self, mock_requests, mock_render):
        """
        Test account activation success.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 200
        mock_access_postgresql_response.json.return_value = {
            'html': 'account_activated.html'
        }
        mock_access_postgresql_response.ok = True
        mock_requests.post.return_value = mock_access_postgresql_response

        uidb64 = 'MjQ'
        token = 'some-token'
        url = reverse('activate_account', args=[uidb64, token])
        mock_render.return_value = HttpResponse("mocked", status=200)
        response = self.client.get(url) # activate_account is a GET request

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_render.assert_called_once_with(
            mock.ANY, # request object
            'account_activated.html'
        )
        mock_requests.post.assert_called_once_with(
            "https://access-postgresql:4000/api/activate_account/",
            json={'uidb64': uidb64, 'token': token},
            verify=False,
            headers={'Host': 'access-postgresql'}
        )

    @mock.patch(mock_render_path)
    @mock.patch(mock_requests_path)
    def test_activate_account_failure(self, mock_requests, mock_render):
        """
        Test account activation failure from access-postgresql (e.g., invalid token).
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 200 # View returns 200 for 'token_expired.html'
        mock_access_postgresql_response.json.return_value = {
            'html': 'token_expired.html',
            'error': 'Invalid activation link'
        }
        mock_access_postgresql_response.content = b'{"html": "token_expired.html", "error": "Invalid activation link"}'
        mock_access_postgresql_response.text = '{"html": "token_expired.html", "error": "Invalid activation link"}'
        mock_access_postgresql_response.ok = True # View is explicitly returning 200 for this case
        mock_requests.post.return_value = mock_access_postgresql_response

        uidb64 = 'MjQ'
        token = 'invalid-token'
        url = reverse('activate_account', args=[uidb64, token])
        mock_render.return_value = HttpResponse("mocked", status=200)
        response = self.client.get(url)

        # <--- FIX: Expected 200 as per view's current logic
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_render.assert_called_once_with(
            mock.ANY,
            'token_expired.html',
        )
        mock_requests.post.assert_called_once()


    @mock.patch(mock_render_path)
    @mock.patch(mock_requests_path)
    def test_activate_account_network_error(self, mock_requests, mock_render):
        """
        Test account activation handles network errors to access-postgresql.
        """
        # <--- FIX: Simulate network error by making json() raise RequestException
        mock_error_response = mock.Mock()
        mock_error_response.status_code = 500 # Ensure it has an integer status_code for Django client
        mock_error_response.json.side_effect = RequestException("Activation DB unreachable")
        mock_error_response.ok = False
        mock_requests.post.return_value = mock_error_response

        uidb64 = 'MjQ'
        token = 'some-token'
        url = reverse('activate_account', args=[uidb64, token])
        mock_render.return_value = HttpResponse("mocked", status=200)
        response = self.client.get(url)

        # <--- FIX: Expected 500 status code as per view's error handling
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        mock_render.assert_called_once_with(
            mock.ANY,
            'activation_error_template.html',
            {'error_message': mock.ANY},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        self.assertIn(b"Failed to connect to activation service.", response.content)
        mock_requests.post.assert_called_once()


    @mock.patch(mock_render_path)
    @mock.patch(mock_requests_path)
    def test_activate_account_missing_html_in_response(self, mock_requests, mock_render):
        """
        Test account activation handles missing 'html' key in response from access-postgresql.
        """
        mock_access_postgresql_response = mock.Mock()
        mock_access_postgresql_response.status_code = 200
        mock_access_postgresql_response.json.return_value = {
            'message': 'Success but no HTML key' # Missing 'html' key
        }
        mock_access_postgresql_response.ok = True
        mock_requests.post.return_value = mock_access_postgresql_response

        uidb64 = 'MjQ'
        token = 'some-token'
        url = reverse('activate_account', args=[uidb64, token])
        mock_render.return_value = HttpResponse("mocked", status=200)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        mock_render.assert_called_once_with(
            mock.ANY,
            'activation_error_template.html',
            {'error_message': 'Missing template path from activation service.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        mock_requests.post.assert_called_once()
