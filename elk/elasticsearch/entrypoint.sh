#!/bin/bash

set -e

echo "CHECKING environment variables..."
if [ -z "$ELASTIC_PASSWORD" ]; then
    echo "ELASTIC_PASSWORD is not set. Exiting..."
    exit 1
fi

echo "Setting permissions for certs directory..."
find /usr/share/elasticsearch/config/certs -type d -exec chmod 750 {} \;
find /usr/share/elasticsearch/config/certs -type f -exec chmod 640 {} \;

echo "Waiting for setup to finish..."
until [ -f /usr/share/elasticsearch/config/certs/elasticsearch/elasticsearch.key ]; do
    echo "Waiting for certs to be created..."
    sleep 9
done
echo "Certs created!"

echo "Adding keystore passwords to Elasticsearch keystore..."
echo "jJkJ_p7EwHa0k+EgBgNW" | bin/elasticsearch-keystore -E path.config=/usr/share/elasticsearch/config add --force xpack.security.transport.ssl.keystore.secure_password --stdin
echo "jJkJ_p7EwHa0k+EgBgNW" | bin/elasticsearch-keystore -E path.config=/usr/share/elasticsearch/config add --force xpack.security.transport.ssl.truststore.secure_password --stdin
echo "jJkJ_p7EwHa0k+EgBgNW" | bin/elasticsearch-keystore -E path.config=/usr/share/elasticsearch/config add --force xpack.security.http.ssl.truststore.secure_password --stdin
echo "jJkJ_p7EwHa0k+EgBgNW" | bin/elasticsearch-keystore -E path.config=/usr/share/elasticsearch/config add --force xpack.security.http.ssl.keystore.secure_password --stdin
                                                                                                                                            
gosu elasticsearch bin/elasticsearch &
sleep 120 #Reduce the time here if it takes too long but make sure to put enough time so that ES is ready to execute the rest. 

echo "Resetting password for the elastic built-in user..."
/usr/bin/expect <<EOF
spawn gosu elasticsearch /usr/share/elasticsearch/bin/elasticsearch-reset-password -b -i -u elastic
expect "Enter password for \\[elastic\\]:"
send "${ELASTIC_PASSWORD}\r"
expect "Re-enter password for \\[elastic\\]:"
send "${ELASTIC_PASSWORD}\r"
expect eof
EOF
echo "Resetting password for the kibana_system built-in user..."
/usr/bin/expect <<EOF
spawn gosu elasticsearch /usr/share/elasticsearch/bin/elasticsearch-reset-password -b -i -u kibana_system
expect "Enter password for \\[kibana_system\\]:"
send "${ELASTIC_PASSWORD}\r"
expect "Re-enter password for \\[kibana_system\\]:"
send "${ELASTIC_PASSWORD}\r"
expect eof
EOF
echo "Kibana system user password reset!"
echo "Resetting password for the logstash_system built-in user..."
/usr/bin/expect <<EOF
spawn gosu elasticsearch /usr/share/elasticsearch/bin/elasticsearch-reset-password -b -i -u logstash_system
expect "Enter password for \\[logstash_system\\]:"
send "${ELASTIC_PASSWORD}\r"
expect "Re-enter password for \\[logstash_system\\]:"
send "${ELASTIC_PASSWORD}\r"
expect eof
EOF
echo "Elastic logstash_system user's password reset!"
echo "Waiting for Elasticsearch to start..."
until curl -k -u kibana_system:jJkJ_p7EwHa0k+EgBgNW --silent --fail https://elasticsearch:9200; do
    echo "Waiting for Elasticsearch to start..."
    sleep 10
done
echo "Elasticsearch started!"
curl -u elastic:jJkJ_p7EwHa0k+EgBgNW -X POST "https://elasticsearch:9200/_security/role/logstash_editor" -H 'Content-Type: application/json' -k -d '{
    "cluster": ["monitor", "manage_index_templates"],
    "indices": [
        {
        "names": ["*"],
        "privileges": ["read", "write", "create", "create_index"]
        }
    ]
}'

echo "Editor role created!"
echo "Resetting password for the logstash_internal built-in user..."
gosu elasticsearch bin/elasticsearch-users useradd logstash_internal -p jJkJ_p7EwHa0k+EgBgNW -r logstash_editor
echo "Logstash internal user password reset!"

tail -f /dev/null