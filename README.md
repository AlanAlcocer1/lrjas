# LRJAS — Lugar de Reunión de Jóvenes Adultos Solteros

Aplicación web para gestión de registros y asistencias.

## Despliegue en VPS (DigitalOcean) — recomendado

Todo en un solo servidor con Docker: frontend + API + PostgreSQL.

```
Internet → puerto 80/443 → Nginx (web) → /api → Backend (NestJS) → PostgreSQL
                         └→ React (estático)
```

### 1. Crear Droplet Ubuntu 22/24 en DigitalOcean

- Mínimo **1 GB RAM** (mejor 2 GB)
- Abre firewall: **HTTP (80)** y **HTTPS (443)**

### 2. Primera vez en el VPS

```bash
# Conectar por SSH
ssh root@TU_IP

# Clonar proyecto
git clone https://github.com/TU_USUARIO/lrjas.git /opt/lrjas
cd /opt/lrjas

# Preparar Docker (solo una vez)
chmod +x deploy/setup-vps.sh deploy.sh deploy/ssl.sh
sudo ./deploy/setup-vps.sh

# Configurar variables
cp .env.prod.example .env
nano .env   # cambia contraseñas, FRONTEND_URL=https://lrjasmerida.me

# Desplegar
./deploy.sh
```

Apunta el DNS de `lrjasmerida.me` a la IP del Droplet.

### 3. HTTPS (opcional, después del primer deploy)

```bash
sudo ./deploy/ssl.sh lrjasmerida.me tu@email.com
```

Actualiza `.env`: `FRONTEND_URL=https://lrjasmerida.me` y vuelve a correr `./deploy.sh`.

### 4. Actualizar la app

```bash
cd /opt/lrjas
./deploy.sh
```

El script hace `git pull`, rebuild y `docker compose up -d`.

### Comandos útiles

```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml down
```

### Admin

Usuario maestro (si la BD está vacía): ver `MASTER_USER_*` en `.env`.

---

## Desarrollo local

```bash
npm run install:all
npm run dev
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001/api |

Usa `docker compose up -d` (sin `.prod`) para entorno local con Docker.

## GitHub Pages (solo frontend estático)

Si solo publicas el front en GitHub Pages, el backend debe estar en otro servidor y configurar `VITE_API_URL` en GitHub Actions. Para producción completa, usa el VPS de arriba.

## Stack

- **Frontend:** React, Vite, Tailwind, Nginx
- **Backend:** NestJS, Prisma, PostgreSQL, JWT
