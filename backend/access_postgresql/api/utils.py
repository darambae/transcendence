
from django.core.mail import send_mail
from django.conf import settings
import random
import string


def generate_otp_send_mail(user):
	tab = []
	for _ in range(4):
		str = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
		tab.append(str)
	opt = "-".join(tab)

	subject = "PongPong two factor Authentication"
	message = f"HELLO {user.user_name},\n\nenter this code to connect to PongPong\n\n" + opt
	from_email = settings.DEFAULT_FROM_EMAIL
	recipient_list = [user.mail]

	send_mail(subject, message, from_email, recipient_list)
	return opt