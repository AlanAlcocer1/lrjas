#!/usr/bin/env bash
# HTTPS con Let's Encrypt (ejecutar en el VPS después del primer deploy en HTTP).
# Uso: sudo ./deploy/ssl.sh lrjasmerida.me tu@email.com
set -euo pipefail

DOMAIN="${1:?Uso: sudo ./deploy/ssl.sh dominio.com email@ejemplo.com}"
EMAIL="${2:?Uso: sudo ./deploy/ssl.sh dominio.com email@ejemplo.com}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

apt-get update -y
apt-get install -y certbot

docker compose -f docker-compose.prod.yml stop web

certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

mkdir -p deploy/nginx/ssl

cat > deploy/nginx/ssl.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location /api/ {
        proxy_pass http://backend:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Montar certificados y config SSL en compose override
cat > docker-compose.ssl.yml <<EOF
services:
  web:
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./deploy/nginx/ssl.conf:/etc/nginx/conf.d/default.conf:ro
EOF

docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d web

echo "HTTPS activo en https://${DOMAIN}"
echo "Renovación: certbot renew (añade cron si quieres)"
