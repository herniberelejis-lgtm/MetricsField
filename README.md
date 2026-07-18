# Taply — plataforma de reputación para pymes de Córdoba

Un comercio local recibe un cartel NFC. El cliente final acerca el teléfono →
se abre una página con la marca del comercio → deja su reseña en Google en 10
segundos. Detrás de ese tap hay una plataforma completa: captación de reseñas
con star-gate legal, CRM de feedback, checklist SEO, Audit GEO (¿te recomienda
la IA?), monitoreo de competencia, reportes mensuales y un portal privado por
cliente.

> Estado: **producto operativo, 100% gratis para correr.** Todo funciona sin
> ninguna API paga — el enchufe a una API de IA real (respuestas, audits)
> queda listo para cuando decidas pagarla, pero hoy no hace falta.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS 3**
- **Postgres puro** (sin ORM) vía el driver [`postgres`](https://github.com/porsager/postgres) —
  100% JavaScript, sin binarios nativos que instalar. Mismo motor en tu PC y en
  producción ([Neon](https://neon.tech), gratis).
- **`motion`** para las animaciones de la landing pública.

## Correr en tu PC

### 1. Base de datos (una sola vez)

Necesitás un Postgres. Elegí uno:

**Opción A — instalarlo en tu PC** (Windows/Mac/Linux, gratis):
1. Instalá PostgreSQL desde [postgresql.org/download](https://www.postgresql.org/download/)
2. Creá la base: `createdb taply` (o con pgAdmin, crear una DB llamada `taply`)
3. Anotá el usuario/contraseña que configuraste al instalar

**Opción B — Neon en la nube** (gratis, cero instalación, recomendado si no
querés tocar nada localmente): seguí los pasos de la sección
[Deploy a producción](#deploy-a-producción) y usá esa misma URL también en tu PC.

Con la base creada (vacía), cargá el esquema y los datos de ejemplo:

```bash
psql "postgres://usuario:clave@localhost:5432/taply" -f db/schema.sql
psql "postgres://usuario:clave@localhost:5432/taply" -f db/seed.sql
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local` con tu `DATABASE_URL` real (la de arriba) y una
`ADMIN_PASSWORD` a tu gusto.

### 3. Arrancar

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros scripts: `npm run build`, `npm run start`, `npm run lint`.

## Deploy a producción (Vercel + Neon, los dos gratis)

1. **Base de datos — [neon.tech](https://neon.tech)**: creá una cuenta gratis
   (sin tarjeta), creá un proyecto, copiá el **connection string** que te da
   (empieza con `postgres://` y termina en `?sslmode=require`).
2. Con esa URL, corré desde tu PC (una sola vez, para crear las tablas en Neon):
   ```bash
   psql "postgres://...tu-url-de-neon...?sslmode=require" -f db/schema.sql
   psql "postgres://...tu-url-de-neon...?sslmode=require" -f db/seed.sql
   ```
3. **Vercel**: importá este repo en [vercel.com/new](https://vercel.com/new).
   Antes de tocar "Deploy", en **Environment Variables** agregá:
   - `DATABASE_URL` = la URL de Neon del paso 1
   - `ADMIN_PASSWORD` = tu contraseña del panel
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` = tu número de WhatsApp (código de país, sin +)
4. Deploy. Cada `git push` a esta rama redeploya solo.

**Importante:** a diferencia de la versión vieja de este proyecto, los datos
YA NO viajan en el repo — viven en Neon. `git push` actualiza el código; los
datos de tus clientes se cargan directamente desde el panel en producción (o
en tu PC si usás la misma base).

## El runbook del día a día

1. **Vendiste una tarjeta / cerraste un cliente** → `/admin/clientes/nuevo`.
   Se genera solo: un slug, un código de portal, y un link NFC de "Mostrador"
   apuntando al star-gate de reseñas.
2. **Programar el chip NFC**: con la app gratuita **NFC Tools** (Android/iOS),
   escribí en el chip la URL `https://tudominio.com/t/<slug-del-link>` — la
   ves en la ficha del cliente → *Links NFC*. Si querés otro link por mesa o
   sucursal, creá uno nuevo ahí mismo (cada uno con su propia etiqueta).
3. **Cargar el mes** → ficha del cliente → *+ Cargar métricas* (si el mes ya
   existe, se reemplaza).
4. **Reseñas que llegan por fuera de Google** (te las pasan por teléfono, las
   ves en Instagram, etc.) → ficha → *CRM de reseñas* → "Cargar reseña". El
   botón de respuesta sugerida genera un texto por plantilla — editalo y
   pegalo en Google.
5. **Feedback privado** (alguien tocó el cartel y calificó 1-3★) aparece solo
   en el CRM, con un botón para avisarle al dueño por WhatsApp en un clic.
6. **Una vez por semana**: *Competencia* → actualizá el rating/reseñas de 3-5
   competidores a mano (o mirá Google Maps 2 minutos).
7. **Una vez por mes**: *Audit GEO* → copiá una pregunta, pegala en ChatGPT o
   Claude.ai (gratis), y registrá si te menciona. Es la mejor demo de venta:
   "hoy no te menciona, en 2 meses sí".
8. **Venderle el acceso** → la ficha muestra el **código de portal** y el link
   `/portal/<codigo>` para mandarle por WhatsApp. El cliente ve solo sus
   datos: reseñas, posición en Maps, taps del cartel, feedback resuelto,
   checklist SEO y (Premium) sus citaciones en IA. *Regenerar código* corta
   el acceso anterior si deja de pagar.

## Estructura

```
app/
  page.tsx                        Landing pública (/) — la usás para vender
  admin/                          Panel interno, protegido por ADMIN_PASSWORD
    page.tsx                      Panel general (KPIs de cartera)
    analytics/                    Analytics de cartera (filtros + gráficos)
    clientes/                     Grilla, alta, ficha, edición, métricas
    clientes/[id]/links/          Gestor de links NFC + taps por día
    clientes/[id]/crm/            CRM de reseñas + feedback privado
    clientes/[id]/seo/            Checklist SEO local
    clientes/[id]/geo/            Audit GEO manual asistido
    clientes/[id]/competencia/    Monitoreo de competencia
    reportes/                     Reporte mensual imprimible
  t/[slug]/                       La página de tap pública (star-gate)
  portal/[codigo]/                Portal del cliente (read-only, por código)
  login/, api/logout/             Autenticación del panel
  actions.ts                      Server actions (todas las mutaciones)
components/
  tap/TapStarGate.tsx             Pantalla que ve el cliente final
  charts/                         Primitivas SVG propias (sin librerías)
  forms.tsx, ui.tsx                Formularios y piezas de UI compartidas
db/
  schema.sql                      Todo el esquema (9 tablas)
  seed.sql                        Datos de ejemplo (7 comercios)
lib/
  sql.ts                          Cliente Postgres (lee DATABASE_URL)
  db.ts                           TODAS las consultas (CRUD en SQL directo)
  types.ts                        Modelo de dominio
  respuestas.ts                   Generador de respuestas por plantilla
  whatsapp.ts                     Helper de links wa.me
  recomendacion.ts                Recomendación del reporte mensual
```

## Modelo de dominio

Un **Comercio** (`Cliente` en el código) tiene plan (Base/Premium), zona,
rubro, abono, tono de marca, ventas de producto NFC y un histórico mensual de
métricas. Alrededor de eso: **Links NFC** (con sus **Taps**), **Feedback**
privado, **Reseñas** (CRM), **Audits GEO**, **Checklist SEO** y
**Competidores** — todo con su propia tabla en `db/schema.sql`.

## Integraciones — qué es real hoy y qué falta

| Integración | Estado |
|---|---|
| Postgres / Neon | ✅ hecho, es la base de datos |
| wa.me (WhatsApp) | ✅ hecho, sin API — links directos |
| Respuestas sugeridas | ✅ hecho por plantilla, sin costo |
| Audit GEO | ✅ hecho, manual asistido (vos pegás la pregunta en ChatGPT/Claude/Perplexity/Gemini gratis) |
| Google Places API | ✅ hecho — rating/reseñas de cada cliente se sincronizan solos (cron diario) |
| Google Business Profile (visitas/llamadas) | ✅ hecho, por cliente — cada cliente conecta su propia cuenta desde su portal. Mientras la app de Google no esté verificada, el permiso vence cada 7 días y hay que reconectar (aviso en el portal) |
| Login de equipo con Google + auditoría | ✅ hecho — `/admin/administradores` (allowlist) y `/admin/actividad` (registro de acciones) |
| Resend (email) | ⏳ pendiente — alertas por mail además de WhatsApp |
| API de Anthropic | 🔌 enchufe listo, sin usar — respuestas/audits automáticos cuando decidas pagarla |
| WhatsApp Cloud API | ❌ no planeado — requiere verificación de negocio en Meta, semanas de trámite |

## Pendientes conocidos

- **Rate limiting** en los endpoints públicos de escritura (`/t/[slug]`, envío
  de feedback): hoy no hay límite por IP. Para el volumen de un cartel físico
  no es crítico, pero es lo primero a sumar si el sitio empieza a recibir
  tráfico externo o ataques de spam.
- **Landing pública**: vive aparte, fuera de este repo (`metricsfield.com`).
  Este software es solo el panel — la raíz (`/`) redirige directo a `/admin`.
