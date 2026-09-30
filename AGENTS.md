# LRJAS — contexto obligatorio para el agente

Léelo **antes** de tocar deploy, nginx, docker-compose, dominios, bootstrap o frontends en prod.
Si algo aquí choca con una intuición tuya, **gana este archivo**.

---

## Mapa de dominios (NUNCA cruzar)

| URL | App | Contenedor | Build context | Puerto host |
|-----|-----|------------|---------------|-------------|
| `https://lrjasmerida.me` | **Asistencias** | `lrjas-web` | `./frontend` | `HTTP_PORT=18080` |
| `https://actividades.lrjasmerida.me` | **Actividades** | `lrjas-web-actividades` | `./frontend-actividades` | `ACTIVIDADES_HTTP_PORT=8081` |
| `https://actividades.lrjasmerida.me/login` | Panel comité | mismo que actividades | — | — |
| `https://lrjasmerida.me/api` | API Nest | `lrjas-backend` | `./backend` | vía proxy |
| `eca360.com.mx` | ECA360 (otro proyecto) | en red Docker compartida | — | **host 8080** |

### Títulos HTML (verificación rápida)

- Asistencias (`lrjas-web` / `lrjasmerida.me`): `LRJAS — Lugar de Reunión de Jóvenes Adultos Solteros`
- Actividades (`lrjas-web-actividades` / `actividades…`): `LRJAS Actividades`

Si los títulos están al revés → **dominios cruzados**. Arreglar con `sudo ./deploy/fix-routing.sh`, no a ojo.

### Reglas nginx / proxy (errores históricos)

1. Upstream **solo** por `container_name` (`lrjas-web`, `lrjas-web-actividades`).
2. **NUNCA** usar el alias Docker corto `web` en nginx: en la red compartida apunta a ECA360 y cruza sitios.
3. `HTTP_PORT` de LRJAS **no** puede ser `8080` (lo usa eca360). Usar `18080`.
4. Regenerar proxy con `deploy/fix-routing.sh` o `deploy/ssl.sh`; no editar a mano `deploy/nginx/proxy.conf` sin preservar el bloque eca360.
5. Tras cualquier cambio de routing: comprobar títulos **dentro** de cada contenedor y luego por HTTPS.

```bash
docker exec lrjas-web wget -qO- http://127.0.0.1/ | grep -o '<title>[^<]*'
docker exec lrjas-web-actividades wget -qO- http://127.0.0.1/ | grep -o '<title>[^<]*'
# Esperado: web = Lugar de Reunión… | web-actividades = LRJAS Actividades
```

---

## Stack prod (VPS)

- Path típico: `/opt/lrjas`
- Compose: `docker-compose.prod.yml` + `docker-compose.ssl.yml`
- Contenedores: `lrjas-postgres`, `lrjas-backend`, `lrjas-web`, `lrjas-web-actividades`, `lrjas-proxy`
- Deploy / SSL: `deploy/ssl.sh`, corrección routing: `deploy/fix-routing.sh`
- Si `git pull` falla por cambios locales en scripts de deploy: `git checkout -- deploy/fix-routing.sh` (o `git restore`) y volver a pull. El remoto manda.

---

## Bootstrap / datos (NO resetear en deploy)

- Entrypoint backend: **solo migraciones**. Nunca `seed` en prod.
- Bootstrap es **idempotente / first-time only**: no borrar roles, permisos, equipos ni usuarios en cada arranque.
- Admin actividades por defecto: código **`000`**.
- Matrimonios: código **`1234`** — **NO** es admin. No meter `1234` en `ACTIVIDADES_ADMIN_CODES`.
- `ACTIVIDADES_ADMIN_CODES` solo códigos que deben ser Administrador; default seguro `000`.

Si “desaparecen” actividades o roles tras deploy: **no** inventar seed; revisar entrypoint/bootstrap y logs. No hay wipe intencional en el flujo normal.

---

## Frontend — convenciones ya decididas

- Calendarios en **español** (FullCalendar locale `es`).
- Confirmaciones con **ConfirmDialog**, no `window.confirm`.
- Calendario público: clic en evento **no** navega a `/evento` roto; no inventar rutas públicas rotas.
- Dashboard “próximas”: fechas en zona **México**, no “hoy” en UTC puro.
- ICS / Google: UTC + VTIMEZONE; recurrencia con tipos válidos del enum (no asumir `DAILY` si el schema usa `INTERVAL`).

---

## Qué NO hacer

- No intercambiar contexts de build (`frontend` ↔ `frontend-actividades`) ni servicios `web` ↔ `web-actividades` en compose/nginx.
- No “arreglar” routing cambiando solo DNS o solo un `server_name` sin verificar títulos en contenedor.
- No poner `ACTIVIDADES_ADMIN_CODES=1234` ni promover Matrimonios a Admin.
- No reintroducir seed en `docker-entrypoint` de prod.
- No documentar/mentir en mensajes de deploy que el dominio principal es Actividades: **principal = Asistencias**.

---

## Checklist post-cambio de routing o deploy

1. `git pull` en `/opt/lrjas` (sin pisar remoto con edits locales basura).
2. Si hubo lío de proxy: `sudo ./deploy/fix-routing.sh`.
3. Títulos dentro de contenedores OK.
4. HTTPS: `lrjasmerida.me` = Asistencias; `actividades.lrjasmerida.me` = Actividades.
5. eca360.com.mx sigue respondiendo (bloque preservado).
6. Hard refresh / ventana privada si el browser cachea.

---

## Actualizar este archivo

Cuando se decida algo permanente (dominio, puerto, código admin, script de deploy), **actualizar este `AGENTS.md` en el mismo PR/commit**. Si no está aquí, el agente lo olvidará.
