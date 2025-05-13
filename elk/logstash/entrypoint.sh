#!/bin/bash
set -e


# Ensure certs directory and files have correct permissions
if [ -d "/usr/share/logstash/config/certs" ]; then
    echo "Setting permissions for certs directory..."
    find /usr/share/logstash/config/certs -type d -exec chmod 750 {} \;
    find /usr/share/logstash/config/certs -type f -exec chmod 640 {} \;
    chown -R logstash:logstash /usr/share/logstash/config
    chown -R logstash:logstash /usr/share/logstash/config/certs
fi

exec gosu logstash /usr/share/logstash/bin/logstash -f /usr/share/logstash/pipeline/my_pipeline.conf
