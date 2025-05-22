# Utilise l'image officielle Python
FROM python:3.11

# Définit le répertoire de travail dans le conteneur
RUN apt-get update && apt-get install -y curl

WORKDIR /app

RUN ls -R
# Installe Django

COPY requirements.txt /app/
RUN pip install -r requirements.txt

# Initialise un projet Django minimal

# Expose le port 8000
EXPOSE 8000

# Commande pour lancer Django
# CMD ["tail", "-f", "/dev/null"]
# CMD ["python",  "manage.py", "runserver"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "ai_pong.asgi:application"]
# CMD ["ls", "-R", "/app"]
# daphne -b 0.0.0.0 -p 8000 myproject.asgi:application