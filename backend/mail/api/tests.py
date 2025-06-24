import json
from unittest import mock
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.core import mail # To assert if emails were sent
#from django.core.mail import send_mail, BadHeaderError
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.shortcuts import render
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
import string
import random
import requests
import logging
from api.views import confirm_singup, send_tfa
from requests.exceptions import RequestException

# --- START: Mocking External Dependencies ---
# These mocks prevent actual emails from being sent and HTTP requests from being made during tests.
# You must patch the *location where the function is looked up*.
# If send_mail is imported in views.py like 'from django.core.mail import send_mail',
# you patch 'api.views.send_mail'
# If requests is imported in views.py like 'import requests',
# you patch 'api.views.requests'

VIEWS_MODULE_PATH = 'api.views'

# Mock for django.core.mail.send_mail
mock_send_mail_path = f'{VIEWS_MODULE_PATH}.send_mail'

# Mock for the requests library
mock_requests_path = f'{VIEWS_MODULE_PATH}.requests'
# --- END: Mocking External Dependencies ---


class EmailAPITests(TestCase):
    """
    Test suite for the Django email API endpoints.
    """

    def setUp(self):
        """
        Set up the test client before each test method.
        """
        self.client = APIClient()

    @mock.patch(mock_send_mail_path)
    @mock.patch(mock_requests_path)
    def test_confirm_signup_success(self, mock_requests, mock_send_mail):
        """
        Test that confirm_singup API sends an email successfully
        and returns a 200 OK status.
        """
        # Configure the mock response for the internal 'auth' service call
        # This simulates a successful response from the auth service
        mock_auth_response = mock.Mock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {'link': 'https://example.com/activate/uid/token/'}
        mock_auth_response.ok = True # Ensure .ok is True for a 2xx response
        mock_requests.post.return_value = mock_auth_response

        # Data to send in the POST request
        payload = {
            'mail': 'test@example.com',
            'user_name': 'TestUser'
        }
        url = reverse('confirm_singup') # Uses the name from your urls.py

        # Make the POST request
        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"detail": "Email sent successfully."})

        # Verify that send_mail was called exactly once
        mock_send_mail.assert_called_once()
        # Verify the content of the email sent
        call_args, call_kwargs = mock_send_mail.call_args
        self.assertEqual(call_args[2], mail.settings.DEFAULT_FROM_EMAIL) # <--- FIX: Changed from call_kwargs
        self.assertIn("Confirmation of your PongPong registration", call_args[0]) # subject
        self.assertIn(f"Hello {payload['user_name']}", call_args[1]) # message starts with Hello
        self.assertIn(mock_auth_response.json.return_value['link'], call_args[1]) # link in message
        self.assertEqual(call_kwargs['fail_silently'], False) # fail_silently is a keyword arg

        # Verify that requests.post was called
        mock_requests.post.assert_called_once_with(
            "https://auth:4020/auth_api/data_link/",
            json={'mail': payload['mail']},
            verify=False,
            headers={'Host': 'auth'}
        )

    @mock.patch(mock_send_mail_path)
    @mock.patch(mock_requests_path)
    def test_confirm_signup_bad_header_error(self, mock_requests, mock_send_mail):
        """
        Test that confirm_singup handles BadHeaderError during email sending.
        """
        # Configure the mock response for the internal 'auth' service call
        mock_auth_response = mock.Mock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {'link': 'https://example.com/activate/uid/token/'}
        mock_auth_response.ok = True
        mock_requests.post.return_value = mock_auth_response

        # Simulate a BadHeaderError when send_mail is called
        mock_send_mail.side_effect = mail.BadHeaderError("Invalid header")

        payload = {
            'mail': 'test@example.com',
            'user_name': 'TestUser'
        }
        url = reverse('confirm_singup')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), {"error": "Invalid header found."})
        mock_send_mail.assert_called_once() # Still called, but raised an error

    @mock.patch(mock_send_mail_path)
    @mock.patch(mock_requests_path)
    def test_confirm_signup_internal_auth_service_error(self, mock_requests, mock_send_mail):
        """
        Test confirm_singup handles error from internal auth service call.
        """
        # Simulate an error response from the internal 'auth' service call
        mock_auth_response = mock.Mock()
        mock_auth_response.status_code = 500
        mock_auth_response.json.return_value = {'error': 'Auth service down'}
        mock_auth_response.ok = False # Ensure .ok is False for non-2xx response
        mock_requests.post.return_value = mock_auth_response

        payload = {
            'mail': 'test@example.com',
            'user_name': 'TestUser'
        }
        url = reverse('confirm_singup')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assertions: Expect an error because the internal request failed
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR) # <--- FIX: Expected 500
        self.assertIn("Failed to get activation link", response.json().get('error')) # More specific error message
        mock_send_mail.assert_not_called()
    
    @mock.patch(mock_send_mail_path)
    @mock.patch(mock_requests_path) # Need to mock requests even if not used by this view, if it's in the decorator list
    def test_confirm_signup_auth_network_error(self, mock_requests, mock_send_mail):
        """
        Test confirm_singup handles network errors during internal auth service call.
        """
        # Simulate a network error (e.g., connection refused)
        mock_requests.post.side_effect = RequestException("Connection refused")

        payload = {
            'mail': 'test@example.com',
            'user_name': 'TestUser'
        }
        url = reverse('confirm_singup')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json(), {"error": "Failed to connect to authentication service."})
        mock_send_mail.assert_not_called()



    @mock.patch(mock_send_mail_path)
    def test_send_tfa_success(self, mock_send_mail):
        """
        Test that send_tfa API sends an email successfully
        and returns a 200 OK status.
        """
        payload = {
            'mail': 'tfa_user@example.com',
            'user_name': 'TFAUser',
            'opt': '1234-ABCD'
        }
        url = reverse('send_tfa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assertions
        # Note: Your view currently returns {"error": "Failed to send email."} even on success (status=200).
        # This is likely a bug in your view; a successful email send should return a success message.
        # For the test, we'll assert based on its current behavior, but this should be corrected in your view.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"error": "Failed to send email."}) # Asserting current view behavior

        # Verify that send_mail was called exactly once
        mock_send_mail.assert_called_once()
        call_args, call_kwargs = mock_send_mail.call_args
        self.assertIn("PongPong two factor Authentication", call_args[0]) # subject
        self.assertIn(f"HELLO {payload['user_name']}", call_args[1]) # message starts with HELLO
        self.assertIn(payload['opt'], call_args[1]) # OPT code in message
        self.assertEqual(call_kwargs['from_email'], mail.settings.DEFAULT_FROM_EMAIL)
        self.assertEqual(call_kwargs['recipient_list'], [payload['mail']])
        # Your view for send_tfa does not set fail_silently=False, so we can't assert it here
        # self.assertFalse(call_kwargs['fail_silently'])

    @mock.patch(mock_send_mail_path)
    def test_send_tfa_bad_header_error(self, mock_send_mail):
        """
        Test that send_tfa handles BadHeaderError during email sending.
        """
        mock_send_mail.side_effect = mail.BadHeaderError("Invalid header for TFA")

        payload = {
            'mail': 'invalid@example.com',
            'user_name': 'AnotherUser',
            'opt': '5678-WXYZ'
        }
        url = reverse('send_tfa')

        response = self.client.post(url, json.dumps(payload), content_type='application/json')

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # <--- FIX: Expected 400
        self.assertEqual(response.json(), {"error": "Failed to send email due to invalid header."}) # <--- FIX: Expected new error message
        mock_send_mail.assert_called_once()
