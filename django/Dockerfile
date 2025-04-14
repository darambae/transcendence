FROM python:3.11-slim

RUN mkdir /django
WORKDIR /django/

RUN apt-get update && apt-get install -y ca-certificates
RUN apt-get install -y --no-install-recommends \
    build-essential libpq-dev
RUN pip install --upgrade pip

RUN echo "copying bash script......"
COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /django/
RUN chmod +x /django/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r /django/requirements.txt
COPY . /django/

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
