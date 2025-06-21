#!/bin/bash

set -e

# Create extfile for SAN
echo "Creating SAN extfile..."
cat <<EOF > /usr/share/elasticsearch/config/certs/san.ext
subjectAltName = DNS:transcendence.42.fr, DNS:localhost, DNS:kibana, DNS:server_pong, DNS:tournament, DNS:live_chat, IP:127.0.0.1
EOF

echo "Generating private key and CSR for the server..."
openssl req -new -newkey rsa:4096 -nodes \
-out /usr/share/elasticsearch/config/certs/server.csr \
-keyout /usr/share/elasticsearch/config/certs/server.key \
-subj "/C=FR/ST=Occitanie/L=Perpignan/O=42 School/OU=omfelk_dabae_kbrener_gdaignea_rmichel/CN=localhost"


echo "Signing CSR with CA..."
openssl x509 -req -in /usr/share/elasticsearch/config/certs/server.csr \
  -CA config/certs/ca/ca.crt -CAkey config/certs/ca/ca.key -CAcreateserial \
  -out /usr/share/elasticsearch/config/certs/server.crt -days 365 -sha256 \
  -extfile /usr/share/elasticsearch/config/certs/san.ext

# Combine certificate.crt and ca.crt into fullchain.crt
echo "Combining server.crt and ca.crt into fullchain.crt..."
cat /usr/share/elasticsearch/config/certs/server.crt config/certs/ca/ca.crt > /usr/share/elasticsearch/config/certs/fullchain.crt

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
  bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in config/certs/instances.yml \
  --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key
  unzip config/certs/certs.zip -d config/certs
fi

openssl genrsa -out /usr/share/elasticsearch/config/certs/kibana/kibana.key 2048
openssl req -new -key /usr/share/elasticsearch/config/certs/kibana/kibana.key -out /usr/share/elasticsearch/config/certs/kibana/kibana.csr -subj "/CN=localhost"
openssl x509 -req -in /usr/share/elasticsearch/config/certs/kibana/kibana.csr \
  -CA /usr/share/elasticsearch/config/certs/ca/ca.crt \
  -CAkey /usr/share/elasticsearch/config/certs/ca/ca.key \
  -CAcreateserial \
  -out /usr/share/elasticsearch/config/certs/kibana/kibana.crt -days 365 -sha256 \
  -extfile /usr/share/elasticsearch/config/certs/san.ext
  
openssl pkcs12 -export \
  -in /usr/share/elasticsearch/config/certs/kibana/kibana.crt \
  -inkey /usr/share/elasticsearch/config/certs/kibana/kibana.key \
  -out /usr/share/elasticsearch/config/certs/kibana.p12 \
  -name kibana \
  -CAfile /usr/share/elasticsearch/config/certs/ca/ca.crt \
  -caname root \
  -passout pass:${ELASTIC_PASSWORD}

# Create temporary directory for certificate processing
echo "Creating temporary directory for certificates..."
mkdir -p /tmp/certs
cp /usr/share/elasticsearch/config/certs/elasticsearch/elasticsearch.key /tmp/certs/elasticsearch.key
cp /usr/share/elasticsearch/config/certs/elasticsearch/elasticsearch.crt /tmp/certs/elasticsearch.crt
# cp /usr/share/elasticsearch/config/certs/logstash/logstash.key /tmp/certs/logstash.key
# cp /usr/share/elasticsearch/config/certs/logstash/logstash.crt /tmp/certs/logstash.crt
cp /usr/share/elasticsearch/config/certs/ca/ca.key /tmp/certs/ca.key
cp /usr/share/elasticsearch/config/certs/ca/ca.crt /tmp/certs/ca.crt

# Generate the elasticsearch.p12 keystore
echo "Generating elasticsearch.p12 keystore..."
openssl pkcs8 -topk8 -inform PEM -outform DER -in /tmp/certs/elasticsearch.key -nocrypt -out /tmp/certs/elasticsearch.pk8
openssl pkcs12 -export -in /tmp/certs/elasticsearch.crt -inkey /tmp/certs/elasticsearch.key -out /tmp/certs/elasticsearch.p12 -name elasticsearch -passout pass:${ELASTIC_PASSWORD}

keytool -import -trustcacerts -keystore /tmp/certs/elasticsearch.p12 -storetype PKCS12 -alias ca -file /tmp/certs/ca.crt -storepass ${ELASTIC_PASSWORD} -noprompt
chown elasticsearch:elasticsearch /tmp/certs/elasticsearch.p12
mv /tmp/certs/elasticsearch.p12 /usr/share/elasticsearch/config/certs/

# Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf /tmp/certs

# find /usr/share/elasticsearch/config/certs -type d -exec chmod 750 {} \;
# find /usr/share/elasticsearch/config/certs -type f -exec chmod 640 {} \;

echo "Setup complete!"