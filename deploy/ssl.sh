#!/usr/bin/env bash
# HTTPS con Let's Encrypt (ejecutar en el VPS después del primer deploy en HTTP).
# Uso: sudo ./deploy/ssl.sh lrjasmerida.me tu@email.com
# Opcional 3er arg: subdominio de actividades (default actividades.<dominio>)
set -euo pipefail

DOMAIN="${1:?Uso: sudo ./deploy/ssl.sh dominio.com email@ejemplo.com}"
EMAIL="${2:?Uso: sudo ./deploy/ssl.sh dominio.com email@ejemplo.com}"
ACTIVIDADES_HOST="${3:-actividades.${DOMAIN}}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

apt-get update -y
apt-get install -y certbot

docker compose -f docker-compose.prod.yml stop web web-actividades || true

certbot certonly --standalone --expand \
  -d "$DOMAIN" -d "www.${DOMAIN}" -d "$ACTIVIDADES_HOST" \
  --email "$EMAIL" --agree-tos --non-interactive

mkdir -p deploy/nginx

cat > deploy/nginx/proxy.conf <<EOF
upstream lrjas_asistencias {
    server web:80;
}

upstream lrjas_actividades {
    server web-actividades:80;
}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${ACTIVIDADES_HOST};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://lrjas_asistencias;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name ${ACTIVIDADES_HOST};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://lrjas_actividades;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

cat > docker-compose.ssl.yml <<EOF
services:
  proxy:
    image: nginx:alpine
    container_name: lrjas-proxy
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./deploy/nginx/proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web
      - web-actividades
    networks:
      - lrjas
EOF

# Evitar choque de puertos: webs internas, proxy en 80/443
if grep -q '^HTTP_PORT=' .env 2>/dev/null; then
  sed -i 's/^HTTP_PORT=.*/HTTP_PORT=8080/' .env
else
  echo 'HTTP_PORT=8080' >> .env
fi
if grep -q '^ACTIVIDADES_HTTP_PORT=' .env 2>/dev/null; then
  sed -i 's/^ACTIVIDADES_HTTP_PORT=.*/ACTIVIDADES_HTTP_PORT=8081/' .env
else
  echo 'ACTIVIDADES_HTTP_PORT=8081' >> .env
fi

docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d

echo "HTTPS activo:"
echo "  Asistencias: https://${DOMAIN}"
echo "  Actividades: https://${ACTIVIDADES_HOST}"
echo "  Panel comité: https://${ACTIVIDADES_HOST}/login  (luego /app)"
echo "Renovación: certbot renew"
