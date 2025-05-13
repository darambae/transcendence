FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.5

USER root
# # Install required packages
RUN apt-get update && apt-get install -y openjdk-17-jdk-headless --no-install-recommends && \
    apt-get install -y gosu && \
    apt-get install -y expect && \
    rm -rf /var/lib/apt/lists/*

COPY elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chown elasticsearch:elasticsearch /usr/local/bin/entrypoint.sh
RUN chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/config /usr/share/elasticsearch/data /usr/share/elasticsearch/logs /usr/share/elasticsearch/bin

# USER elasticsearch                                                                                                                                                  

RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 9200 9300
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
