#!/bin/bash

set -e

# Generate CA certificate if it doesn't exist
# if [ ! -f config/certs/ca/ca.zip ]; then
#   echo "Creating CA..."
#   bin/elasticsearch-certutil ca --silent --pem -out "config/certs/ca/ca.zip"
#   unzip config/certs/ca/ca.zip -d config/certs
# fi

# Create extfile for SAN
echo "Creating SAN extfile..."
cat <<EOF > /usr/share/elasticsearch/config/certs/san.ext
subjectAltName = DNS:transcendence.42.fr, DNS:localhost, IP:127.0.0.1
EOF

echo "Generating private key and CSR for the server..."
# openssl req -new -nodes -newkey rsa:2048 \
#   -keyout /usr/share/elasticsearch/config/certs/server.key \
#   -out /usr/share/elasticsearch/config/certs/server.csr \
#   -subj "/C=FR/ST=Occitanie/L=Perpignan/O=Transcendence Project/OU=Development Team/CN=transcendence.42.fr"

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

# echo "Adding CA certificate to system trust store..."
# if [ "$(uname)" = "Darwin" ]; then
# 	security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /usr/share/elasticsearch/config/certs/fullchain.crt
#     echo "CA added to macOS System keychain."
# elif [ "$(uname)" = "Linux" ]; then
#     cp /usr/share/elasticsearch/config/certs/fullchain.crt /usr/local/share/ca-certificates/ca.crt
# 	update-ca-certificates
#     echo "CA added to Linux trust store."
# else
#     echo "Automatic CA installation not supported for this OS."
# fi

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