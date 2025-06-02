# FROM python:3.11-slim

# RUN mkdir pong/
# WORKDIR /pong/

# # RUN apt-get update && apt-get install -y ca-certificates
# RUN apt-get update && apt-get install -y curl
# RUN apt-get install -y --no-install-recommends \
#     build-essential libpq-dev 
# RUN pip install --upgrade pip

# RUN echo "copying bash script......"
# COPY entrypoint.sh /entrypoint.sh
# COPY requirements.txt /pong/
# RUN chmod +x /pong/requirements.txt
# RUN chmod +x /entrypoint.sh
# RUN pip install --no-cache-dir -r /pong/requirements.txt
# COPY . /pong/

# EXPOSE 8020
# ENTRYPOINT ["/entrypoint.sh"]
# CMD ["sh", "-c", "daphne -e ssl:8020:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 pong.asgi:application"]
# # CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Utilise l'image officielle Python
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

EXPOSE 8020
# Remove the comment below so that you can run without elk
ENTRYPOINT ["/entrypoint.sh"]


# CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "ai_pong.asgi:application"]
CMD ["sh", "-c", "daphne -e ssl:8020:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]
# daphne -b 0.0.0.0 -p 8000 myproject.asgi:application