FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.5

USER root

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# RUN echo "elasticsearch ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ssl.conf /usr/share/elasticsearch/config/ssl.conf
RUN chown elasticsearch:elasticsearch /usr/local/bin/entrypoint.sh
RUN chown elasticsearch:elasticsearch /usr/share/elasticsearch/config/ssl.conf

RUN chown -R elasticsearch:elasticsearch bin/elasticsearch-certutil

RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /usr/share/elasticsearch/config/certs
COPY certs/ca/ca.crt /usr/share/elasticsearch/config/certs/ca/ca.crt
COPY certs/ca/ca.key /usr/share/elasticsearch/config/certs/ca/ca.key
RUN chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/config/certs
RUN chmod 770 /usr/share/elasticsearch/config/certs

USER elasticsearch

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]