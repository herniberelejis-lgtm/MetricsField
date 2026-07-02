# PROMPT PARA SONNET — Construir Táptico: producto terminado y deployado

> Copiá TODO este documento y dáselo a Claude Sonnet en una sesión de Claude Code
> conectada al repo `herniberelejis-lgtm/GEO-SEO-ANALYTICS`.

---

## Tu rol y tu misión

Sos el ingeniero principal de **Táptico**, una startup de Córdoba, Argentina.
Tu misión es transformar el repo actual en el **producto completo, deployado y
vendible**: un sistema de gestión de reputación para comercios locales, con
captación de reseñas por NFC, CRM de reseñas, SEO local + GEO, y portal de
clientes. Al terminar, el fundador tiene que poder salir a la calle a vender
con esto funcionando en una URL pública.

Trabajás en loop: construís → testeás end-to-end con Playwright → corregís →
commiteás → pusheás (el push a la rama deploya solo en Vercel) → verificás la
URL de producción. No parás por un error: lo diagnosticás y seguís. No
preguntás permiso para pasos reversibles.

**Idioma de toda la UI: español argentino (es-AR).** Moneda: ARS con formato
`$ 1.234.567`, y precios de planes en USD donde corresponda.

---

## Contexto de negocio (leelo dos veces)

### Qué es Táptico

Un comercio local (café, barbería, clínica, taller) recibe un **cartel NFC**.
El cliente final acerca el teléfono → se abre una página con la marca del
comercio → deja su reseña en Google en 10 segundos. Detrás de ese tap hay una
plataforma que:

1. **Capta la reseña** con "star-gate" legal: si el cliente marca 4–5
   estrellas va directo a Google; si marca 1–3 se le OFRECE (nunca se le
   bloquea — bloquear viola las políticas de Google) un formulario de feedback
   privado que llega al dueño al instante.
2. **Gestiona la reputación como un CRM**: cada reseña/feedback es una tarjeta
   con estado (Nueva → Respondida → Escalada → Resuelta), responsable y notas.
3. **Sugiere respuestas con IA** en el tono del negocio, para que el dueño las
   publique con copy-paste (hasta tener acceso a la API oficial de Google).
4. **Hace SEO local + GEO**: checklist de optimización de la ficha de Google,
   seguimiento de posición en Maps, y el "Audit GEO": consultarle a los LLMs
   las preguntas reales del rubro ("¿mejor café en Nueva Córdoba?") y registrar
   si el negocio aparece o no — el antes/después es la mejor demo de venta.
5. **Monitorea la competencia**: 3–5 competidores elegidos, comparación
   semanal de rating y reseñas nuevas.
6. **Reportes mensuales** de 1–2 páginas con 3 métricas clave y UNA
   recomendación accionable — es el motor de retención.

### El modelo comercial

- Gancho físico (cartel NFC casi regalado) → servicio mensual recurrente.
- Planes (configurables desde el admin, valores iniciales):
  - **Start** US$15/mes: captación NFC + CRM + feedback privado + alertas + redirección inteligente.
  - **Pro** US$39/mes (el destacado): + respuestas IA + SEO local + GEO + competencia + reseñas→contenido.
  - **Full** US$89/mes: + asistente WhatsApp + encuestas + recuperación + multiplataforma (los módulos de esta capa pueden mostrarse como "próximamente" si no llegan al MVP).
- Garantía: "más reseñas en 90 días o seguís sin pagar hasta lograrlo".
- Cliente objetivo: pymes de Güemes, Nueva Córdoba, Alberdi y General Paz
  (gastronomía, estética, salud, talleres, gimnasios).
- El fundador es economista, vende cara a cara, y necesita poder EXPLICAR cada
  módulo a un comerciante no técnico. Todo lo que construyas tiene que ser
  explicable en una frase.

### El foso competitivo

El chip NFC es intercambiable; el valor está en la plataforma: la URL corta
propia (`/t/<slug>`) que el comercio nunca cambia pero cuyo destino se
administra desde el panel, con analítica de taps. Ese gestor de links es
prioridad máxima.

---

## Qué existe ya en el repo (NO lo tires — evolucionalo)

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3**, deployado
  en Vercel (proyecto conectado al repo: cada push a la rama deploya solo).
- Panel admin protegido por `ADMIN_PASSWORD` (middleware + cookie SHA-256):
  panel general con KPIs, lista/alta/edición de clientes, carga mensual de
  métricas, ventas NFC, analytics con 5 gráficos SVG propios (sin librerías),
  reportes mensuales imprimibles con recomendación autogenerada
  (`lib/recomendacion.ts`).
- **Portal de clientes** por código de acceso privado (`/portal/<codigo>`),
  público, read-only, con KPIs, evolución, citaciones IA y recomendación.
- Base de datos actual: `data/db.json` versionado en git con capa de acceso en
  `lib/db.ts` (CRUD atómico). **Esta capa está aislada a propósito para que la
  migres** (ver Fase 0).
- E2E con Playwright ya escritos como referencia del estilo de testing
  (flujo completo de alta → métricas → venta NFC → portal → analytics).
- Paleta de visualización validada para daltonismo en `lib/palette.ts`.
- Marca en el mockup de presentación: **Táptico**, logo multicolor tipo Google
  (azul #4285F4, rojo #EA4335, amarillo #FBBC05, verde #34A853), tipografías
  Poppins (display) + Roboto (cuerpo). Adoptá esta identidad en todo el
  producto (hoy el panel dice "GEO · SEO Analytics" — renombralo a Táptico).

---

## FASE 0 — Migración de base de datos (bloqueante, hacelo primero)

El JSON en git no sirve más: las páginas de tap reciben ESCRITURAS públicas
(cada tap se registra, cada feedback se guarda) y el filesystem de Vercel es
read-only. Migrá a **Postgres serverless (Neon) con Prisma**:

1. Modelo de datos (evolución del actual `lib/types.ts`):
   - `Comercio` (hoy "Cliente"): id, slug, codigoAcceso, nombre, rubro, zona,
     plan (start/pro/full), estado, contacto, googleReviewUrl, busquedaClave,
     fee, tonoDeMarca (texto libre: "cercano", "formal"...), fechaAlta.
   - `MetricaMensual`: como hoy (mes, reseñas nuevas/total, rating, posición
     Maps, visitas, llamadas, clics, citas ChatGPT/Copilot/Perplexity).
   - `VentaNFC`: como hoy + campo `urlCorta` opcional.
   - `LinkNFC`: id, comercioId, etiqueta ("mostrador", "mesa 4"), slug único,
     destino (enum: resena | menu | instagram | promo | url_custom),
     urlDestino, activo.
   - `Tap`: linkId, timestamp, userAgent (para contar únicos aprox.). Solo
     inserción, nunca se edita.
   - `Feedback`: comercioId, estrellas (1–3), texto, contacto opcional,
     estado (nuevo | en_proceso | resuelto), notas internas, timestamps.
   - `Resena` (CRM): comercioId, autor, estrellas, texto, plataforma (google |
     otra), estado (nueva | respondida | escalada | resuelta), respuestaSugerida,
     respuestaPublicada (bool), responsable, notas, fecha.
   - `AuditGEO`: comercioId, fecha, pregunta, plataforma (chatgpt | claude |
     perplexity), aparece (bool), extracto de la respuesta, competidoresMencionados.
2. `npx prisma migrate` + seed con los datos actuales de `data/db.json`
   (script de migración una sola vez).
3. Reemplazá `lib/db.ts` por consultas Prisma manteniendo las mismas firmas
   donde sea posible, así el resto del código casi no cambia.
4. Variables de entorno: `DATABASE_URL` (Neon). Si el fundador todavía no creó
   la cuenta de Neon, deja TODO listo (schema, cliente, seed) y usá SQLite
   local (`file:./dev.db`) como fallback de desarrollo — Prisma permite
   cambiar de provider con la env var. Documentá en el README los 4 pasos
   exactos para crear la DB gratis en neon.tech y pegar la URL en Vercel.

---

## FASE 1 — El producto de captación (el corazón, prioridad máxima)

### 1a. Página de tap pública `/t/<slug>` (mobile-first, carga < 1 segundo)

- Header con el nombre del comercio y su rubro. Pie: "Impulsado por Táptico".
- Pregunta: "¿Cómo estuvo tu experiencia?" con 5 estrellas grandes tocables.
- 4–5 estrellas → botón "Publicar en Google" que abre `googleReviewUrl`.
- 1–3 estrellas → formulario privado: "Lamentamos que no fue perfecto.
  Contanos qué pasó y lo resolvemos hoy mismo" (texto + contacto opcional) →
  se guarda como `Feedback` → pantalla de gracias.
  **IMPORTANTE (legal)**: debajo del formulario SIEMPRE un link visible
  "También podés dejar tu reseña pública en Google" — jamás se bloquea el
  camino público. Esto cumple las políticas de Google.
- Cada carga de `/t/<slug>` registra un `Tap` (route handler, sin bloquear el
  render).

### 1b. Gestor de links NFC (admin)

- CRUD de `LinkNFC` por comercio: crear link con etiqueta, elegir destino
  (Reseña Google / Menú / Instagram / Promo / URL custom), activar/desactivar.
- `/t/<slug>` respeta el destino configurado: si es "resena" muestra el
  star-gate; si es otro destino, redirige 302 y registra el tap igual.
- Analítica: taps por link, por día (gráfico de columnas con las primitivas
  SVG existentes), total por comercio. Es EL argumento de venta del panel.

### 1c. CRM de reseñas y feedback (admin)

- Bandeja unificada: tarjetas de `Resena` + `Feedback` con estados, filtros
  por comercio/estrellas/estado, vista lista (la Kanban es opcional).
- Carga manual de reseñas (mientras no haya API de Google): formulario rápido
  "pegar reseña" con autor, estrellas, texto. El objetivo es que el fundador
  cargue las reseñas importantes en 20 segundos.
- Botón **"Sugerir respuesta"** — MODO GRATIS (el default): un generador de
  plantillas propio, sin ninguna API paga. Combina (sentimiento × tema ×
  tono de marca del comercio) con variantes para no repetir: agradecimiento
  para 4–5★, disculpa + acción concreta + invitación a volver para 1–3★,
  siempre nombrando al autor. Guarda la sugerencia y botón "copiar" para
  pegarla en Google. Diseñá las plantillas con cuidado: tienen que sonar
  humanas y argentinas, no robóticas.
- El mismo botón tiene un upgrade opcional a IA real (`ANTHROPIC_API_KEY`,
  modelo `claude-sonnet-5`) — SOLO si la env var existe. El fundador decidió
  no gastar en APIs todavía: el modo gratis es el producto, el modo IA es un
  plus futuro. Nunca rompas ni degrades la página por falta de key.
- El `Feedback` nuevo dispara notificación (ver 1d) y aparece con badge de
  urgencia.

### 1d. Alertas

- Sin depender de la API de WhatsApp (que requiere verificación de Meta):
  generá **links `wa.me` prearmados** — al entrar un feedback negativo, el
  admin ve botón "Avisar al dueño por WhatsApp" que abre wa.me con el mensaje
  redactado. Además, email opcional vía **Resend** (env var `RESEND_API_KEY`,
  gratis hasta 3.000/mes) al dueño del comercio.

---

## FASE 2 — SEO local + GEO (el diferencial)

### 2a. Checklist SEO por comercio

- Lista de tareas estandarizada (categoría principal, fotos, atributos,
  descripción con keywords, horarios, Q&A) con check manual + % de progreso +
  gráfico de salud de la ficha. Plantilla por rubro (gastronomía, estética,
  salud, taller, gimnasio, otro).

### 2b. Audit GEO (la demo de venta)

- Pantalla admin "Nuevo audit" — MODO GRATIS (el default, sin APIs pagas):
  1. Elegís comercio → el sistema genera las preguntas del rubro/zona
     ("mejor {rubro} en {zona}", "dónde {acción} en {zona} Córdoba"...) con
     botón "copiar" por pregunta.
  2. El fundador las pega en los chats gratuitos (ChatGPT, Claude.ai,
     Perplexity, Gemini) desde su navegador — links directos a cada uno.
  3. Vuelve y registra el resultado en 2 clics por pregunta: ¿apareció el
     comercio? (sí/no) + qué competidores mencionó la IA (texto corto) →
     se guarda como `AuditGEO`.
  El flujo entero tiene que tomar menos de 5 minutos por comercio. Es
  trabajo manual asistido, y está bien: el valor está en el registro
  histórico y el antes/después, no en la automatización.
- Upgrade opcional a automático vía `ANTHROPIC_API_KEY` (u otras) SOLO si la
  env var existe — misma regla que las respuestas: gratis es el producto.
- Vista de resultados estilo "antes/después" (como el mockup: ❌ "la IA no te
  menciona, nombra a 3 competidores" → ✅ "apareciste"). Historial por mes
  para mostrar la evolución. Esta pantalla también se muestra (read-only) en
  el portal del cliente Pro/Full.
- Sé honesto en la UI: es una medición muestral ("qué respondió la IA hoy a
  estas preguntas"), no una garantía.

### 2c. Competencia (manual-primero)

- Por comercio: cargar 3–5 competidores (nombre + rating + total de reseñas,
  actualizables a mano cada semana en 1 minuto). Tabla comparativa con deltas
  y el ranking de la zona (como el mockup "Bar Central te pasó por 6
  reseñas"). Si hay `GOOGLE_PLACES_API_KEY`, botón "actualizar automático"
  que trae rating y total de reseñas por Place ID (la API de Places lo da sin
  OAuth del dueño). La integración es un plus, no un requisito.

---

## FASE 3 — Portal del cliente ampliado + presentación

### 3a. Portal `/portal/<codigo>` (evolución del actual)

Agregale al portal existente: taps del mes por link, feedback privados
recibidos y su estado ("2 quejas resueltas antes de llegar a Google" es ORO
para retención), checklist SEO con progreso, resultados del último Audit GEO
(si su plan lo incluye), y el reporte mensual. Mantené: código privado,
read-only, sin nada del admin, footer "no compartas este link".

### 3b. Página pública de presentación `/`

La raíz del dominio hoy redirige al login del admin. Cambialo: `/` pasa a ser
la landing de Táptico basada en el mockup HTML del fundador (mismo contenido y
estética: hero "Mirá cómo funciona cada pieza de Táptico por dentro", los 3
pasos, los servicios en 3 capas con acordeones, la oferta con toggle Versión
A/B, garantía, CTA a WhatsApp del fundador `wa.me/<env NEXT_PUBLIC_WHATSAPP>`).
Reconstruila como componentes React (no un iframe del HTML). El admin pasa a
vivir en `/admin` (mové el route group y actualizá el middleware).

---

## Integraciones — la verdad de lo que se puede hoy

**Regla del fundador: TODO el producto tiene que quedar 100% terminado y
usable con costo cero.** Nada de lo esencial puede depender de una API paga.
Las APIs pagas (Anthropic, etc.) son enchufes opcionales para más adelante:
dejá la interfaz lista pero el producto completo funciona sin ellas.

Construí SOLO integraciones reales. Cada una detrás de una env var, opcional,
con pantalla de "cómo conseguir esta key" para que el fundador aprenda:

| Integración | Para qué | Cómo | Estado |
|---|---|---|---|
| Plantillas de respuesta propias | Respuestas sugeridas sin costo | Código propio, cero APIs | HACER (es el default) |
| Audit GEO manual asistido | Medir presencia en IA sin costo | Genera preguntas + registro en 2 clics | HACER (es el default) |
| Resend | Email de alertas y reportes | `RESEND_API_KEY` (tier gratis 3.000/mes) | HACER |
| Google Places API | Rating/total de reseñas propios y de competidores | `GOOGLE_PLACES_API_KEY` (tiene tier gratis mensual) | HACER (opcional) |
| Anthropic API | Upgrade de respuestas + audit automático | `ANTHROPIC_API_KEY` — EL FUNDADOR NO LA VA A CARGAR TODAVÍA | Dejar el enchufe listo, no depender de ella |
| Mercado Pago | Cobro de suscripciones | Fase posterior: por ahora, campo "link de pago" por comercio donde el fundador pega su link de suscripción de MP creado en la web de MP | SIMPLE AHORA |
| wa.me links | Avisos y venta | Sin API, gratis, siempre funciona | HACER |
| WhatsApp Cloud API | Asistente del dueño (Capa 3) | Requiere verificación de negocio en Meta | NO PROMETER — dejá el módulo como "próximamente" |
| Google Business Profile API | Auto-publicar respuestas y posts | Requiere aprobación de Google (semanas) | NO PROMETER — el flujo copy-paste la reemplaza |

Nunca simules una integración que no existe. Si falta la key, la función se
muestra deshabilitada con instrucciones — no con datos falsos.

---

## Calidad, seguridad y método de trabajo

1. **E2E con Playwright en cada fase** (Chromium en `/opt/pw-browsers/chromium`
   si corrés en Claude Code web): flujo de tap completo (5★ → Google, 2★ →
   feedback → aparece en CRM → cambia de estado), gestor de links (crear →
   tap → redirect → contador), audit GEO con mock si no hay key, portal, login.
   Corré también los E2E existentes tras la migración de DB.
2. **Seguridad**: el admin queda tras `ADMIN_PASSWORD` (ya existe). Las rutas
   públicas son SOLO `/`, `/t/*`, `/portal/*`, `/login`. Sanitizá todo input
   público (feedback es texto de terceros: render con textContent, nunca HTML).
   Rate-limit básico en los endpoints públicos de escritura (por IP, en
   memoria o con la DB).
3. **Mobile-first en `/t/*`**: es la página que ven los clientes finales en su
   teléfono. Testeá con viewport 390×844.
4. **Commits**: pequeños, descriptivos, push a la rama del repo (auto-deploy).
   Al final de cada fase verificá la URL de producción de Vercel.
5. **README**: actualizalo con el runbook del fundador: cómo dar de alta un
   comercio, programar el chip (app NFC Tools → URL `/t/<slug>`), cargar
   reseñas, correr un audit, mandar el portal al cliente, y la lista completa
   de env vars con dónde conseguir cada una.
6. Si algo del plan resulta imposible en el entorno (falta de permisos, API
   caída), no lo tapes: dejalo documentado en el README bajo "Pendientes" con
   el porqué y el siguiente paso concreto.

## Orden de ejecución y criterio de "terminado"

Fase 0 → 1a → 1b → 1c → 1d → 3b → 2a → 2b → 2c → 3a. (La landing 3b va
temprano porque el fundador la necesita para vender YA.)

Terminado = todas las fases deployadas en Vercel y en verde:

- [ ] Un tap en `/t/<slug>` desde un teléfono real termina en la página de
      reseñas de Google del comercio y queda contado en el panel.
- [ ] Un feedback de 2★ llega al CRM, se puede gestionar por estados y generar
      aviso wa.me.
- [ ] "Sugerir respuesta con IA" produce una respuesta en el tono del comercio.
- [ ] Un Audit GEO corre y guarda resultados visibles en admin y portal.
- [ ] La landing pública vende sola (oferta, garantía, CTA a WhatsApp).
- [ ] El portal del cliente muestra taps, feedback, SEO, GEO y reporte.
- [ ] `npm run build` limpio, E2E todos en verde, `npm audit` sin críticas.
- [ ] README con el runbook completo del fundador.
