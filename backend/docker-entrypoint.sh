#!/bin/sh
set -e
# Solo migraciones. NUNCA seed en prod (borra/repuebla y da sensación de BD nueva).
npx prisma migrate deploy
node dist/main.js
