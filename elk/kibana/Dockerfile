FROM docker.elastic.co/kibana/kibana:8.17.5

USER root

RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*

COPY my_kibana.yml /usr/share/kibana/config/my_kibana.yml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chown kibana:kibana /usr/local/bin/entrypoint.sh
RUN chown -R kibana:kibana /usr/share/kibana/config
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]