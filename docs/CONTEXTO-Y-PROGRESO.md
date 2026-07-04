# Contexto y progreso — Taply

Este documento es para cualquiera del equipo (Simón, la tercera cuenta, o
quien se sume) que vaya a trabajar en este proyecto usando Claude Code. Reúne
todo lo que hay que saber para arrancar sin tener que releer meses de chat:
qué es Taply, cómo está armado el repo, cómo venimos trabajando con Claude, y
qué falta.

Si algo de acá contradice al `README.md` o a los docs de la carpeta de Drive
del equipo, **este es el más actualizado**.

---

## 1 · Qué es Taply

Taply es un sistema de gestión de reputación online para comercios locales de
Córdoba, Argentina. Dos partes:

1. **Hardware**: un standee (cartel) con NFC — el cliente final apoya el
   celular (o escanea, próximamente también con QR) y se abre una pantalla de
   reseñas de ese comercio puntual.
2. **Software**: un panel donde el dueño del comercio ve, todos los días,
   cuánta gente tocó el cartel, qué reseñas dejó en Google, y qué reclamos
   privados llegaron antes de hacerse públicos.

### El "star-gate" (base legal del producto — no tocar sin pensarlo dos veces)
El cliente final elige de 1 a 5 estrellas:
- **4-5 estrellas** → va directo a dejar la reseña pública en Google.
- **1-3 estrellas** → además se le OFRECE un formulario de feedback privado.
  El link público a Google **sigue siempre visible**, para todos, incluso a
  quien puntúa mal. Esconderlo ("review gating") viola las políticas de
  Google y puede terminar en que le bajen o penalicen la ficha al comercio.

### Modelo comercial actual
- **1 mes de software gratis** para que el comercio lo pruebe con datos
  reales, sin compromiso previo.
- **Suscripción del panel**: ≈ $35.000/mes (a partir del segundo mes).
- **Standee NFC**: $25.000, pago único — el cartel queda del comercio para
  siempre, no es alquiler.
- **En camino** (todavía no vendidos, están en desarrollo de hardware):
  chip QR+NFC para pegar en las mesas, tarjetas NFC para que los mozos pidan
  la reseña en el momento, y una versión del standee con QR además de NFC.

---

## 2 · Cómo estamos trabajando con Claude Code

### Ramas y despliegue (recién armado, importante)
- **`main`** = rama de producción. Lo que está ahí es lo que ven los clientes
  reales en `https://geo-seo-analytics.vercel.app`. En Vercel, "Production
  Branch" tiene que estar apuntando a `main` (Settings → Git).
- **Ramas de sesión/feature** (ej. `claude/new-session-xxxx`) = donde Claude
  hace los cambios nuevos. Cada rama que se pushea genera automáticamente una
  **URL de preview propia en Vercel** — se prueba ahí, sin tocar lo que ven
  los clientes.
- Cuando algo probado en preview convence, se fusiona a `main` con un Pull
  Request — recién ahí pasa a producción.

### Cómo darle tareas a Claude
- Claude Code corre en un entorno en la nube, aislado, **sin acceso directo**
  a la base de datos de Neon ni a la cuenta real de Vercel. Por eso:
  - Cualquier cambio de esquema (`ALTER TABLE`, tablas nuevas) llega como un
    **archivo `.sql` numerado** para correr manualmente en el SQL Editor de
    Neon — nunca se aplica solo.
  - Para confirmar que algo "anda" en producción hay que probarlo ustedes
    mismos (Claude no puede abrir la URL real ni ver logs de Vercel salvo que
    le paguen el texto/captura).
- Regla de oro pedida por Hernán y que hay que seguir sosteniendo: **ningún
  `DROP`/`DELETE` masivo se corre sin avisar explícitamente antes** — ya hubo
  una pérdida de datos real por esto una vez.
- Ciclo normal de trabajo por tarea: Claude construye → corre `tsc --noEmit` +
  `next build` → si compila, commitea con mensaje descriptivo en español →
  pushea a la rama de sesión → si tocó el esquema, entrega el `.sql` aparte.

### Buenas prácticas al pedir cosas
- Sé específico con el objetivo de negocio, no solo con la pantalla ("quiero
  saber quién borró un cliente" en vez de "agregame una tabla de logs").
- Si el cambio es grande (nueva forma de login, cambio de modelo de datos),
  esperá que Claude te haga 1-2 preguntas de alcance antes de construir —  es
  a propósito, evita rehacer trabajo.
- Para features nuevas: pedilas en una rama, probá el preview, recién después
  fusionar a `main`.

---

## 3 · Stack técnico

- **Next.js 15 (App Router)** + **React 19** + **TypeScript** + **Tailwind**.
- **Sin ORM**: SQL directo con el driver `postgres` (`lib/sql.ts`). Cada
  función de acceso a datos vive en `lib/db.ts` y mapea filas `snake_case` →
  objetos `camelCase` de `lib/types.ts`.
- **Postgres en Neon** (plan gratis), conexión pooled (PgBouncer) — por eso
  `lib/sql.ts` tiene `prepare: false` (si no, error random `cached plan must
  not change result type`; no lo saques).
- **Vercel** para hosting + Cron Jobs (`vercel.json`) + variables de entorno.
- **Server Actions** (`"use server"`) para todas las mutaciones — no hay una
  API REST separada, los formularios llaman funciones directamente
  (`app/actions.ts`, `app/login/actions.ts`).
- Sin librería de componentes externa: todo UI propio en `components/ui.tsx`
  + Tailwind, con tokens de marca en `tailwind.config.ts` (`brand`, azul).

### Estructura de carpetas
```
app/
  admin/            → panel interno (protegido)
    clientes/[id]/  → ficha de cada comercio + submódulos (crm, links, metricas, editar, auditoria)
    administradores/→ allowlist de logins con Google del equipo
    actividad/      → registro de auditoría de acciones del panel
    prospectos/     → CRM de prospección (todavía no son clientes)
    analytics/      → vista agregada de toda la cartera
    reportes/[id]/  → reporte mensual imprimible por cliente
  api/
    admin/oauth/    → login del equipo con Google (allowlist)
    portal/google/oauth/ → conexión de Business Profile POR CLIENTE
    cron/           → sincronización diaria (Places + Business Profile)
    logout, places-search
  portal/[codigo]/  → lo que ve cada cliente (solo lectura, aislado)
  t/[slug]/         → la página pública que abre el cartel NFC (star-gate)
  login/            → login del panel (contraseña + Google)
  privacidad/       → política de privacidad (requisito de verificación OAuth)
lib/
  db.ts             → TODO el acceso a datos (la capa más importante del repo)
  types.ts          → modelo de dominio
  auth.ts           → sesión del admin (contraseña + Google)
  google-oauth.ts   → OAuth genérico (login equipo + conexión GBP cliente)
  gbp.ts, places.ts → clientes de las APIs de Google
  sql.ts            → conexión a Postgres
components/         → UI compartida (Card, Kpi, Sidebar, etc.)
db/schema.sql       → esquema canónico DE REFERENCIA (no se auto-aplica —
                      cada cambio necesita su .sql aparte para correr en Neon)
docs/               → este archivo (el manual operativo y los prompts
                      históricos se mudaron a Drive)
```

---

## 4 · Los 3 sistemas de acceso (no se pisan entre sí)

1. **Cliente → su portal** (`/portal/<código>`): entra con un link privado
   por WhatsApp, sin usuario/contraseña — el código es la credencial. Ve solo
   sus propios datos, todo de solo lectura.
2. **Equipo → panel interno** (`/admin`): dos formas en paralelo —
   contraseña compartida (`ADMIN_PASSWORD`, la de siempre) o **login con
   Google restringido a una allowlist** (tabla `admins`, administrable en
   `/admin/administradores`). Cada acción con cualquiera de las dos formas
   queda anotada en `/admin/actividad` (con contraseña compartida queda como
   "equipo (sin identificar)"; con Google, con el email de quién fue).
3. **Cliente → conexión de Google Business Profile**: desde su propio
   portal, el cliente autoriza con SU cuenta de Google (no con la del equipo)
   para que Taply lea automáticamente visitas/llamadas de SU ficha. No es un
   login a Taply — es un permiso de datos, aparte.

---

## 5 · Estado actual — qué funciona hoy

- Alta/edición/baja de clientes (con confirmación por nombre para borrar).
- Portal del cliente completo: taps en vivo, feedback privado, reseñas y
  rating (automático), checklist SEO, evolución mensual, reportes.
- **Rating y reseñas de Google, automático**: sincroniza solo todos los días
  vía Google Places API (necesita `GOOGLE_PLACES_API_KEY` + Place ID cargado
  por cliente).
- **Login del equipo con Google + auditoría**: recién construido, en proceso
  de configuración final del lado de Google Cloud (ver sección 6).
- **Conexión de Business Profile por cliente**: el código y el flujo están
  listos, pero todavía no trae datos reales (ver sección 6 — falta la
  aprobación de Google y, para sacarla del modo Prueba, un dominio propio).
- CRM de reseñas, checklist SEO, Audit GEO manual (se releva a mano en
  ChatGPT/Claude/Perplexity), monitoreo de competencia manual, cron diario,
  alertas por wa.me, reportes mensuales imprimibles.
- **Ya NO existe** "Posición en Maps" como feature — se sacó del producto
  entero porque no se puede automatizar ni entregar de forma honesta al
  cliente. Si ven referencias a esto en documentos viejos, están obsoletas.

---

## 6 · Lo que falta / en construcción

En orden de lo más cerca a lo más lejos:

1. **Terminar la configuración de Google Cloud** (en curso): proyecto `Taply`
   creado, consent screen en modo Prueba, scopes agregados, usuarios de
   prueba cargados (el equipo + clientes que vayan probando). Falta terminar
   de crear las credenciales OAuth y cargarlas en Vercel.
2. **Pedir acceso a las 3 APIs de Business Profile** (formulario de Google:
   https://developers.google.com/my-business/content/prereqs) — sin esto,
   el cliente puede conectar su cuenta pero no llega ningún dato de
   visitas/llamadas todavía. Es aprobación de Google, no depende de nosotros.
3. **Dominio propio + verificación de la app OAuth**: mientras no haya un
   dominio propio verificado (Search Console) y Google verifique la app, el
   sistema queda en modo Prueba: máximo 100 usuarios de prueba y cada cliente
   conectado tiene que reautorizar cada ~7 días (por eso el aviso en su
   portal). El plan es comprar un `.com.ar` (nic.ar, gratis para residentes
   argentinos) + Zoho Mail para el email con dominio propio.
4. **Hardware nuevo**: chip QR+NFC para mesas, tarjetas NFC para mozos,
   standee con QR+NFC — todavía en diseño/fabricación, no vendidos.
5. **Automatizar lo que hoy es manual**: Audit GEO (citas en IA) y monitoreo
   de competencia se relevan a mano — automatizarlos depende de tener
   presupuesto para una API de LLM (el enchufe para Anthropic ya existe en el
   código, sin usar).

---

## 7 · Dónde mirar cada cosa

| Necesito... | Dónde está |
|---|---|
| Instrucciones de instalación desde cero, manual operativo del panel día a día | Carpeta de Drive del equipo (ya no viven en el repo) |
| Qué integraciones están hechas vs. pendientes | `README.md`, sección "Integraciones" |
| Variables de entorno necesarias y para qué sirve cada una | `.env.example` |
| El esquema completo de la base de datos | `db/schema.sql` |
| Este resumen de contexto y progreso | `docs/CONTEXTO-Y-PROGRESO.md` (este archivo) |

---

## 8 · Reglas de oro

- Nunca correr un `DROP`/`DELETE` masivo sin avisar antes explícitamente y
  confirmar que no hay datos reales de por medio.
- Nunca pushear directo a `main` — todo pasa por una rama + preview primero.
- Nunca sacar `prepare: false` de `lib/sql.ts` (rompe la conexión pooled de
  Neon).
- Nunca esconder el link público de reseñas de Google a nadie, ni a quien
  puntúa mal (ver sección 1, star-gate).
- Cualquier cambio de esquema va acompañado de un `.sql` aparte para correr
  a mano en Neon — nunca asumir que "ya se aplicó".
