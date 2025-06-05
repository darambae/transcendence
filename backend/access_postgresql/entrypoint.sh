#!/bin/bash
set -ex

python manage.py makemigrations --noinput
#python manage.py showmigrations
python manage.py migrate --noinput

exec "$@"
