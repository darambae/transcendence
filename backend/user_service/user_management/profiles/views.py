from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from .models import USER
import json

# Create your views here.

def signup(request):
	if request.method == 'POST':
		try:
			data = json.loads(request.body)
			print(data)

			user = USER.objects.create(
				user_name = data['username'],
				first_name = data['firstName'],
				last_name = data['lastName'],
				mail = data['mail'],
				password = make_password(data['password'])
			)
			return JsonResponse({'message': 'Utilisateur créé avec succès', 'user_id': user.id},  status=200)
		except KeyError as e:
			return JsonResponse({'error': f'Champ manquant: {str(e)}'}, status=400)
	else:
		return JsonResponse({'error': 'Méthode non autorisée'}, status=405)
