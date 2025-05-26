# # Utilise l'image officielle Python
# FROM python:3.11

# # Définit le répertoire de travail dans le conteneur
# RUN apt-get update && apt-get install -y curl

# WORKDIR /app

# RUN ls -R
# # Installe Django

# COPY requirements.txt /app/
# RUN pip install -r requirements.txt

# # Initialise un projet Django minimal

# # Expose le port 8000
# EXPOSE 8030

# # Commande pour lancer Django
# # CMD ["bash"] 
# # CMD ["python",  "manage.py", "runserver"]
# CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "myproject.asgi:application"]
# # CMD ["ls", "-R", "/app"]
# # daphne -b 0.0.0.0 -p 8000 myproject.asgi:application
FROM python:3.11

# Définit le répertoire de travail dans le conteneur
RUN apt-get update && apt-get install -y curl
RUN pip install --upgrade pip

WORKDIR /app

# RUN ls -R

# Installe Django

COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /app/
RUN chmod +x /app/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r requirements.txt

# Initialise un projet Django minimal

EXPOSE 8030
ENTRYPOINT ["/entrypoint.sh"]


# CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "ai_pong.asgi:application"]
CMD ["sh", "-c", "daphne -e ssl:8030:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]