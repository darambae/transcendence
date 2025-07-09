#!/bin/bash
set -ex

# Check if ELK is up and running
# Wait for Elasticsearch to be ready

until curl -s -k -u "elastic:${ELASTIC_PASSWORD}" "https://elasticsearch:9200/_cluster/health?wait_for_status=yellow&timeout=1s" | grep -q '"status":"yellow"\|"status":"green"'; do
  echo "Waiting for Elasticsearch to be ready..."
  sleep 10
done

# Optional: Check if Logstash is ready (don't block startup)
echo "Checking if Logstash is available..."
if curl -sf --max-time 5 "http://logstash:9600/_node/pipelines?pretty" > /dev/null 2>&1; then
  echo "Logstash is ready - logging will be enabled"
else
  echo "Logstash not ready yet - will retry connection later (non-blocking)"
fi

# if ! python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(User.objects.filter(is_superuser=True).exists())" | grep "True"; then
#   echo "Creating superuser 'admin'..."
#   python manage.py createsuperuser --user_name "${DJANGO_SUPERUSER}" --mail "${DJANGO_SUPERUSER_EMAIL}" --noinput
# else
#   echo "A superuser already exists."
# fi
python manage.py collectstatic --noinput
exec "$@"
