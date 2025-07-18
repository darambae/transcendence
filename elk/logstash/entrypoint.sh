#!/bin/bash
set -e


if [ -d "/usr/share/logstash/config/certs" ]; then
    echo "Setting permissions for certs directory..."
    find /usr/share/logstash/config/certs -type d -exec chmod 750 {} \;
    find /usr/share/logstash/config/certs -type f -exec chmod 640 {} \;
    chown -R logstash:logstash /usr/share/logstash/config
    chown -R logstash:logstash /usr/share/logstash/config/certs
fi

echo "Waiting for Elasticsearch to start..."
until curl -s -f -k -u elastic:${ELASTIC_PASSWORD} "https://elasticsearch:9200/_cluster/health?wait_for_status=yellow&timeout=50s" > /dev/null; do
    echo "Elasticsearch is not ready yet. Waiting..."
    sleep 5
done
echo "Elasticsearch is up and running!"

exec gosu logstash /usr/share/logstash/bin/logstash -f /usr/share/logstash/pipeline/my_pipeline.conf
