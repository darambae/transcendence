#!/bin/bash

set -e

if [ -z "${KIBANA_PASSWORD}" ]; then
  echo "KIBANA_PASSWORD environment variable is not set."
  exit 1
fi

mkdir -p /tmp/certs
chown -R kibana:kibana /usr/share/kibana/config/certs
chmod -R 750 /usr/share/kibana/config/certs
chown kibana:kibana /usr/share/kibana/config/certs/kibana.p12 || true
echo "Creating Kibana Keystore...";
/usr/share/kibana/bin/kibana-keystore create;        
echo "Adding Kibana keystore password..."
echo "${KIBANA_PASSWORD}" | bin/kibana-keystore add server.ssl.keystore.password --stdin
echo "Starting Kibana...";
exec gosu kibana /usr/share/kibana/bin/kibana --config=/usr/share/kibana/config/my_kibana.yml --elasticsearch.username=kibana_system --elasticsearch.password=${ELASTICSEARCH_PASSWORD}