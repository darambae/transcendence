#!/bin/bash

FILE="/etc/nginx/modsec/crs/rules/REQUEST-901-INITIALIZATION.conf"
BACKUP="${FILE}.bak_$(date +%Y%m%d%H%M%S)"

cp "$FILE" "$BACKUP"

grep -q "PATCH" "$FILE"
if [ $? -eq 0 ]; then
  echo "PATCH est déjà présent dans $FILE"
else
  sed -i "/tx.allowed_methods/ s/\(tx.allowed_methods=[^']*\)'/\1 PATCH DELETE'/" "$FILE"
  echo "PATCH ajouté dans $FILE"
fi

echo "Ligne modifiée contenant tx.allowed_methods :"
grep "tx.allowed_methods" "$FILE"

nginx -c /etc/nginx/nginx.conff -g "daemon off;"