#!/bin/bash
set -e
DATABASE_NAME="${POSTGRES_DB}"
DATABASE_USER="${POSTGRES_USER}"
DATABASE_PASSWORD="${POSTGRES_PASSWORD}"
echo "DATABASE_NAME: $DATABASE_NAME"
echo "DATABASE_USER: $DATABASE_USER"
echo "DATABASE_PASSWORD: $DATABASE_PASSWORD"

# Check if the init.sql file exists, and create it if it doesn't
if [ ! -f /docker-entrypoint-initdb.d/init.sql ]; then
  touch /docker-entrypoint-initdb.d/init.sql
fi

echo "CREATE DATABASE \"$DATABASE_NAME\";" > /docker-entrypoint-initdb.d/init.sql
echo "CREATE USER \"$DATABASE_USER\" WITH PASSWORD '$DATABASE_PASSWORD';" >> /docker-entrypoint-initdb.d/init.sql
echo "GRANT ALL PRIVILEGES ON DATABASE \"$DATABASE_NAME\" TO \"$DATABASE_USER\";" >> /docker-entrypoint-initdb.d/init.sql


# cat <<EOF > /docker-entrypoint-initdb.d/init.sql
# CREATE DATABASE "$DATABASE_NAME";
# EOF