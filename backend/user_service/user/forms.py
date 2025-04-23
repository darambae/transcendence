from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

class RegisterForm(UserCreationForm):
    class Meta:
        model = User  # Use CustomUser here
        fields = ['username', 'nickname', 'email', 'avatar'] # Removed password1, password2
        widgets = {
            'avatar': forms.FileInput()
        }
        labels = {
            'username': 'Username',
            'nickname': 'Nickname',
            'email': 'Email',
            'avatar': 'Avatar',
        }
        error_messages = {
            'username': {
                'required': 'Username is required.',
                'max_length': 'Username cannot exceed 150 characters.',
                'unique': 'This username is already taken.',
            },
            'nickname': {
                'required': 'Nickname is required.',
                'max_length': 'Nickname cannot exceed 150 characters.',
                'unique': 'This nickname is already taken.',
            },
            'email': {
                'required': 'Email is required.',
                'invalid': 'Enter a valid email address.',
                'unique': 'This email is already registered.',
            },
        }

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
        return user
    

class LoginForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        required=True,
        error_messages={
            'required': 'Username is required.',
            'max_length' : 'Username cannot exceed 150 characters.',
            'min_length': 'Username should contain at least 5 characters.'
        }
    )
    password = forms.CharField(
        max_length=128,
        required=True,
        widget=forms.PasswordInput(),
        error_messages={
            'required': 'Password is required.',
            'max_length' : 'Password cannot exceed 128 characters.'
        }
    )