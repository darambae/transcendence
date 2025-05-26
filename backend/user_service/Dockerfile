FROM python:3.11-slim

WORKDIR /user_service/

# RUN apt-get update && apt-get install -y ca-certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --upgrade pip

COPY ./requirements.txt /tmp
COPY ./entrypoint.sh /tmp

RUN python3 -m pip install --no-cache-dir -r /tmp/requirements.txt

EXPOSE 8010

ENTRYPOINT ["/tmp/entrypoint.sh"]

CMD ["sh", "-c", "daphne -e ssl:8010:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 user_management.asgi:application"]
