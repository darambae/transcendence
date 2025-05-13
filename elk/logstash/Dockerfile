# FROM docker.elastic.co/logstash/logstash:8.17.5

# USER root

# COPY config/logstash.yml /usr/share/logstash/config/logstash.yml
# COPY pipeline/my_pipeline.conf /usr/share/logstash/pipeline/logstash.conf
# # COPY entrypoint.sh /usr/local/bin/entrypoint.sh
# # RUN chown logstash:logstash /usr/local/bin/entrypoint.sh
# RUN chown -R logstash:logstash /usr/share/logstash/config /usr/share/logstash/pipeline 
# RUN chmod 770 /usr/share/logstash/config
# # RUN chmod +x /usr/local/bin/entrypoint.sh
# USER logstash
# # ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

FROM docker.elastic.co/logstash/logstash:8.17.5

USER root
RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*
COPY config/logstash.yml /usr/share/logstash/config/logstash.yml
COPY pipeline/my_pipeline.conf /usr/share/logstash/pipeline/my_pipeline.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh  
RUN chown -R logstash:logstash /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN chown -R logstash:logstash /usr/share/logstash/config /usr/share/logstash/pipeline

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
