FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip
RUN echo "copying bash script......"
COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /app
RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh", "-c", "daphne -e ssl:4000:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]
