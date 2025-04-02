FROM postgres:17.4

COPY generate_init.sh /generate_init.sh

RUN chmod +x /generate_init.sh

CMD ["/generate_init.sh"]