#!/bin/sh
set -e

# Solo aplica migraciones pendientes (no resetea ni borra datos).
npx prisma migrate deploy

# Seed upserts (no drop). Omítelo al restaurar un pg_dump: SKIP_DB_SEED=1
if [ "${SKIP_DB_SEED:-0}" != "1" ]; then
  npx prisma db seed || true
fi

exec node dist/main.js
# Solo migraciones. NUNCA seed en prod (borra/repuebla y da sensación de BD nueva).
npx prisma migrate deploy
node dist/main.js
