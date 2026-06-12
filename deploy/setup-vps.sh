#!/usr/bin/env bash
# Ejecutar UNA VEZ en un Droplet Ubuntu nuevo de DigitalOcean (como root o con sudo).
set -euo pipefail

echo "==> Actualizando sistema..."
apt-get update -y
apt-get upgrade -y

echo "==> Instalando dependencias..."
apt-get install -y git curl ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "==> Instalando plugin Docker Compose..."
  apt-get install -y docker-compose-plugin
fi

echo "==> Habilitando Docker al inicio..."
systemctl enable docker
systemctl start docker

if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "Usuario $SUDO_USER agregado al grupo docker (cierra sesión y vuelve a entrar)."
fi

echo ""
echo "VPS listo. Siguiente paso:"
echo "  1. Clona el repo en /opt/lrjas (o similar)"
echo "  2. cp .env.prod.example .env && nano .env"
echo "  3. ./deploy.sh"
