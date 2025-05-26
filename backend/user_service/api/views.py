from django.views import View
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.hashers import make_password
from .models import User
from .forms import LoginForm, RegisterForm
from django.contrib.auth import get_user_model

User = get_user_model()

class index_view(View):
    def get(self, request):
        if request.user.is_authenticated:
            return render(request, 'index.html', {'nickname': request.user.username})
        else:
            return render(request, 'index.html')


class login_view(View):  # Assuming you are using a class-based view
    def get(self, request):
        form = LoginForm()
        return render(request, 'login.html', {'form': form})

    def post(self, request):
        form = LoginForm(request.POST)  # Use 'form' for consistency

        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']

            user = authenticate(request, username=username, password=password)  # Authenticate

            if user is not None:
                login(request, user)  # Log the user in
                # Set user online status (if applicable)
                if hasattr(user, 'online'):  # Check if 'online' attribute exists
                    user.online = True
                    user.save()
                return redirect('index')  # Redirect on success
            else:
                form.add_error(None, "Invalid username or password")  # Add a form error
                return render(request, 'login.html', {'form': form}) # Render with errors

        else:
            return render(request, 'login.html', {'form': form})  # Render form with errors

class register_view(View):
    def get(self, request):
        user_registration_form = RegisterForm()
        return render(request, 'register.html', {'form': user_registration_form})

    def post(self, request):
        user_registration_form = RegisterForm(request.POST, request.FILES)
        if user_registration_form.is_valid():
            user = user_registration_form.save() # Save the user!
            login(request, user)
            return redirect('login')  # Or wherever you want to redirect
        else:
            return render(request, 'register.html', {'form': user_registration_form})

class profile_view(View):
    def get(self, request):
        user = User.objects.get(id=request.user.id)
        return render(request, 'profile.html', {'user': user})

    def post(self, request):
        user = User.objects.get(id=request.user.id)
        user_profile_form = RegisterForm(request.POST, request.FILES, instance=user)
        if user_profile_form.is_valid():
            user_profile_form.save()
            # Redirect to a success page or render a success template
        else:
            # Handle form errors
            return render(request, 'profile.html', {'form': user_profile_form})
        