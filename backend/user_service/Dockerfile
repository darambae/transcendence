FROM python:3.11-slim

WORKDIR /app

# RUN apt-get update && apt-get install -y ca-certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip
RUN echo "copying bash script......"
COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /app
RUN chmod +x /app/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 8010
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh", "-c", "daphne -e ssl:8010:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 config.asgi:application"]
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
