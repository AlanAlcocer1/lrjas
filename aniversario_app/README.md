# LRJAS — Cápsula del tiempo

Micrositio React standalone (Vite). **Sin Webflow.** El front va a **Cloudflare Pages**; la API es la de Coolify (`api.lrjas.onema.tech`). No hace falta `docker-compose.prod.yml` para este sitio.

El espejo HTTrack en `lrjas_timeline/` es solo referencia; no se usa en build.

## Desarrollo

```bash
cd aniversario_app
npm install
npm run dev
```

Abre http://localhost:5175/ (o el puerto que asigne Vite).

```bash
npm run build    # dist/
npm run preview
```

Local:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Producción — Cloudflare Pages

Dominio: **`https://aniversario.lrjasmerida.me`**  
API: **`https://api.lrjas.onema.tech/api`**

### 1. Proyecto Pages

| Campo | Valor |
|--------|--------|
| Repo | este (`lrjas`) |
| Root directory | `aniversario_app` |
| Build command | `npm ci && npm run build` |
| Build output | `dist` |
| Node | 20 |

### 2. Variable de entorno (Build)

```env
VITE_API_URL=https://api.lrjas.onema.tech/api
```

(Solo en el **build** de Pages; se incrusta en el JS.)

### 3. Dominio custom

En Pages → Custom domains: `aniversario.lrjasmerida.me`  
DNS (Cloudflare): CNAME → el target que te dé Pages (o proxied).

### 4. Backend Coolify (mismo `api.lrjas…`)

Sin redeploy del front en Docker. En el servicio **backend**:

```env
# CORS: incluir la cápsula (coma-separado si usas FRONTEND_URLS)
FRONTEND_URL=https://lrjasmerida.me
FRONTEND_URLS=https://lrjasmerida.me,https://actividades.lrjasmerida.me,https://aniversario.lrjasmerida.me

STORAGE_BACKEND=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev
# R2_PREFIX=lrjas

ANNIVERSARY_MODERATION_PASSWORD=Alan2908
```

Checklist rápido backend:

- [ ] Vars R2 rellenadas y bucket legible en público (`image_url`)
- [ ] `ANNIVERSARY_MODERATION_PASSWORD` en el env del contenedor
- [ ] `FRONTEND_URLS` con `https://aniversario.lrjasmerida.me`
- [ ] Migración `anniversary_memories` aplicada (redeploy / migrate)
- [ ] Límite de body del proxy Coolify ≥ 100 MB para subidas grandes

### 5. Smoke test

1. `https://aniversario.lrjasmerida.me` carga
2. `GET https://api.lrjas.onema.tech/api/anniversary-memories?limit=1` → 200
3. Subir una foto de prueba
4. Moderación (botón `···` en créditos) con la contraseña

---

## Recuerdos (API + R2)

Endpoints: `GET/POST/DELETE /api/anniversary-memories`  
Cada foto → **800×1000 WebP** en R2 + fila en `anniversary_memories`.

## Textos estáticos

Edita [`src/content/capsule.ts`](src/content/capsule.ts).  
`fallbackMemories` solo si la API no tiene fotos.

## Stack

- Vite + React + TypeScript + Framer Motion
- Tipografía / colores LRJAS en `src/styles/global.css`
