import redis

# Connexion à Redis
r = redis.StrictRedis(host='game_redis', port=6379, db=0)

# Nom du groupe
room_group_name = "chat_room_1"  # Exemple de groupe

# Nom de la clé Redis pour les membres du groupe
group_key = f'group:{room_group_name}:members'

# Récupérer les membres du groupe
members = r.smembers(group_key)  # Redis utilise un set pour stocker les membres

print(f'Membres du groupe {room_group_name}: {members}')
