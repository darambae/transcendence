FROM python:3.11-slim

RUN mkdir /user_service
WORKDIR /user_service/

RUN apt-get update && apt-get install -y ca-certificates
RUN apt-get install -y --no-install-recommends \
    build-essential libpq-dev
RUN pip install --upgrade pip

RUN echo "copying bash script......"
COPY entrypoint.sh /entrypoint.sh
COPY requirements.txt /user_service/
RUN chmod +x /user_service/requirements.txt
RUN chmod +x /entrypoint.sh
RUN pip install --no-cache-dir -r /user_service/requirements.txt
COPY . /user_service/

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
