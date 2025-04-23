#!/bin/bash
set -ex
python manage.py makemigrations --noinput
python manage.py migrate --noinput
if ! python manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.filter(is_superuser=True).exists())" | grep "True"; then
  echo "Creating superuser 'admin'..."
  python manage.py createsuperuser --username ${DJANGO_SUPERUSER} --email ${DJANGO_SUPERUSER_EMAIL} --noinput
else
  echo "A superuser already exists."
fi

python manage.py collectstatic --noinput
python manage.py makemigrations --noinput
python manage.py migrate --noinput
exec "$@"