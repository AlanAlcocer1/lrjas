#!/usr/bin/env bash
# Despliegue / actualización en VPS (DigitalOcean, etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_ARGS=(-f "$COMPOSE_FILE")
if [ -f docker-compose.ssl.yml ]; then
  COMPOSE_ARGS+=(-f docker-compose.ssl.yml)
  echo "    (HTTPS: docker-compose.ssl.yml detectado)"
fi

if [ ! -f .env ]; then
  echo "No existe .env"
  echo "Copia la plantilla: cp .env.prod.example .env"
  echo "Luego edita las contraseñas y FRONTEND_URL."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

echo "==> LRJAS — despliegue en producción"
echo "    FRONTEND_URL=${FRONTEND_URL:-http://localhost}"
echo ""

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo "==> Actualizando código (git pull)..."
  git pull --ff-only || echo "Aviso: git pull falló, continuando con código local."
fi

echo "==> Construyendo imágenes..."
docker compose "${COMPOSE_ARGS[@]}" build

echo "==> Levantando base de datos..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres

echo "==> Aplicando migraciones (Prisma migrate deploy)..."
docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps --entrypoint "" backend npx prisma migrate deploy

echo "==> Levantando servicios..."
docker compose "${COMPOSE_ARGS[@]}" up -d

echo "==> Estado:"
docker compose "${COMPOSE_ARGS[@]}" ps

echo ""
echo "Despliegue completado."
echo "App: ${FRONTEND_URL:-http://localhost}"
echo "API: ${FRONTEND_URL:-http://localhost}/api"
echo ""
echo "Logs: docker compose ${COMPOSE_ARGS[*]} logs -f"
echo "Parar: docker compose ${COMPOSE_ARGS[*]} down"
