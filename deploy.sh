#!/usr/bin/env bash
# Despliegue / actualización en VPS (DigitalOcean, etc.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"

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
docker compose -f "$COMPOSE_FILE" build

echo "==> Levantando servicios..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Estado:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Despliegue completado."
echo "App: ${FRONTEND_URL:-http://localhost}"
echo "API: ${FRONTEND_URL:-http://localhost}/api"
echo ""
echo "Logs: docker compose -f $COMPOSE_FILE logs -f"
echo "Parar: docker compose -f $COMPOSE_FILE down"
