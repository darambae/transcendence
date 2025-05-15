#!/bin/bash

set -e

# Generate SSL certificates
if [ ! -f /usr/share/elasticsearch/config/certs/cert.pem ]; then
    echo "Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /usr/share/elasticsearch/config/certs/private.key \
    -out /usr/share/elasticsearch/config/certs/certificate.crt \
    -config /usr/share/elasticsearch/config/ssl.conf
else
    echo "SSL certificates already exist. Skipping generation."
fi

# Generate CA certificate if it doesn't exist
if [ ! -f config/certs/ca.zip ]; then
  echo "Creating CA..."
  bin/elasticsearch-certutil ca --silent --pem -out "config/certs/ca.zip"
  unzip config/certs/ca.zip -d config/certs
fi

# Combine certificate.crt and ca.crt into fullchain.crt
echo "Combining certificate.crt and ca.crt into fullchain.crt..."
cat /usr/share/elasticsearch/config/certs/certificate.crt /usr/share/elasticsearch/config/certs/ca/ca.crt > /usr/share/elasticsearch/config/certs/fullchain.crt


# Generate certificates for ELK if they don't exist
if [ ! -f config/certs/certs.zip ]; then
  echo "Creating certificates..."
  cat <<EOF > config/certs/instances.yml
instances:
  - name: elasticsearch
    dns:
      - elasticsearch
      - localhost
  - name: kibana
    dns:
      - kibana
      - localhost
  - name: logstash
    dns:
      - logstash
      - localhost
EOF
  bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in config/certs/instances.yml --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key
  unzip config/certs/certs.zip -d config/certs
fi

# Create temporary directory for certificate processing
echo "Creating temporary directory for certificates..."
mkdir -p /tmp/certs
cp /usr/share/elasticsearch/config/certs/elasticsearch/elasticsearch.key /tmp/certs/elasticsearch.key
cp /usr/share/elasticsearch/config/certs/elasticsearch/elasticsearch.crt /tmp/certs/elasticsearch.crt
cp /usr/share/elasticsearch/config/certs/logstash/logstash.key /tmp/certs/logstash.key
cp /usr/share/elasticsearch/config/certs/logstash/logstash.crt /tmp/certs/logstash.crt
cp /usr/share/elasticsearch/config/certs/ca/ca.key /tmp/certs/ca.key
cp /usr/share/elasticsearch/config/certs/ca/ca.crt /tmp/certs/ca.crt

# Generate the elasticsearch.p12 keystore
echo "Generating elasticsearch.p12 keystore..."
openssl pkcs8 -topk8 -inform PEM -outform DER -in /tmp/certs/elasticsearch.key -nocrypt -out /tmp/certs/elasticsearch.pk8
openssl pkcs12 -export -in /tmp/certs/elasticsearch.crt -inkey /tmp/certs/elasticsearch.key -out /tmp/certs/elasticsearch.p12 -name elasticsearch -passout pass:jJkJ_p7EwHa0k+EgBgNW

keytool -import -trustcacerts -keystore /tmp/certs/elasticsearch.p12 -storetype PKCS12 -alias ca -file /tmp/certs/ca.crt -storepass jJkJ_p7EwHa0k+EgBgNW -noprompt
chown elasticsearch:elasticsearch /tmp/certs/elasticsearch.p12
mv /tmp/certs/elasticsearch.p12 /usr/share/elasticsearch/config/certs/

# Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf /tmp/certs

# find /usr/share/elasticsearch/config/certs -type d -exec chmod 750 {} \;
# find /usr/share/elasticsearch/config/certs -type f -exec chmod 640 {} \;

echo "Setup complete!"