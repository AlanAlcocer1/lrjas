#!/usr/bin/env bash
# Corrige routing HTTPS: lrjasmerida.me → asistencias, actividades.* → actividades
# Uso en el VPS: sudo ./deploy/fix-routing.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${1:-lrjasmerida.me}"
ACTIVIDADES_HOST="${2:-actividades.${DOMAIN}}"

echo "==> Ajustando puertos (8080 lo usa eca360)"
if grep -q '^HTTP_PORT=' .env 2>/dev/null; then
  sed -i 's/^HTTP_PORT=.*/HTTP_PORT=18080/' .env
else
  echo 'HTTP_PORT=18080' >> .env
fi
if grep -q '^ACTIVIDADES_HTTP_PORT=' .env 2>/dev/null; then
  sed -i 's/^ACTIVIDADES_HTTP_PORT=.*/ACTIVIDADES_HTTP_PORT=8081/' .env
else
  echo 'ACTIVIDADES_HTTP_PORT=8081' >> .env
fi

mkdir -p deploy/nginx

echo "==> Escribiendo proxy.conf"
cat > deploy/nginx/proxy.conf <<EOF
upstream lrjas_asistencias {
    server lrjas-web:80;
}

upstream lrjas_actividades {
    server lrjas-web-actividades:80;
}

server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} ${ACTIVIDADES_HOST};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
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

if [ ! -f docker-compose.ssl.yml ]; then
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
fi

COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml)

echo "==> Levantando servicios"
"${COMPOSE[@]}" up -d

echo "==> Títulos por puerto (deben diferir)"
echo -n "  :18080 (asistencias): "
curl -fsS http://127.0.0.1:18080 2>/dev/null | grep -o '<title>[^<]*' || echo "(falló — rebuild web)"
echo -n "  :8081  (actividades): "
curl -fsS http://127.0.0.1:8081 2>/dev/null | grep -o '<title>[^<]*' || echo "(falló — rebuild web-actividades)"

ASIS_TITLE="$(curl -fsS http://127.0.0.1:18080 2>/dev/null | grep -o '<title>[^<]*' || true)"
ACT_TITLE="$(curl -fsS http://127.0.0.1:8081 2>/dev/null | grep -o '<title>[^<]*' || true)"

if echo "$ASIS_TITLE" | grep -qi 'Actividades' && ! echo "$ASIS_TITLE" | grep -qi 'Reunión'; then
  echo "==> Imágenes cruzadas: rebuild --no-cache"
  "${COMPOSE[@]}" build --no-cache web web-actividades
  "${COMPOSE[@]}" up -d
fi

echo "==> Reiniciando proxy"
docker restart lrjas-proxy
sleep 2

echo "==> HTTPS por Host header"
echo -n "  https://${DOMAIN}: "
curl -sk --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" | grep -o '<title>[^<]*' || echo "(error)"
echo -n "  https://${ACTIVIDADES_HOST}: "
curl -sk --resolve "${ACTIVIDADES_HOST}:443:127.0.0.1" "https://${ACTIVIDADES_HOST}/" | grep -o '<title>[^<]*' || echo "(error)"

echo ""
echo "Listo. Prueba en el navegador (ventana privada):"
echo "  https://${DOMAIN}"
echo "  https://${ACTIVIDADES_HOST}"
