
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


EXPOSE 8030

ENTRYPOINT ["/entrypoint.sh"]

CMD ["sh", "-c", "daphne -e ssl:8030:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]