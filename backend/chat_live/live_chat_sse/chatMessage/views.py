# live_chat_sse/chatMessage/views.py

import json
from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.http import require_POST, require_GET # NOUVEAU: require_GET pour l'historique
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import datetime

from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
import asyncio

from .models import Message, ChatGroup
from django.core.serializers.json import DjangoJSONEncoder # NOUVEAU: Pour sérialiser les objets Django

# Définition d'un encodeur JSON personnalisé pour les dates
class CustomDjangoJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.strftime('%H:%M:%S') # Formatage de la date en chaîne de caractères
        return super().default(obj)

def chat_page(request):
    return render(request, 'chat.html')

@csrf_exempt
@require_POST
async def send_message(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        content = data.get('content')
        group_name_str = data.get('group_name')

        if not username or not content or not group_name_str:
            return JsonResponse({'status': 'error', 'message': 'Nom d\'utilisateur, contenu et nom de groupe requis.'}, status=400)

        # Utiliser sync_to_async pour les opérations ORM
        user, created = await sync_to_async(User.objects.get_or_create)(username=username)
        chat_group, created_group = await sync_to_async(ChatGroup.objects.get_or_create)(name=group_name_str)

        message = await sync_to_async(Message.objects.create)(
            sender=user,
            content=content,
            group=chat_group
        )

        channel_layer = get_channel_layer()
        if channel_layer is None:
            print("Erreur: Channel Layer non configuré.")
            return JsonResponse({'status': 'error', 'message': 'Serveur non configuré pour le temps réel.'}, status=500)

        channel_group_name = f"chat_{group_name_str}"

        message_data = {
            "sender": username,
            "sender_id": user.id, # Utile pour les futures features (private chat, etc.)
            "content": content,
            "timestamp": message.timestamp.strftime('%H:%M:%S'), # Formatage de la date pour le client
            "group_name": group_name_str
        }

        await channel_layer.group_send(
            channel_group_name,
            {
                "type": "chat_message",
                "message": message_data
            }
        )

        return JsonResponse({'status': 'success', 'message': 'Message envoyé.'})

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Format JSON invalide.'}, status=400)
    except Exception as e:
        print(f"Erreur lors de l'envoi du message: {e}")
        return JsonResponse({'status': 'error', 'message': f'Erreur interne du serveur: {e}'}, status=500)


@csrf_exempt
@require_POST
async def create_or_get_private_group(request):
    current_username = request.POST.get('current_username')
    target_username = request.POST.get('target_username')

    if not current_username or not target_username:
        return JsonResponse({'error': 'Noms d\'utilisateur requis.'}, status=400)

    try:
        user1, _ = await sync_to_async(User.objects.get_or_create)(username=current_username)
        user2, _ = await sync_to_async(User.objects.get_or_create)(username=target_username)

        # Assurez-vous que les deux utilisateurs sont ajoutés au groupe privé
        # et que le nom du groupe est toujours cohérent (tri des IDs)
        participants_ids = sorted([user1.id, user2.id])
        group_name = f"private_{participants_ids[0]}_{participants_ids[1]}"

        chat_group, created = await sync_to_async(ChatGroup.objects.get_or_create)(
            name=group_name,
            is_private=True # Indique que c'est un groupe privé
        )
        # Ajouter les membres si le groupe vient d'être créé ou s'ils ne sont pas déjà membres
        await sync_to_async(chat_group.members.add)(user1, user2)


        return JsonResponse({'status': 'success', 'group_name': group_name})

    except Exception as e:
        print(f"Erreur lors de la création/récupération du groupe privé: {e}")
        return JsonResponse({'error': 'Erreur interne du serveur.'}, status=500)


# NOUVELLE VUE : Récupérer l'historique des messages
@require_GET
async def get_message_history(request, group_name):
    try:
        offset = int(request.GET.get('offset', 0))
        limit = int(request.GET.get('limit', 20)) # Augmenté la limite par défaut pour plus de messages

        chat_group = await sync_to_async(ChatGroup.objects.get)(name=group_name)

        messages = await sync_to_async(list)(
            Message.objects.filter(group=chat_group)
            .order_by('-timestamp') # Tri inversé pour les derniers messages en premier
            [offset : offset + limit]
            .values('sender__username', 'content', 'timestamp') # <<--- C'EST ICI LA CLÉ: 'sender__username'
        )

        messages.reverse() # Pour afficher du plus ancien au plus récent

        serialized_messages = json.dumps(list(messages), cls=CustomDjangoJSONEncoder)

        return JsonResponse({'status': 'success', 'messages': json.loads(serialized_messages)})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Groupe de chat non trouvé.'}, status=404)
    except Exception as e:
        print(f"Erreur lors de la récupération de l'historique: {e}")
        return JsonResponse({'status': 'error', 'message': f'Erreur interne du serveur: {e}'}, status=500)

async def sse_chat_stream(request, group_name):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        print("Erreur: Channel Layer non configuré pour le stream SSE.")
        return StreamingHttpResponse("Internal Server Error: Channel layer not configured.", status=500, content_type="text/plain")

    channel_group_name = f"chat_{group_name}"

    client_channel_name = await channel_layer.new_channel()
    await channel_layer.group_add(channel_group_name, client_channel_name)

    async def event_generator():
        try:
            while True:
                message = await asyncio.wait_for(
                    channel_layer.receive(client_channel_name),
                    timeout=20 # Envoie un heartbeat si pas de message pendant 20s
                )

                if message and message["type"] == "chat_message":
                    sse_data = json.dumps(message["message"])
                    yield f"data: {sse_data}\n\n"
                else:
                    # Envoie un commentaire SSE (heartbeat) pour maintenir la connexion
                    yield ":heartbeat\n\n"

        except asyncio.TimeoutError:
            # Le timeout est normal, juste un heartbeat, la boucle continue
            yield ":heartbeat\n\n"
        except asyncio.CancelledError:
            print(f"SSE stream for group '{group_name}' (channel {client_channel_name}) cancelled.")
        except Exception as e:
            print(f"Erreur inattendue dans le générateur SSE pour {group_name}: {e}")
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        finally:
            await channel_layer.group_discard(channel_group_name, client_channel_name)
            print(f"SSE stream for group '{group_name}' (channel {client_channel_name}) disconnected.")

    response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no' # Essentiel pour SSE
    return response
