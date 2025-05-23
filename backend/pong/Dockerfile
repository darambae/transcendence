FROM python:3.11-slim

RUN mkdir pong/
WORKDIR /pong/

# RUN apt-get update && apt-get install -y ca-certificates
RUN apt-get update && apt-get install -y curl
RUN apt-get install -y --no-install-recommends \
    build-essential libpq-dev 
RUN pip install --upgrade pip

RUN echo "copying bash script......"
COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /pong/
RUN chmod +x /pong/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r /pong/requirements.txt
COPY . /pong/

EXPOSE 8020
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh", "-c", "daphne -e ssl:8020:privateKey=/certs/server.key:certKey=/certs/fullchain.crt -b 0.0.0.0 pong.asgi:application"]
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
