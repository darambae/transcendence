#!/bin/bash
set -ex

# Check if ELK is up and running
# Wait for Elasticsearch to be ready

# until curl -s -k -u "elastic:${ELASTIC_PASSWORD}" "https://elasticsearch:9200/_cluster/health?wait_for_status=yellow&timeout=1s" | grep -q '"status":"yellow"\|"status":"green"'; do
#   echo "Waiting for Elasticsearch to be ready..."
#   sleep 10
# done

# # Wait for Logstash to be ready (adjust port if needed)
# until curl -sf "http://logstash:9600/_node/pipelines?pretty"; do
#   echo "Waiting for Logstash to be ready..."
#   sleep 15
# done

python manage.py makemigrations --noinput
#python manage.py showmigrations
python manage.py migrate --noinput

python manage.py collectstatic --noinput
exec "$@"
