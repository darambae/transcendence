FROM python:3.11

RUN apt-get update && apt-get install -y curl
RUN pip install --upgrade pip

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /app/
RUN chmod +x /app/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8050
# Remove the comment below so that you can run without elk
ENTRYPOINT ["/entrypoint.sh"]


# CMD ["tail", "-f", "/dev/null"]
CMD ["sh", "-c", "daphne -e ssl:8050:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]
