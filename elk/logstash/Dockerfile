FROM docker.elastic.co/logstash/logstash:8.17.5

USER root
RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*
COPY config/logstash.yml /usr/share/logstash/config/logstash.yml
COPY pipeline/my_pipeline.conf /usr/share/logstash/pipeline/my_pipeline.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh  
RUN chown -R logstash:logstash /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN chown -R logstash:logstash /usr/share/logstash/config /usr/share/logstash/pipeline
EXPOSE 5044
EXPOSE 9600
EXPOSE 6006
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
