
from django.core.mail import send_mail
from django.conf import settings	

def send_confirmation_email(user):
	subject = 'Confirmation of your PongPong registration'
	message = f"HELLO {user.user_name},\n\nThank you for registering on PongPong"
	from_email = settings.DEFAULT_FROM_EMAIL
	recipient_list = [user.mail]

	send_mail(subject, message, from_email, recipient_list)
