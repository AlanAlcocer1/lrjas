#!/usr/bin/env bash
# Corrige routing HTTPS de forma definitiva.
#   lrjasmerida.me          → asistencias (lrjas-web)
#   actividades.lrjasmerida.me → actividades (lrjas-web-actividades)
#   eca360.com.mx           → se preserva si ya estaba
# Uso: sudo ./deploy/fix-routing.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${1:-lrjasmerida.me}"
ACTIVIDADES_HOST="${2:-actividades.${DOMAIN}}"
COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml)

echo "==> Puertos host (8080 = eca360)"
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

# Preservar bloque eca360 si existe
ECA_BLOCK=""
if [ -f deploy/nginx/proxy.conf ] && grep -q 'eca360.com.mx' deploy/nginx/proxy.conf; then
  ECA_BLOCK="$(awk '/upstream eca360_web/,0' deploy/nginx/proxy.conf)"
fi

echo "==> Escribiendo proxy.conf (SOLO container_name, nunca alias 'web')"
cat > deploy/nginx/proxy.conf <<EOF
# AUTO: no editar a mano — regenerar con deploy/fix-routing.sh
# asistencias = lrjas-web | actividades = lrjas-web-actividades

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

# DOMINIO PRINCIPAL = asistencias
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

# SUBDOMINIO = actividades
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

if [ -n "$ECA_BLOCK" ]; then
  echo "" >> deploy/nginx/proxy.conf
  echo "$ECA_BLOCK" >> deploy/nginx/proxy.conf
  echo "==> Bloque eca360 preservado"
fi

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

# Reconectar eca360 si hace falta
docker network connect deploy_eca360 lrjas-proxy 2>/dev/null || true

echo "==> Levantando servicios"
"${COMPOSE[@]}" up -d

title_of() {
  # $1 = container name
  docker exec "$1" wget -qO- http://127.0.0.1/ 2>/dev/null | grep -o '<title>[^<]*' | head -1 || true
}

echo "==> Títulos DENTRO de cada contenedor"
WEB_T="$(title_of lrjas-web)"
ACT_T="$(title_of lrjas-web-actividades)"
echo "  lrjas-web:              ${WEB_T:- (vacío)}"
echo "  lrjas-web-actividades:  ${ACT_T:- (vacío)}"

needs_rebuild=0
# asistencias debe decir Reunión / Lugar; NO solo "Actividades"
if echo "$WEB_T" | grep -qi 'Actividades' && ! echo "$WEB_T" | grep -qiE 'Reunión|Reunion|Lugar'; then
  echo "==> lrjas-web tiene la imagen de ACTIVIDADES (cruzado)"
  needs_rebuild=1
fi
# actividades debe decir Actividades
if echo "$ACT_T" | grep -qiE 'Reunión|Reunion|Lugar' && ! echo "$ACT_T" | grep -qi 'Actividades'; then
  echo "==> lrjas-web-actividades tiene la imagen de ASISTENCIAS (cruzado)"
  needs_rebuild=1
fi

if [ "$needs_rebuild" = "1" ]; then
  echo "==> Rebuild --no-cache web + web-actividades"
  "${COMPOSE[@]}" build --no-cache web web-actividades
  "${COMPOSE[@]}" up -d --force-recreate web web-actividades
  sleep 2
  WEB_T="$(title_of lrjas-web)"
  ACT_T="$(title_of lrjas-web-actividades)"
  echo "  lrjas-web:              ${WEB_T:- (vacío)}"
  echo "  lrjas-web-actividades:  ${ACT_T:- (vacío)}"
fi

echo "==> Recargando proxy"
docker restart lrjas-proxy
sleep 2

echo "==> HTTPS"
echo -n "  https://${DOMAIN}: "
curl -sk --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" | grep -o '<title>[^<]*' || echo "(error)"
echo -n "  https://${ACTIVIDADES_HOST}: "
curl -sk --resolve "${ACTIVIDADES_HOST}:443:127.0.0.1" "https://${ACTIVIDADES_HOST}/" | grep -o '<title>[^<]*' || echo "(error)"

echo ""
echo "Esperado:"
echo "  ${DOMAIN} → LRJAS — Lugar de Reunión..."
echo "  ${ACTIVIDADES_HOST} → LRJAS Actividades"
