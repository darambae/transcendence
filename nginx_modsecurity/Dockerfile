FROM debian:bookworm-slim AS builder

RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# RUN mkdir -p /certs && \
#     openssl req -newkey rsa:4096 -x509 -sha256 -days 365 -nodes \
#     -out /certs/publicCertificat.crt \
#     -keyout /certs/privatKey.key \
#     -subj "/C=FR/ST=Occitanie/L=Perpignan/O=42 School/OU=omfelk_dabea_kbrener_gdaignea_rmichel/CN=localhost"

RUN mkdir -p /crs && \
    git clone --depth 1 https://github.com/coreruleset/coreruleset /crs && \
    cp /crs/crs-setup.conf.example /crs/crs-setup.conf

FROM owasp/modsecurity:nginx

USER root

RUN apt-get update && \
    apt-get install -y libmodsecurity3 && \
    rm -rf /var/lib/apt/lists/*

# COPY --from=builder /certs /certs
COPY --from=builder /crs /etc/nginx/modsec/crs

COPY ./conf/nginx.conf /etc/nginx/nginx.conff
COPY ./conf/default.conf /etc/nginx/my_config/default.conf
COPY ./conf/modsecurity.conf /etc/nginx/modsec/modsecurity.conf

#USER nginx

EXPOSE 443
CMD ["nginx", "-c", "/etc/nginx/nginx.conff", "-g", "daemon off;"]
