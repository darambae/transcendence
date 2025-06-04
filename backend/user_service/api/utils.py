
from django.core.mail import send_mail, BadHeaderError
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
import random
import string
import logging


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


logger = logging.getLogger(__name__)

def send_confirmation_email(request, user):
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        host = request.get_host()
        activation_link = f"https://{host}:8443/user-service/activate_account/{uid}/{token}/"

        subject = "Confirmation of your PongPong registration"
        message = (
            f"Hello {user.user_name},\n\n"
            f"Thank you for registering on PongPong!\n\n"
            f"Please click the following link to activate your account:\n{activation_link}\n\n"
        )
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [user.mail]

        send_mail(subject, message, from_email, recipient_list, fail_silently=False)

    except BadHeaderError:
        logger.error(f"Invalid header found when sending email to {user.mail}")
        raise
    except Exception as e:
        logger.error(f"Error sending confirmation email to {user.mail}: {str(e)}")
        raise

