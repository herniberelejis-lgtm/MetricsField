# Contexto y progreso — MetricsField (ex Taply)

Este documento es para cualquiera del equipo (Simón, la tercera cuenta, o
quien se sume) que vaya a trabajar en este proyecto usando Claude Code. Reúne
todo lo que hay que saber para arrancar sin tener que releer meses de chat:
qué es MetricsField, cómo está armado el repo, cómo venimos trabajando con Claude, y
qué falta.

Si algo de acá contradice al `README.md` o a los docs de la carpeta de Drive
del equipo, **este es el más actualizado**.

---

## 1 · Qué es MetricsField

MetricsField es una plataforma de gestión de reputación online para comercios locales de
Córdoba, Argentina. Dos partes:

1. **Hardware**: un standee (cartel) con NFC y/o QR — el cliente final apoya
   el celular o escanea, y se abre una pantalla de reseñas de ese comercio
   puntual. Las piezas se generan en lote con código fijo (`/admin/hardware`)
   antes de saber a qué cliente van, y se asignan al vender.
2. **Software**: un panel donde el dueño del comercio ve, todos los días,
   cuánta gente tocó el cartel (por día y por hora), qué reseñas dejó en
   Google, y qué reclamos privados llegaron antes de hacerse públicos. Además
   recibe alertas por email cuando entra una reseña mala o una queja privada,
   y un resumen mensual por email.

### Sin desvío de reseñas (base legal del producto — no tocar sin pensarlo dos veces)
El cartel manda a **todos** los clientes finales, sin importar cómo vayan a
calificar, directo al mismo link público de reseñas de Google — sin pantalla
intermedia. Hasta mediados de 2026 existió un "star-gate" (1-3★ ofrecía
además un formulario de feedback privado antes de la reseña pública); se
**eliminó del producto a pedido del dueño** por rozar el "review gating" que
Google penaliza. Las columnas `usar_filtro` y la tabla `feedback` siguen en
el schema solo como resto histórico — el código ya no las escribe. Si ven
esto descripto como activo en docs viejos o código legacy, está obsoleto:
**no reintroducirlo**.

### Modelo comercial actual
- **1 mes de software gratis** para que el comercio lo pruebe con datos
  reales, sin compromiso previo.
- **Suscripción del panel**: ≈ $35.000/mes (a partir del segundo mes).
- **Standee NFC**: $25.000, pago único — el cartel queda del comercio para
  siempre, no es alquiler.
- **En camino** (todavía no vendidos, están en desarrollo de hardware):
  chip QR+NFC para pegar en las mesas, tarjetas NFC para que los mozos pidan
  la reseña en el momento, y una versión del standee con QR además de NFC.
- **Canal Mercado Libre (autogestión)**: el software ya soporta vender una
  pieza de hardware suelta, sin abono ni panel — el comprador la escanea por
  primera vez, carga su link de reseña de Google y un PIN propio desde
  `/t/<código>`, y la edita después en `/t/<código>/editar`. No crea cliente
  en el CRM. El filtro de estrellas por link también es opcional (checkbox
  "sin filtro"), para clientes de agencia que no quieren el desvío.

---

## 2 · Cómo estamos trabajando con Claude Code

### Ramas y despliegue (recién armado, importante)
- **`main`** = rama de producción. Lo que está ahí es lo que ven los clientes
  reales en `https://app.metricsfield.com` (CNAME propio, ver sección DNS de
  `CLAUDE.md` — el dominio raíz `metricsfield.com` es la landing, repo
  aparte). En Vercel, "Production Branch" tiene que estar apuntando a `main`
  (Settings → Git).
- **Ramas de sesión/feature** (ej. `claude/new-session-xxxx`) = donde Claude
  hace los cambios nuevos. Cada rama que se pushea genera automáticamente una
  **URL de preview propia en Vercel** — se prueba ahí, sin tocar lo que ven
  los clientes.
- Cuando algo probado en preview convence, se fusiona a `main` con un Pull
  Request — recién ahí pasa a producción.
- **Estado al cierre de esta sesión** (julio 2026): todo lo de "Julio 2026"
  (sección 5) está en la rama `claude/new-session-4qxzuz`, PR #40 abierto sin
  mergear todavía. Si arrancás una sesión nueva antes de mergearlo, decile
  que siga en esa rama en vez de crear una nueva.

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
  portal/[codigo]/  → lo que ve cada cliente (solo lectura, aislado; visual
                      propio tipo "vidrio esmerilado", ver sección 5)
  portal/actions.ts → server actions públicas del portal (auth por código,
                      no por sesión de admin)
  t/[slug]/         → la página pública que abre el cartel NFC (va directo
                      al link de reseñas de Google, sin desvío)
  login/            → login del panel (contraseña + Google)
  privacidad/       → política de privacidad, bilingüe ES/EN (requisito de
                      verificación OAuth — ver docs/VERIFICACION-OAUTH-GOOGLE.md)
  terminos/         → términos de servicio, bilingüe ES/EN
lib/
  db.ts             → TODO el acceso a datos (la capa más importante del repo)
  types.ts          → modelo de dominio
  auth.ts           → sesión del admin (contraseña + Google)
  google-oauth.ts   → OAuth genérico (login equipo + conexión GBP cliente)
  gbp.ts, places.ts → clientes de las APIs de Google
  sql.ts            → conexión a Postgres
components/         → UI compartida (Card, Kpi, Sidebar, etc.)
components/portal/  → piezas propias del portal del cliente (no se comparten
                      con /admin a propósito)
components/legal/   → LangSwitch, el toggle ES/EN de /privacidad y /terminos
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
   para que MetricsField lea automáticamente visitas/llamadas de SU ficha. No es
   un login a MetricsField — es un permiso de datos, aparte.

---

## 5 · Estado actual — qué funciona hoy

- Alta/edición/baja de clientes (con confirmación por nombre para borrar).
- Portal del cliente completo: banner de prioridades ("Necesita tu
  atención"), gestión de reseñas (aprobar/editar/regenerar respuestas
  sugeridas, resumen de tendencia y quejas recurrentes), taps en vivo con
  gráfico NFC/QR y drill-down por hora, feedback privado, checklist SEO,
  evolución mensual con drill-down de temas, benchmarking vs competencia con
  comparación de crecimiento automática.
- **Rating y reseñas de Google, automático**: sincroniza solo todos los días
  vía Google Places API (necesita `GOOGLE_PLACES_API_KEY` + Place ID cargado
  por cliente).
- **Alertas por email al dueño** (reseña de ≤3★ o queja privada nueva) y
  **resumen mensual por email** (día 1 de cada mes, desde el cron diario).
  Necesitan `SMTP_*` cargadas en Vercel y `email_notificaciones` cargado por
  cliente — sin eso no mandan nada, sin romper.
- **Inventario de hardware** (`/admin/hardware`): generar piezas QR/NFC en
  lote con código fijo, descargar los QR en .zip para el proveedor, asignar
  al vender. Al borrar un cliente las piezas vuelven al pool.
- **Autogestión (canal Mercado Libre)**: pieza libre que el comprador activa
  solo desde `/t/<código>` con su link de Google + PIN (ver sección 1).
- **Login del equipo con Google + auditoría**: funcionando (allowlist en
  `/admin/administradores`, registro en `/admin/actividad`).
- **Conexión de Business Profile por cliente**: el código y el flujo están
  listos, pero todavía no trae datos reales (ver sección 6 — falta la
  aprobación de Google y, para sacarla del modo Prueba, un dominio propio).
- **Respuesta automática a reseñas positivas**: construida de punta a punta
  (`lib/google-reviews.ts`) pero gateada por `GOOGLE_REVIEWS_API_ENABLED`
  (apagada) hasta que Google apruebe el acceso a su Reviews API.
- CRM de reseñas (con hora exacta opcional), checklist SEO, Audit GEO manual,
  monitoreo de competencia manual, cron diario, alertas por wa.me, reportes
  mensuales imprimibles, módulo de Finanzas (cobros), sección Tutoriales.
- Seguridad: auditoría zero-trust aplicada (sesiones con vencimiento firmado,
  rate limits en login/portal/taps/feedback, headers de seguridad, magic
  bytes en uploads). Ver `docs/AUDITORIA-ZERO-TRUST-2026-07.md`.
- **Ya NO existe** "Posición en Maps" como feature — se sacó del producto
  entero porque no se puede automatizar ni entregar de forma honesta al
  cliente. Si ven referencias a esto en documentos viejos, están obsoletas.

### Julio 2026 — portal visual + preparación de verificación OAuth
- **Portal del cliente, look "vidrio esmerilado"**: fondo con degradé pastel
  y tarjetas glassmorphism, a pedido de referencia visual del dueño. Se
  aplicó vía un `variant="glass"` opcional en `Card`/`Kpi`/`ChartCard`/
  `ResumenResenas` (`components/ui.tsx` y afines) — `/admin` no cambió, sigue
  con el look de siempre por default. Vive solo en `PortalShell.tsx` y los
  componentes de `components/portal/`.
- **`/terminos` y `/privacidad` bilingües** (toggle ES/EN vía
  `components/legal/LangSwitch.tsx`, español por default) — la misma URL
  pública declarada en Google Cloud Console ahora puede mostrarse en inglés
  para el video de verificación, sin duplicar la política. Antes tampoco
  estaban enlazadas desde ningún lado de la app — ahora hay link desde el
  pie del portal y desde `/login`.
- **Botón real de "Desconectar" Google en el portal** (antes solo existía en
  `/admin`, operado por el equipo) — hace cierta la promesa de
  `/privacidad` de que el comercio puede revocar el acceso él mismo.
- **Eliminar cliente**: la lógica ya existía (`accionEliminarCliente` +
  `db.eliminarCliente`, DELETE con cascada por `db/schema.sql`) pero no
  estaba conectada a ningún botón en la ficha — solo en el menú del
  listado. Se agregó también al menú "Más acciones" de la ficha, con
  confirmación por nombre exacto.
- **Rubro y Zona** en alta/edición de cliente y sucursal pasaron de `<select>`
  cerrado a texto libre con `<datalist>` de sugerencias.
- **Preparación completa de la verificación OAuth de Google**: descripciones
  de la app, justificación de cada scope, y guion del video de demo —
  todo consolidado en `docs/VERIFICACION-OAUTH-GOOGLE.md`. Falta grabar el
  video y enviar el trámite (ver sección 6).

---

## 6 · Lo que falta / en construcción

En orden de lo más cerca a lo más lejos:

1. **Nombre definitivo + dominio + Google Workspace** (en curso, trabado en
   la elección del nombre): de esto cuelga todo lo de Google — la guía paso a
   paso completa quedó como checklist interactiva (pedírsela a Hernán).
2. **Verificación de la app OAuth + acceso a las Business Profile APIs**:
   dos trámites separados con Google. Mientras tanto el sistema queda en modo
   Prueba (máx 100 usuarios, reautorizar cada ~7 días). El código de reseñas
   automáticas ya está listo — el día de la aprobación solo hay que poner
   `GOOGLE_REVIEWS_API_ENABLED=true` en Vercel. **Todos los textos y el guion
   del video ya están listos** en `docs/VERIFICACION-OAUTH-GOOGLE.md` — solo
   falta grabar el video con un cliente demo y enviar el formulario.
3. **Cargar `SMTP_*` en Vercel** para que las alertas por email y el resumen
   mensual salgan de verdad (funcionan con cualquier casilla, no hace falta
   esperar el dominio propio).
4. **Hardware nuevo**: chip QR+NFC para mesas, tarjetas NFC para mozos,
   standee con QR+NFC — el software ya los soporta (tipo nfc/qr/ambos por
   pieza), falta la fabricación.
5. **Canal Mercado Libre**: el flujo de autogestión ya está hecho; falta
   decidir el modelo de cobro para ofrecer también el software a esos
   compradores (cobro manual por WhatsApp vs integrar Mercado Pago).
6. **Automatizar lo que hoy es manual**: Audit GEO (citas en IA) y monitoreo
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
| Textos, guion de video y checklist de la verificación OAuth de Google | `docs/VERIFICACION-OAUTH-GOOGLE.md` |
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
