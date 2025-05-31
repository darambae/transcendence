FROM python:3.11

RUN apt-get update && apt-get install -y curl
RUN pip install --upgrade pip

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /app/

RUN chmod +x /app/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --only-binary :all: --no-cache-dir --use-pep517 -r requirements.txt

EXPOSE 50051

CMD ["tail", "-f", "/dev/null"]