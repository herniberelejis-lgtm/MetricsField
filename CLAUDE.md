# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Este proyecto trabaja **en español**: comentarios de código, mensajes de commit,
nombres de dominio (`Cliente`, `comercios`, `registrarAccion`), UI y docs. Escribí
en español salvo que el usuario pida otra cosa.

## Qué es

MetricsField (ex "Taply") — plataforma de gestión de reputación online para comercios locales de
Córdoba, Argentina. Un cartel NFC dirige al cliente final directo a dejar una
reseña en Google — sin pantallas intermedias, el mismo camino para todos.
Detrás hay un panel para el equipo y un portal de solo lectura para cada
comercio. Producción: `main` → Vercel, dominio `https://app.metricsfield.com`
(el dominio raíz `metricsfield.com` es la landing, en un repo aparte). El doc
de contexto más actualizado del proyecto es `docs/CONTEXTO-Y-PROGRESO.md`.

## Comandos

```bash
npm run dev            # desarrollo en http://localhost:3000
npm run build          # next build (compilación de producción)
npm run start          # servir el build
npm run lint           # next lint
npx tsc --noEmit       # chequeo de tipos (paso previo a commitear)
```

No hay framework de tests ni suite de pruebas. El ciclo de verificación por tarea
es: `npx tsc --noEmit` + `next build`; si compila, commitear en español.

Base de datos local/producción: se cargan a mano con
`psql "<DATABASE_URL>" -f db/schema.sql` y `-f db/seed.sql`.

## Reglas críticas (romperlas causa daño real)

- **Nunca sacar `prepare: false` de `lib/sql.ts`.** Neon corre en modo pooler
  (PgBouncer) y los prepared statements con nombre provocan el error random
  `cached plan must not change result type`.
- **Cambios de esquema no se auto-aplican.** `db/schema.sql` es la referencia
  canónica pero el entorno de Claude no tiene acceso a Neon. Cualquier
  `ALTER TABLE` / tabla nueva se entrega como un archivo `.sql` aparte para
  correr a mano en el SQL Editor de Neon. Nunca asumir que "ya se aplicó".
- **Ningún `DROP`/`DELETE` masivo sin avisar y confirmar antes** — ya hubo una
  pérdida de datos real por esto.
- **Nunca pushear directo a `main`.** `main` es producción; todo cambio va por una
  rama de sesión (genera preview propia en Vercel) y se fusiona con PR.
- **Sin desvío de reseñas (base legal del producto):** el "star-gate" (desviar
  1-3★ a un formulario privado) fue **eliminado del producto** a pedido del
  dueño — el cartel manda a todos directo al mismo link público de Google.
  No reintroducirlo: cualquier variante de filtrar/desviar por calificación
  roza el "review gating" que Google penaliza. Las columnas `usar_filtro` y
  la tabla `feedback` siguen en la base solo como resto histórico — el código
  ya no las escribe.
- **"Posición en Maps" fue eliminada del producto** — no se puede automatizar de
  forma honesta. Referencias en docs viejos están obsoletas; no reintroducir.

## Arquitectura

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3. **Sin ORM ni API
REST separada.** UI propia (sin librería de componentes externa), alias `@/*` → raíz.

**Capa de datos — `lib/db.ts` es el archivo más importante del repo.** Concentra
todo el acceso a datos con SQL directo (driver `postgres`, cliente en `lib/sql.ts`).
Cada función mapea filas `snake_case` (columnas SQL) → objetos `camelCase` de
`lib/types.ts` mediante mappers explícitos. `lib/types.ts` es el modelo de dominio.
Al agregar una columna hay que tocar los tres lugares: schema `.sql`, el mapper en
`db.ts` y el tipo en `types.ts`.

**Mutaciones — Server Actions, no endpoints.** Los formularios llaman funciones
`"use server"` directamente. Actions de admin en `app/actions.ts`; login en
`app/login/actions.ts`; escritura pública (tap/feedback) en `app/t/actions.ts`.
Toda action de admin empieza con `await requireAdmin()` (defensa aparte del
middleware) y deja rastro de auditoría vía el helper de `app/actions.ts` que
inserta en la tabla `auditoria` con el email del admin (de `emailAdminActual`).

**Tres sistemas de acceso que no se pisan** (ver `docs/CONTEXTO-Y-PROGRESO.md` §4):
1. Cliente → su portal `/portal/[codigo]`: el código privado es la credencial,
   solo lectura, aislado a sus datos.
2. Equipo → panel `/admin`: contraseña compartida (`ADMIN_PASSWORD`, cookie
   SHA-256) **o** login con Google restringido a la allowlist de la tabla `admins`
   (cookie firmada con HMAC del client secret). `middleware.ts` protege `/admin`;
   la lógica de sesión vive en `lib/auth.ts`.
3. Cliente → conexión de Google Business Profile desde su portal: no es un login a
   Taply, es un permiso de datos OAuth con la cuenta del propio cliente.

**Google / integraciones.** `lib/places.ts` (Places API, rating/reseñas),
`lib/gbp.ts` (Business Profile Performance) y `lib/google-oauth.ts` (OAuth genérico:
sirve tanto para el login del equipo como para la conexión GBP por cliente).
Sincronización diaria vía Vercel Cron (`vercel.json` → `/api/cron/sync-google`,
autenticado con `Bearer CRON_SECRET`). El "enchufe" a la API de Anthropic existe en
el código pero está sin usar (audits/respuestas hoy son manuales o por plantilla).

**Rutas públicas** (no pasan por auth de admin): `/` (landing), `/t/[slug]`
(star-gate del tap NFC), `/portal/[codigo]`, `/login`, `/privacidad`.

## Variables de entorno

Obligatoria en producción: `ADMIN_PASSWORD` (sin ella el panel se bloquea),
`DATABASE_URL`. Opcionales: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `GOOGLE_PLACES_API_KEY`,
`CRON_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`. Detalle
completo en `.env.example`.

## DNS de producción

`app.metricsfield.com` apunta a Vercel vía **CNAME** (`app` →
`5ffa34d97352b7b0.vercel-dns-017.com.`, TTL 300) — no un `A` fijo, para que
Vercel pueda rotar sus IPs de borde sin romper el dominio. Se administra en
el mismo proveedor de DNS que aloja la landing de `metricsfield.com` (fuera
de este repo), no en Vercel DNS. Si ese CNAME desaparece, todo cartel
NFC/QR (`/t/<slug>`) y el link del portal dejan de resolver para el
cliente final — antes de tocar esa zona DNS por cualquier otro motivo
(mail, otro subdominio, etc.), confirmar que este registro sigue estando.
