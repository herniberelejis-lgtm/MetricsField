# Deploy — stack Express + React (migración)

Producción con un solo proceso Node: API en `/api/*`, SPA estático, taps NFC en `/t/:slug`.

## Requisitos

- Node 22+ (local) o Docker
- Base Neon (`DATABASE_URL`) con schema aplicado (`db/schema.sql`)
- Variables de `.env.example` — mínimo:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres (Neon) |
| `ADMIN_PASSWORD` | Panel admin |
| `NEXT_PUBLIC_BASE_URL` | `https://app.metricsfield.com` — OAuth, QR, emails |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Login equipo + GBP clientes |
| `CRON_SECRET` | Bearer para `/api/cron/sync-google` |
| `GOOGLE_PLACES_API_KEY` | Sync rating/reseñas |
| `SMTP_*` | Alertas y resúmenes (opcional) |

En el contenedor: `SERVE_SPA=true` y `PORT` (Railway/Fly lo setean solos).

## Build local (sin Docker)

```bash
npm ci
npm run build:migracion
SERVE_SPA=true npm run start:migracion
# → http://localhost:4000
```

## Docker

```bash
npm run docker:migracion:build
npm run docker:migracion:up
```

La imagen usa `Dockerfile.migracion` (multi-stage: Vite build + runtime slim).

## Railway / Render / Fly

1. Conectar repo, rama `Migracion` (o la de cutover).
2. **Build:** Dockerfile.migracion, o:
   - Build: `npm ci && npm run build:migracion`
   - Start: `npm run start:prod`
3. **Health check:** `GET /api/health` → `{"ok":true}`
4. **Dominio:** `app.metricsfield.com` → servicio (CNAME como en CLAUDE.md).
5. Copiar todas las env de producción desde Vercel/Neon.

## Cron diario (sincronización Google)

Vercel Cron deja de correr al cortar Next. Programar un job externo:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://app.metricsfield.com/api/cron/sync-google"
```

Opciones: cron-job.org, GitHub Actions schedule, Railway cron — **1 vez por día** (ej. 06:00 ART).

## Smoke tests post-deploy

- [ ] `GET /api/health`
- [ ] `/login` → panel admin
- [ ] OAuth Google equipo
- [ ] `/portal/<codigo>` carga
- [ ] `/t/<slug>` redirige (cartel NFC)
- [ ] Cron manual con `CRON_SECRET`

## Cutover desde Next (Vercel)

1. Deploy Express en staging con misma `DATABASE_URL`.
2. Smoke tests en staging.
3. Apuntar `app.metricsfield.com` al nuevo host.
4. Configurar cron externo.
5. Mantener Vercel en standby antes de apagar Next.

## Desarrollo

```bash
npm run dev:migracion   # API :4000 + Vite :5173 (proxy /api)
```
