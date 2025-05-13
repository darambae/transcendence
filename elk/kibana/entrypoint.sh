#!/bin/bash

set -e

mkdir -p /tmp/certs
chown -R kibana:kibana /usr/share/kibana/config/certs
chmod -R 750 /usr/share/kibana/config/certs
cp /usr/share/kibana/config/certs/kibana/kibana.key /tmp/certs/kibana.key
cp /usr/share/kibana/config/certs/kibana/kibana.crt /tmp/certs/kibana.crt
echo "Generating kibana.p12 keystore..."
openssl pkcs8 -topk8 -inform PEM -outform DER -in /tmp/certs/kibana.key -nocrypt -out /tmp/certs/kibana.pk8
openssl pkcs12 -export -in /tmp/certs/kibana.crt -inkey /tmp/certs/kibana.key -out /tmp/certs/kibana.p12 -name kibana -passout pass:jJkJ_p7EwHa0k+EgBgNW
mv /tmp/certs/kibana.p12 /usr/share/kibana/config/certs/kibana.p12
chown kibana:kibana /usr/share/kibana/config/certs/kibana.p12 || true
echo "Creating Kibana Keystore...";
/usr/share/kibana/bin/kibana-keystore create;        
echo "Adding Kibana keystore password..."
echo "jJkJ_p7EwHa0k+EgBgNW" | bin/kibana-keystore add server.ssl.keystore.password --stdin
echo "Starting Kibana...";
exec gosu kibana /usr/share/kibana/bin/kibana --config=/usr/share/kibana/config/my_kibana.yml --elasticsearch.username=kibana_system --elasticsearch.password=jJkJ_p7EwHa0k+EgBgNW