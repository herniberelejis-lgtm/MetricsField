# Manual de MetricsField — todo lo que hay que saber

> **Para quién es esto:** Simón, Luis y cualquiera del equipo que tenga que
> seguir con la empresa sin depender de que Hernán (o Claude) esté disponible.
> Junta en un solo lugar la empresa, los productos, el hardware, las ventas,
> los clientes, el marketing, la marca, el software por dentro y cómo se
> trabaja. Si algo de acá contradice a un documento más viejo, **vale este**,
> salvo `docs/CONTEXTO-Y-PROGRESO.md`, que se actualiza con cada cambio del
> producto: si difieren, mirá la fecha del último commit de cada uno.
>
> Fecha de esta versión: **29/10/2026**. Producción en el commit `939a0b4`.

---

## Índice

1. [La empresa en 1 minuto](#1-la-empresa-en-1-minuto)
2. [Equipo, cuentas y accesos](#2-equipo-cuentas-y-accesos)
3. [Productos y verticales](#3-productos-y-verticales)
4. [El hardware: standee, tarjeta, sticker](#4-el-hardware-standee-tarjeta-sticker)
5. [Precios](#5-precios)
6. [Ventas: pitch, demo, objeciones, alta de cliente](#6-ventas-pitch-demo-objeciones-alta-de-cliente)
7. [Clientes y casos](#7-clientes-y-casos)
8. [Canal Mercado Libre y piezas autogestionadas](#8-canal-mercado-libre-y-piezas-autogestionadas)
9. [Cómo funciona el software (visión de usuario)](#9-cómo-funciona-el-software-visión-de-usuario)
10. [Integraciones con Google](#10-integraciones-con-google)
11. [Automatismos: crons, mails, respuestas](#11-automatismos-crons-mails-respuestas)
12. [Marketing: landing, guías, SEO](#12-marketing-landing-guías-seo)
13. [Manual de marca](#13-manual-de-marca)
14. [Arquitectura técnica](#14-arquitectura-técnica)
15. [Base de datos y migraciones](#15-base-de-datos-y-migraciones)
16. [Variables de entorno](#16-variables-de-entorno)
17. [Seguridad](#17-seguridad)
18. [Cómo se trabaja: ramas, PRs, CI, Claude Code](#18-cómo-se-trabaja-ramas-prs-ci-claude-code)
19. [Reglas de oro (romperlas causa daño real)](#19-reglas-de-oro-romperlas-causa-daño-real)
20. [Historia: las mejoras, en orden](#20-historia-las-mejoras-en-orden)
21. [Pendientes y decisiones abiertas](#21-pendientes-y-decisiones-abiertas)
22. [Recetas: cómo hacer X](#22-recetas-cómo-hacer-x)
23. [Dónde está cada cosa (mapa de documentos)](#23-dónde-está-cada-cosa-mapa-de-documentos)

---

## 1. La empresa en 1 minuto

**MetricsField** (antes se llamaba **Taply**: si ves ese nombre en código o
docs viejos, es lo mismo) es una plataforma de **reputación online para
comercios locales de Córdoba, Argentina**.

- **El gesto:** en el local hay una pieza física (cartel, tarjeta o sticker)
  con chip NFC y/o QR. El cliente apoya el celular o escanea, y cae **directo**
  en la pantalla de Google para dejar una reseña de ese comercio. Sin apps,
  sin pantallas intermedias, el mismo camino para todos.
- **Lo que vendemos de verdad:** el panel de atrás. El dueño ve cuánta gente
  tocó el cartel (por día, hora, pieza y empleado), qué reseñas le dejaron,
  cómo está contra su competencia, y recibe un informe cada lunes.
- **Lo que NO hacemos (y es argumento de venta):** no filtramos reseñas. Nada
  de "si ponés 1-3 estrellas te mando a un formulario privado". Eso se llama
  *review gating*, Google lo penaliza, y lo eliminamos del producto a
  propósito (ver §19).

**Dominios:**

| Dominio | Qué es |
|---|---|
| `https://app.metricsfield.com` | La app: panel, portal de clientes, páginas de las piezas (`/t/...`) |
| `https://metricsfield.com` (y `www`) | La landing comercial |
| `geo-seo-analytics.vercel.app` | Dominio viejo de Vercel, mismo proyecto |

Todo vive en **un solo proyecto de Vercel**, deployado automáticamente desde la
rama `main` del repo `herniberelejis-lgtm/metricsfield` en GitHub.

---

## 2. Equipo, cuentas y accesos

**Personas:** Hernán (fundador, producto y ventas, maneja Neon/Vercel/Google
Cloud), Simón, Luis (sitio, alta de clientes, reglas de integridad), David
(técnico, en onboarding). Se habla de "equipo de 4".

**Cuentas que sostienen la empresa — conviene que al menos dos personas
tengan acceso a cada una:**

| Servicio | Para qué | Notas |
|---|---|---|
| **GitHub** `herniberelejis-lgtm/metricsfield` | Código | Sumar a Simón y Luis como colaboradores |
| **Vercel** (plan Hobby) | Hosting, deploys, crons, variables de entorno | Hobby = máx 2 crons y 60 s por función |
| **Neon** (Postgres, plan gratis) | Base de datos de producción | Los cambios de esquema se corren a mano en su SQL Editor |
| **Google Cloud** proyecto "Metrics Field" (n.º 230989216365) | OAuth (login del equipo y de piezas), Places API, Maps Static, Business Profile | **Poner una alerta de presupuesto** (pendiente) |
| **Google Search Console** | Verificación del dominio `metricsfield.com` (tipo Dominio) | Requisito de la verificación OAuth |
| **Upstash Redis** | Rate limit distribuido | Configurado en producción y preview |
| **Proveedor de DNS** de `metricsfield.com` | CNAME `app` → Vercel, TXT de Google | Ver §19, regla de DNS |
| **Casilla `info@metricsfield.com`** | SMTP de los mails, contacto de la app OAuth | Variables `SMTP_*` en Vercel |
| **Slack** | `MONITOR_WEBHOOK_URL` manda ahí las fallas | |
| **Anthropic** (opcional) | Redacción de respuestas a reseñas con IA | `ANTHROPIC_API_KEY` |

**WhatsApp:**
- Agencia / ventas: **+54 9 351 519-1716** (botón de la landing).
- Soporte de piezas (Mercado Libre): **+54 9 351 857-8949** (`WHATSAPP_SOPORTE`
  en `lib/onboarding.ts`).

**Entrar al panel `/admin`:** en producción **solo con Google**, y solo si tu
email está en la tabla `admins` (se administra en `/admin/administradores`;
no se puede borrar al último admin). La contraseña compartida
(`ADMIN_PASSWORD`) sirve únicamente en previews y en local.

---

## 3. Productos y verticales

La landing presenta tres verticales más una sección de herramientas:

| Vertical | Estado | Qué es |
|---|---|---|
| **Reputación** | **En producción, es el negocio hoy** | Piezas NFC/QR + panel. "Más reseñas en Google, con un toque del celular." |
| **Retail** | App aparte (link `RETAIL_APP` en la landing) | Rentabilidad para vendedores de Mercado Libre. Prueba gratis 30 días. |
| **Loyalty** | Construido, **apagado** (rama `desarrollo`, `LOYALTY_ENABLED`) | Club de beneficios con Google Wallet. Piloto. |
| **Intel** | En la landing | Calculadoras y 10 guías (ver §12) |

### Loyalty (club de beneficios) — en qué está

Construido de punta a punta y auditado, pero **no prendido en ningún
ambiente**. Vive en la rama `desarrollo` (PR #153). Resumen:

- El cliente final toca una pieza configurada como "Club de beneficios", cae
  en `/l/<comercio>`, se registra (nombre, celular, consentimiento), recibe
  puntos de bienvenida y guarda la tarjeta en **Google Wallet**.
- Suma puntos por visita (máx. una cada 20 h) y por misiones (opinar en
  Google, seguir en redes, invitar amigos, tope 20).
- Canje: código de 6 letras que vence en 15 min, el cajero lo valida en el
  portal (pestaña "Club de beneficios").
- El equipo lo configura en `/admin/clientes/<id>/loyalty`.
- Falta: correr la base, cargar variables, pasos en Google y **decidir cómo
  verificar el teléfono**. Apple Wallet queda para después.
- Docs: `docs/LOYALTY-ESTADO.md` y `docs/LOYALTY-PARA-AGENTES.md` (en la rama
  `desarrollo`: `git show origin/desarrollo:docs/LOYALTY-ESTADO.md`).

---

## 4. El hardware: standee, tarjeta, sticker

### Las piezas

| Pieza | Dónde va | Para qué |
|---|---|---|
| **Standee** (cartel acrílico de mesa/mostrador) | Mostrador, mesa | La pieza principal del local |
| **Tarjeta PVC** | En el bolsillo del mozo, vendedor o repartidor | Atribución por empleado: cada tarjeta = una persona |
| **Sticker NFC** | Vidriera, mesa, caja | Barato, para multiplicar puntos de contacto |

**En desarrollo (todavía no se venden):** chip QR+NFC para pegar en las mesas,
tarjetas NFC para que los mozos pidan la reseña en el momento, standee con QR
además de NFC. El software ya soporta las tres variantes (tipo `nfc`, `qr` o
`ambos` por pieza).

### Cómo funciona una pieza por dentro

- Cada pieza tiene un **código fijo** tipo `p-0149-66470d`. Ese código es la
  pieza para el sistema.
- El **QR** siempre apunta a `https://app.metricsfield.com/t/<código>`.
- El **chip NFC** se graba con esa misma URL (`/t/<código>`), **no** con el
  link de Google. Así: (1) cada toque se cuenta, (2) el destino se cambia
  desde el sistema sin regrabar el chip.
- Al tocar, `/t/<código>` registra el toque y redirige al link de reseña de
  Google del comercio (`writeAReviewUri` que da Google Places).
- **Nunca se bloquea la redirección**, aunque se pase un límite: el límite
  (30 toques cada 10 min por IP+pieza) solo deja de *contar*, no de mandar a
  Google (ver `docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html`).

### Ciclo de vida de una pieza

1. **Generar lote** en `/admin/hardware` (antes de saber a quién va). Se
   descargan los QR en `.zip` para el proveedor.
2. **Vender:** o se **asigna a un cliente** del panel (pieza "gestionada"),
   o se vende suelta por Mercado Libre (pieza "**autogestionada**", ver §8).
3. Al borrar un cliente, sus piezas vuelven al inventario.
4. Una pieza autogestionada devuelta o de prueba se limpia con **Devolver al
   inventario** (Admin → Hardware).

### Grabar el chip NFC (lo hace el cliente o nosotros)

Con la app gratis **NFC Tools** (Android y iPhone): Escribir → Agregar
registro → URL → pegar `https://app.metricsfield.com/t/<código>` → Escribir →
apoyar el chip. En iPhone el lector NFC está arriba, cerca de la cámara; en
Android, en el medio de la espalda. Hay videos en `public/tap/videos/` y una
guía impresa de 2 páginas en `public/instructivo/` (ver §8).

---

## 5. Precios

Lista vigente (landing, sin IVA):

| Ítem | Precio |
|---|---|
| Panel (suscripción) | **$25.000/mes + IVA**, sin permanencia |
| Standee | $25.000 + IVA, pago único |
| Tarjeta PVC | $10.000 + IVA, pago único |
| Sticker NFC | $15.000 + IVA, pago único |
| **Promo** | 3 meses de panel por adelantado ($75.000 + IVA) **y regalamos una pieza de cada** (standee, tarjeta y sticker) |

- Las piezas son **del comercio** (no es alquiler).
- Los pedidos de la landing llegan por **WhatsApp** (el carrito arma el
  mensaje). **No hay pasarela de pago todavía.**
- Pieza suelta en Mercado Libre: sin abono; el panel se ofrece después.
- El documento de ventas planteaba dos planes (**Base** y **Premium**, con
  citas en IA como exclusivo Premium). Es un marco, no una lista cerrada: el
  precio que se publica es el de esta tabla.

---

## 6. Ventas: pitch, demo, objeciones, alta de cliente

(Versión completa en `docs/VENTAS-PITCH-DEMO-PRICING.html`.)

### Pitch de 20 segundos

> "Somos MetricsField. Ponemos un cartel en tu local que manda a tus clientes
> directo a dejarte reseña en Google — un toque con el celular, sin apps, sin
> pasos raros. Y del otro lado te damos un panel donde ves todo: cuántos te
> tocaron, qué dice cada reseña, y qué empleado está generando más movimiento.
> ¿Tenés 5 minutos?"

### Los 3 diferenciales reales

1. **Atribución por empleado.** Tarjeta NFC por persona: toques exactos por
   empleado (dato 100% real) + cuántas veces lo nombran en las reseñas (señal
   de calidad). Ningún competidor local lo mide. *Ojo:* Google no dice qué
   reseña vino de qué tarjeta; no lo prometas.
2. **Sin desvío de reseñas.** Todos van al mismo link público. Los que filtran
   ponen en riesgo la ficha del comercio.
3. **El dato es del dueño.** Conecta **su** cuenta de Google Business Profile,
   no una de agencia. Si se va, desconecta con un click.

### Objeciones

| Objeción | Respuesta |
|---|---|
| "Ya tengo un QR que hice yo" | Un QR genérico no te dice nada: ni si funcionó, ni quién lo usó, ni qué dijeron. El gesto es el mismo, pero atrás tenés el panel. |
| "¿Y si alguien hace trampa?" | No generamos reseñas, solo llevamos a Google; Google decide qué publica. Hay límites de uso por pieza. |
| "¿Cuánto sale?" | Ver §5. Si no está claro el plan, "te mando la propuesta por WhatsApp". |

### Demo de 10 minutos (en el celular)

1. **El toque en vivo** (1 min) — sin explicar antes.
2. **Portal, resumen** (2 min) — rating, reseñas del mes, toques.
3. **Reseñas + respuesta sugerida** (2 min).
4. **Atribución por empleado** (2 min) — el cierre fuerte.
5. **Competencia** (1 min) si el rubro tiene competidores cargados.
6. **Cierre** (2 min): "¿arrancamos esta semana?", no "¿qué te pareció?".

**No mostrar** (no existe o está apagado): "posición en Google Maps" (se
eliminó), respuestas automáticas si Google no aprobó la API, citas en
ChatGPT/Perplexity como algo automático, finanzas/prospectos/reportes
imprimibles (se borraron del panel).

### Alta de un cliente nuevo (checklist)

1. Cargar el comercio en `/admin/clientes/nuevo` (genera el código del portal).
2. Cargar su **Google Place ID** (rating y reseñas se sincronizan solos desde
   el día 1).
3. **Asignar las piezas** del inventario (`/admin/hardware` → Asignar a cliente).
4. Si hay empleados con tarjeta propia, cargar cada link con su nombre.
5. Cargar `email_notificaciones` para alertas e informe del lunes.
6. Mandarle el link del portal (`app.metricsfield.com/portal/<código>`) con un
   párrafo de instrucciones, no un manual.
7. Guiarlo a **conectar su Google Business Profile** desde el portal (cuando
   Google apruebe la API; ver §10).
8. **A los 7 días:** chequeo activo (¿hubo toques? ¿pegó bien el cartel?). El
   seguimiento de las 2 primeras semanas es lo que hace que el cliente se
   enganche.

### Propuestas corporativas

`docs/PROPUESTA-PIZZERIA-POPULAR-CORPORATIVO.md`: propuesta "**RADAR 90**" para
una cadena (120+ sucursales). Sirve de modelo para cadenas: standee de mesa +
tarjeta por mozo/repartidor + panel multi-sucursal + auditoría por empleado.
Antes de mandarla a otra cadena, revisá que no prometa nada que no exista hoy
(§6 "No mostrar").

---

## 7. Clientes y casos

> La lista viva de clientes está en `/admin/clientes`. Esto es lo que hay que
> saber de los casos conocidos.

| Cliente / caso | Qué saber |
|---|---|
| **La Gran Feria** | Cliente del panel. El token de Google necesita **reconectarse** (lo hace el cliente desde su portal). |
| **Felippa & asociados** | Pieza `p-0220-e8443c`. |
| **Facundo — revendedor de Mercado Libre (Villa Allende)** | Primer revendedor. Compra piezas sueltas y las configura para los locales a los que se las vende. **No quiere el software**: no se le crea cliente en el panel. Piezas conocidas: `p-0149-66470d` (Odontología), `p-0203-9e7038` (Plásticos del Pacífico), `p-0133-3e5c3a`. Su caso dio origen al sistema de "Mis piezas" (§8). A futuro: posible esquema de afiliado/revendedor (no definido). |
| **Pizzería Popular** | Prospecto corporativo (propuesta RADAR 90). |

**Regla con compradores de Mercado Libre:** no usar los datos que da Mercado
Libre de la compra para ofrecer el software (lo prohíben sus políticas y la ley
de datos). Solo vale el contacto que la persona dejó **ella misma** en nuestra
página, con la casilla de aceptación tildada.

---

## 8. Canal Mercado Libre y piezas autogestionadas

Es la parte más nueva y la que más soporte va a generar. Diseño completo,
alternativas descartadas y auditoría: `docs/PIEZAS-AUTOGESTION-PLAN.md`.

### La idea

Se vende la **pieza suelta**, sin abono. El comprador la configura solo,
escaneándola. No pasa por el panel ni crea cliente en el CRM.

### Activación (primera vez que se escanea)

En `/t/<código>`, en 3 pasos:

1. **Buscar el negocio**: escribe nombre o calle y aparecen sugerencias como
   en Google Maps (Places Autocomplete, priorizando Córdoba). Al elegir uno se
   muestra "**¿Es este? Ver en Google Maps**" para confirmar. Plan B: pegar el
   link de reseña a mano. Si el negocio no aparece, se le explica cómo crear
   su ficha en `business.google.com`.
2. **Elegir un PIN** (de 4 a 8 dígitos).
3. **Opcional:** dejar mail/WhatsApp con casilla de aceptación → recibe gratis
   cada lunes cuántas personas usaron la pieza (con link de baja), y el mail
   le ofrece el panel.

Abajo del formulario hay ayuda desplegable: "¿Cómo activo mi cartel?" (videos
QR y NFC, pasos, copiar el link), "¿Necesitás ayuda?" y "Probá MetricsField
gratis 15 días" (los dos abren WhatsApp de soporte).

### Manejar muchas piezas: "Mis piezas" (`/t/mis-piezas`)

Pensado para revendedores como Facundo, pero sirve para cualquiera.

- **El celular que activa una pieza (o pone su PIN una vez) la maneja sin
  PIN.** Técnicamente es un "llavero": una cookie firmada en el celular
  (`mf_llavero`) que dice qué piezas maneja.
- En **Mis piezas** se ve la lista con: toques de la semana, botón **Probar**,
  **Cambiar** (elegir otro negocio), **Entregar** y **Quitar de este celular**.
- **Escanear una pieza propia** con ese celular muestra las opciones de dueño
  (y ese toque no se cuenta).
- **Sumar una pieza:** botón que abre 10 minutos para escanear piezas ya
  activadas; cada una pide su PIN una sola vez.
- **Entregar** (cuando el revendedor se la da a un local): genera un **PIN
  nuevo** para el dueño nuevo, la saca de su celular y de su cuenta, borra el
  contacto anterior y arma un **mensaje de WhatsApp** listo para mandar con
  el link y el PIN. Tiene "Me equivoqué" para deshacer.
- **Guardar con Google:** el usuario entra con su cuenta de Google y las
  piezas quedan guardadas ahí (columna `duenio_email`). Si pierde o cambia el
  celular, entra con Google desde cualquier lado y las recupera sin PIN. Usa
  el mismo OAuth del proyecto (permiso solo de email y perfil).
- **Navegadores internos** (Instagram, Facebook, WhatsApp): no guardan bien
  las cookies; las páginas muestran un aviso para abrir en Chrome/Safari.

### Revisión semanal de fichas

Cada lunes, con el cron del informe, el sistema mira en Google el estado de la
ficha a la que apunta cada pieza autogestionada (cerrada temporal, cerrada
definitiva, ya no existe). Si cambió a un estado malo **avisa una sola vez**:
mail al dueño (si dejó Google o contacto) y a todos los admins. Se ve como
etiqueta en Admin → Hardware y como aviso en Mis piezas.

### Soporte: la regla del PIN

Si alguien perdió el PIN y no guardó con Google, **el equipo le pone uno nuevo**
en Admin → Hardware → columna "PIN y devolución". **Antes** hay que verificar
que es el dueño:

1. Pedir **foto de la pieza puesta en el negocio** (se ve el código impreso).
2. Si la pieza tiene cuenta de Google o contacto cargado, **consultar a esa
   persona** antes de cambiar nada.
3. Recién ahí tildar "**Verifiqué**" (el admin lo exige) y poner el PIN nuevo.
   Esto la saca de cualquier celular y cuenta de Google anterior.

Hay un desplegable "Regla de soporte" en la misma pantalla con este texto.

### Guía impresa

`public/instructivo/instructivo-metricsfield.pdf` (y `.png`): 2 páginas
(parte 1 QR, parte 2 NFC), **sin links ni teléfonos** (Mercado Libre no los
permite en la mensajería). Se manda por la mensajería de la venta o va en la
caja. Se regenera con `node scripts/instructivo/generar.mjs`.
**Pendiente:** reemplazar la guía vieja publicada en Mercado Libre por esta.

### Términos

`/terminos` (sección "4. Hardware") tiene un párrafo sobre piezas sueltas y
revendedores. **Pendiente revisión de un abogado.**

---

## 9. Cómo funciona el software (visión de usuario)

Hay **tres sistemas de acceso independientes**, más las páginas públicas.

### 9.1 La pieza: `/t/<código>` (público)

- Pieza de cliente o autogestionada activa → cuenta el toque y redirige a
  Google.
- Autogestionada sin activar → pantalla de activación (§8).
- Dueño escaneando su pieza → opciones de dueño.
- Rutas hermanas: `/t/<código>/editar`, `/t/<código>/entregar`,
  `/t/mis-piezas`.

### 9.2 Portal del cliente: `/portal/<código>` (solo lectura)

El **código privado es la credencial** (se manda por WhatsApp). No hay usuario
ni contraseña. Cada cliente ve solo lo suyo. Lo que tiene:

- **Tablero** con métricas por período y comparación contra el anterior
  (toques, reseñas, rating; visitas/llamadas solo si Business Profile está
  habilitado).
- **"Necesita tu atención"**: prioridades del momento.
- **Reseñas de Google** con respuesta sugerida (aprobar, editar, regenerar),
  semáforo (buenas/medias/malas) y mapa de calor por día y hora.
- **Conclusiones** ("Lo que Google no te muestra"): cruces de datos con
  mínimo de casos; si no hay datos suficientes no se muestra nada.
- **Mi rating en Google**: cuántas 5★ faltan para la próxima décima.
- **Dispositivos**: toques por pieza (mozo, mesa, mostrador) y **personal**
  (toques + menciones en reseñas).
- **Competencia**: comparación mes a mes con competidores, mapa de la zona
  (Maps Static).
- **Sucursales**: un comercio puede tener varias (cuenta raíz + sucursales; el
  código de una sucursal no es credencial).
- **Conectar Google Business Profile** con la cuenta del propio cliente.

Reglas de diseño del portal: `DESIGN.md`.

### 9.3 Panel del equipo: `/admin`

| Sección | Para qué |
|---|---|
| `/admin` | Resumen general |
| `/admin/clientes` | Alta, edición, baja (borrar pide escribir el nombre). Cada ficha tiene CRM, links/piezas, métricas, auditoría |
| `/admin/hardware` | Inventario de piezas: generar lote, descargar QR, asignar, piezas autogestionadas (cuenta Google, estado de ficha, PIN, devolver al inventario) |
| `/admin/administradores` | Quién puede entrar (allowlist de emails de Google) |
| `/admin/actividad` | Auditoría: quién hizo qué, con email |
| `/admin/laboratorio` | Cruces de datos para el equipo (reseñas × toques × métricas de Google), para validar ideas antes de mostrarlas a clientes |

**Ya NO existen** (no prometer): `/admin/finanzas`, `/admin/prospectos`,
`/admin/reportes`, `/admin/analytics`, Tutoriales, "Posición en Maps", subida
de capturas, star-gate.

### 9.4 Otras páginas públicas

`/` (home), `/login`, `/privacidad` y `/privacy`, `/terminos` y `/terms`,
`/baja` (darse de baja de los avisos).

---

## 10. Integraciones con Google

| API | Archivo | Estado | Para qué |
|---|---|---|---|
| **Places API (New)** | `lib/places.ts` | ✅ Andando | Rating y total de reseñas (sync diario), buscador de negocios y autocompletado de la activación, link de reseña, estado de la ficha |
| **Maps Static API** | `lib/mapa.ts` | ✅ Si hay clave | Mapa de la zona en el portal. Clave aparte, restringida al dominio, URLs firmadas |
| **OAuth (login)** | `lib/google-oauth.ts` | ✅ Aprobado | Login del equipo, "Guardar con Google" de piezas, conexión de Business Profile de cada cliente. Un solo callback: `/api/admin/oauth/callback` |
| **Business Profile Performance** | `lib/gbp.ts` | ⏳ Esperando aprobación | Visitas, llamadas, búsquedas. Interruptor `GOOGLE_BUSINESS_PROFILE_HABILITADO` (apagado = el portal oculta esas métricas) |
| **Reviews (Business Profile)** | `lib/google-reviews.ts` | ⏳ Esperando aprobación | Leer reseñas una por una y responder automáticamente. Interruptor `GOOGLE_REVIEWS_API_ENABLED` |

- Caso de acceso a Business Profile API abierto con Google: **2-7611000041406**.
- Mientras la API de reseñas no esté aprobada, las reseñas detalladas se
  cargan a mano o salen de las públicas que muestra Places.
- El día que Google apruebe: poner el interruptor en `true` en Vercel y
  redeployar. El código ya está listo.
- Pasos de la verificación OAuth: `docs/VERIFICACION-OAUTH.md`.

---

## 11. Automatismos: crons, mails, respuestas

Configurados en `vercel.json` (Hobby permite solo 2):

| Cron | Horario | Qué hace |
|---|---|---|
| `/api/cron/sync-google` | Todos los días 03:05 UTC (**00:05 Córdoba**) | Actualiza rating y reseñas de cada comercio con Place ID; alertas de reseñas malas; respuestas automáticas (si están habilitadas); resumen mensual el día 1 |
| `/api/cron/resumen-semanal` | Lunes 12:00 UTC (**09:00 Córdoba**) | Informe semanal a cada dueño; aviso semanal a compradores de piezas sueltas; revisión de fichas de piezas autogestionadas |

Los dos exigen `Authorization: Bearer <CRON_SECRET>`.

**Mails** (necesitan `SMTP_*` y el email del cliente cargado; si falta algo,
no mandan nada y no rompen):

- **Alerta de reseña ≤3★** al dueño (`lib/alertas.ts`).
- **Informe del lunes** "Tu semana en Google" (`lib/informe-semanal.ts`,
  `lib/resumen-semanal.ts`): cómo te encontraron, reseñas, competencia, qué
  hizo MetricsField en tu local. Sale de los mismos números que el portal.
  También hay versión para WhatsApp desde el admin.
- **Aviso semanal de piezas sueltas** (`lib/aviso-piezas.ts`): toques de la
  semana + oferta del panel.
- **Revisión de fichas** (`lib/revision-piezas.ts`).

**Respuestas automáticas a reseñas** (`lib/auto-respuesta.ts`): solo reseñas
positivas **sin quejas** en el texto, sin repetir texto, con tope diario por
comercio, y se pausan solas si Google rechaza una. La redacción con Claude
(`lib/respuestas-ia.ts`) es opcional (`RESPUESTAS_IA_HABILITADAS=true` +
`ANTHROPIC_API_KEY`); apagada o si falla, usa la plantilla de
`lib/respuestas.ts`. A Claude nunca se le manda el nombre del autor de la
reseña. **Todo depende de que Google apruebe la Reviews API.**

**Monitoreo:** fallas importantes van a Slack vía `MONITOR_WEBHOOK_URL`
(`lib/monitor.ts`).

---

## 12. Marketing: landing, guías, SEO

- **Landing:** `metricsfield.com`. El HTML vive en `public/landing/` y **se
  genera** con `node scripts/landing/generar.mjs` (no editar el HTML a mano:
  editar el generador y regenerar).
- **Hero de la home:** "Cada contacto deja un dato. Cada dato, una decisión."
- **Vertical Reputación:** "Más reseñas en Google, con un toque del celular."
- **Carrito → WhatsApp** de la agencia con el pedido armado.
- **Intel:** calculadoras y **10 guías**: cómo conseguir reseñas,
  posicionamiento en Maps, SEO local, GEO (aparecer en respuestas de IA),
  rentabilidad en Mercado Libre, fidelización, Google Wallet, clientes
  recurrentes, CRM, ciclo de vida del cliente.
- **SEO técnico:** `app/sitemap.ts`, `app/robots.ts`; las páginas de piezas
  (`/t/...`) y portal son `noindex`. Analytics con `NEXT_PUBLIC_GA_ID`.
- **Search Console:** dominio `metricsfield.com` verificado tipo Dominio.
- **Brief de sitio para Luis:** `docs/BRIEF-LUIS-SITIO-IMPULSO.html`.
- **Prospección en calle** (plan histórico): 15 puertas por día en Nueva
  Córdoba y Güemes, martes a jueves 10:30–12:30; WhatsApps de prueba;
  propuesta RADAR a cadenas.

---

## 13. Manual de marca

### Nombre

**MetricsField** (una palabra, M y F mayúsculas). "Taply" es el nombre viejo:
no usar en nada nuevo.

### Logo

- **Isotipo de hexágonos**, en negro (`#111111`) o blanco.
- Variantes en `public/brand/`: `isotipo.svg`, `isotipo-blanco.svg`,
  `logo.svg`, `logo-blanco.svg`, `logo-horizontal.svg`,
  `logo-horizontal-blanco.svg`, PNGs de 512/1200 px,
  `isotipo-120-fondo-blanco.png` (el de la pantalla de consentimiento de
  Google), `og-resena.svg` (imagen para compartir).
- Se generan con `scripts/marca/generar.py` (y se rasterizan con
  `scripts/marca/rasterizar.mjs`). Para cambiar el logo, editar el generador.
- Logo negro sobre fondo claro, blanco sobre fondo oscuro. Nada de colores ni
  efectos sobre el logo.

### Tipografía

**Montserrat**, una sola familia en todo (títulos, cifras, cuerpo). Cifras con
ancho fijo (`tabular-nums`). Decimales con coma: "4,6 ★".

### Color

- **Marca:** negro `#111111` + blanco; gris de apoyo `#5e5e5e`.
- **Producto (portal/panel):** fondo `#F4F5F7`, tarjetas blancas con borde
  `#E4E6EA`, texto `#1A1A1A` / secundario `#666666`, acción principal y links
  `#1F4E80`, dato `#6F9BCF`, "bien" verde `#0B5E40`, "para mejorar" durazno
  `#8A3F00`, "vos" lavanda `#9B86DB`. Tabla completa en `DESIGN.md` §2.
- **Páginas de piezas** (`/t/...`): azul de marca `#2563eb` (tokens en
  `components/tap/estilo.ts`).
- Regla: **el color va en los datos, no en el decorado.**

### Tono de voz

- **Español rioplatense con voseo** ("tocá", "elegí", "tenés"), cercano y
  claro. Pensado para un dueño de comercio, no para un técnico.
- **Honesto:** nunca "gracias a nosotros"; lo atribuido al cartel es
  aproximado y se dice. Sin datos suficientes, se dice que faltan datos. Nunca
  "+100%" desde cero.
- **Corto:** un párrafo, no un manual. "Que lo pueda usar cualquiera."
- **Sin promesas falsas:** no prometer lo que no existe (§6 "No mostrar").

Guía de interfaz completa: `DESIGN.md`.

---

## 14. Arquitectura técnica

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.**
- **Sin ORM ni API REST:** SQL directo con el driver `postgres`
  (`lib/sql.ts`, con `prepare: false` obligatorio). Mutaciones con **Server
  Actions** (`"use server"`): admin en `app/actions.ts`, login en
  `app/login/actions.ts`, públicas (piezas) en `app/t/actions.ts`.
- **Capa de datos:** `lib/db.ts` reexporta `lib/db/*.ts` (partido por
  dominio: `links.ts`, `autogestion.ts`, `ajustes.ts`, `google-sync.ts`,
  etc.). Cada función mapea filas `snake_case` → objetos `camelCase` de
  `lib/types.ts`. **Agregar una columna = tocar 3 lugares:** `.sql` de
  migración (+ `db/schema.sql`), el mapper en `lib/db/`, el tipo en
  `lib/types.ts`.
- **Middleware** (`middleware.ts`): protege `/admin` y pone la CSP con nonce.
- **Toda action de admin** empieza con `await requireAdmin()` y deja rastro en
  la tabla `auditoria`.
- **Sesiones** (`lib/sesion.ts`): cookies firmadas con HMAC y vencimiento,
  con audiencia separada (`admin`, `portal`, `piezas`) para que una no sirva
  de otra.
- **Llavero de piezas** (`lib/llavero-core.ts` puro + `lib/llavero.ts`
  cookies): cada entrada es `código.firma`, la firma depende de un secreto del
  servidor y de la "sal" del PIN actual; cambiar el PIN invalida todos los
  celulares. Las cookies se escriben vía la ruta `/t/llavero` (no desde una
  action, porque Next 15 re-renderiza la página al setear cookies en actions).
- **Cuenta de Google para piezas:** `lib/cuenta-piezas.ts`, cookie
  `mf_cuenta`, el callback de OAuth distingue por prefijo de `state` (`pz_`).
- **Rate limit:** `lib/ratelimit.ts` con Upstash Redis (login, portal, toques,
  PIN, búsquedas).

### Mapa rápido de carpetas

```
app/
  admin/         panel del equipo (clientes, hardware, administradores, actividad, laboratorio)
  api/cron/      sync-google, resumen-semanal
  api/admin/oauth/callback   callback único de Google OAuth
  portal/[codigo]/           portal del cliente
  t/[slug]/      la página de cada pieza (+ editar, entregar)
  t/mis-piezas, t/llavero, t/cuenta/google
  login, privacidad, privacy, terminos, terms, baja
lib/             lógica (db/, places, gbp, google-oauth, llavero, informes, alertas…)
components/      UI propia (ui.tsx, forms.tsx, charts/, portal/, tap/)
db/schema.sql    esquema de referencia; db/migrations/ los cambios numerados
scripts/         generadores: landing/, instructivo/, marca/, prueba-permisos.mjs
test/            tests (vitest)
public/          landing/, brand/, instructivo/, tap/videos/
docs/            documentación
```

### Comandos

```bash
npm install
npm run dev            # http://localhost:3000 (necesita .env.local, ver .env.example)
npm test               # tests (vitest) — hoy 258, todos en verde
npx tsc --noEmit       # chequeo de tipos
npm run lint
npm run build          # build de producción
node scripts/prueba-permisos.mjs   # 51 ataques de permisos contra un server levantado
```

---

## 15. Base de datos y migraciones

- **Neon Postgres**, conexión pooled (PgBouncer).
- Esquema de referencia: `db/schema.sql`. Datos de ejemplo: `db/seed.sql`.
- **Los cambios NO se aplican solos.** Cada cambio es un archivo numerado en
  `db/migrations/` que alguien corre a mano en el **SQL Editor de Neon**.

Migraciones existentes: 001 competidores · 002 cobros · 003 índices · 004
automatización de reseñas · 005 filtro opcional · 006 autogestión hardware ·
007 alertas por email · 008 desactivar filtro · 010 limpieza · 011 usuarios
portal · 014–015 logo del comercio · 017 métricas diarias y búsquedas · 018
ubicación mapa · **019 onboarding autogestión (corrida)** · **020 cuenta
Google de piezas (corrida)**.

Si no estás seguro de si una migración se corrió, chequealo en Neon antes de
asumir nada (ej.: `SELECT column_name FROM information_schema.columns WHERE
table_name='links_nfc';`).

Tablas principales: `comercios` (clientes y sucursales), `links_nfc` (piezas),
`taps` (toques), `admins`, `auditoria`, `ajustes` (clave/valor; ahí va el
estado de revisión de fichas `estado_pieza:<id>`), tablas de reseñas,
competidores e histórico. Restos sin uso: columna `usar_filtro`, tabla
`feedback`, tabla `cobros`.

---

## 16. Variables de entorno

Se cargan en Vercel (Settings → Environment Variables). Detalle en
`.env.example`.

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | Sí | Neon |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Sí | Sin esto nadie entra al panel en producción |
| `NEXT_PUBLIC_BASE_URL` | Sí | `https://app.metricsfield.com` |
| `CRON_SECRET` | Sí | Protege los crons |
| `TOKEN_ENCRYPTION_KEY` (+ `_ANTERIOR` para rotar) | Sí si hay clientes conectados a Google | Cifra los refresh tokens |
| `GOOGLE_PLACES_API_KEY` | Recomendada | Rating, buscador de la activación, revisión de fichas |
| `GOOGLE_MAPS_STATIC_KEY` / `_FIRMA` | Opcional | Mapa del portal |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Recomendada | Rate limit |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | Para mails | Alertas, informes, avisos |
| `MONITOR_WEBHOOK_URL` | Opcional | Fallas a Slack |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Opcional | WhatsApp de contacto |
| `NEXT_PUBLIC_GA_ID` | Opcional | Google Analytics |
| `ADMIN_PASSWORD` | Solo preview/local | Contraseña compartida del panel |
| `GOOGLE_OAUTH_VERIFIED` | Interruptor | App OAuth verificada |
| `GOOGLE_BUSINESS_PROFILE_HABILITADO` | Interruptor | Visitas/llamadas (espera aprobación) |
| `GOOGLE_REVIEWS_API_ENABLED` | Interruptor | Reseñas una por una + auto-respuesta (espera aprobación) |
| `RESPUESTAS_IA_HABILITADAS`, `ANTHROPIC_API_KEY`, `RESPUESTAS_IA_MODELO` | Opcional | Respuestas con IA |
| `LLAVERO_SECRET` | Opcional | Secreto del llavero de piezas (si falta, se deriva de otros secretos) |
| `LOYALTY_ENABLED` | Solo en `desarrollo` | Club de beneficios |

**Cuidado:** cambiar `GOOGLE_OAUTH_CLIENT_SECRET` (o `LLAVERO_SECRET`) invalida
las sesiones y los llaveros de piezas de todos los celulares; la gente tendría
que volver a poner el PIN o entrar con Google.

---

## 17. Seguridad

- Auditoría zero-trust aplicada (`docs/AUDITORIA-ZERO-TRUST-2026-07.md`,
  `docs/AUDITORIA-INTEGRAL-2026-07.md`).
- Sesiones firmadas con vencimiento; audiencias separadas.
- Refresh tokens de Google **cifrados** en la base.
- Rate limit distribuido (Upstash).
- Headers de seguridad + CSP con nonce.
- URLs de destino de las piezas en lista blanca de esquemas.
- PIN de piezas: con hash y sal, cuotas por IP y por pieza (5 cada 15 min,
  10 por hora, 30 por día).
- `scripts/prueba-permisos.mjs`: 51 ataques automatizados (portal ajeno, admin
  sin sesión, llavero falsificado, tickets vencidos, etc.).
- **Los tests de `test/` cubren lo que, si se rompe, abre un agujero. Nunca se
  borra un test para que pase un cambio.**

---

## 18. Cómo se trabaja: ramas, PRs, CI, Claude Code

### Ramas

```
main         producción (app.metricsfield.com). Solo lo terminado y probado.
desarrollo   lo que está a medias (ej. Loyalty). Tiene su propia preview.
claude/…     una rama por tarea de Claude.
nombre/…     una rama por tarea de cada persona.
```

| Tu cambio… | Va a |
|---|---|
| Terminado, probado, no rompe nada | `main` |
| Le falta pulido o depende de algo | `desarrollo` |
| Hotfix de producción | `main` (y después se baja a `desarrollo`) |

- **Nunca pushear directo a `main` ni a `desarrollo`.** Rama → PR → CI verde →
  merge.
- Cada rama pusheada genera una **preview en Vercel** para probar.
- Cuando `main` avanza, bajarlo a `desarrollo` el mismo día.
- Avisar en qué archivos vas a trabajar (dos personas en `lib/db/` = conflicto).

### CI

GitHub Actions corre `verificar` (tipos, tests, lint, build) y `permisos`
(prueba de ataques), más el deploy de Vercel. **Si está rojo, no se fusiona.**

### Trabajar con Claude Code (sin depender de una sola persona)

- Cualquiera del equipo puede abrir Claude Code (web en claude.ai/code, app o
  terminal) apuntando al repo. El archivo `CLAUDE.md` del repo le da a Claude
  las reglas del proyecto automáticamente.
- Claude **no tiene acceso a Neon** ni (en general) a producción: los cambios de
  base te los entrega como `.sql` para que los corras vos.
- Buenas prácticas para pedir:
  - Contale el **objetivo de negocio**, no solo la pantalla.
  - Pedile que trabaje en una rama, abra PR y espere el CI.
  - Para cosas grandes, pedile que planifique y refute alternativas antes.
  - Pedile que actualice `docs/CONTEXTO-Y-PROGRESO.md` cuando cambie algo del
    producto.
- Ciclo por tarea: `npx tsc --noEmit` + `npm test` + `npm run build` → commit
  en español → PR.
- Si Claude no está disponible: el repo se puede trabajar a mano con los
  mismos comandos; todo lo necesario está en este manual, `CLAUDE.md` y
  `docs/`.

---

## 19. Reglas de oro (romperlas causa daño real)

1. **Sin desvío de reseñas.** Nunca filtrar ni desviar por calificación. El
   cartel manda a todos al mismo link público de Google.
2. **Nunca sacar `prepare: false` de `lib/sql.ts`** (rompe la conexión con
   Neon con el error `cached plan must not change result type`).
3. **Los cambios de esquema no se auto-aplican:** `.sql` aparte, a mano en
   Neon. Nunca asumir que "ya se aplicó".
4. **Ningún `DROP`/`DELETE` masivo sin avisar y confirmar antes.** Ya hubo una
   pérdida de datos real. Antes de correr cualquier SQL en Neon, **limpiá el
   editor**: ya pasó que quedaba un `DELETE` viejo abajo.
5. **Nunca pushear directo a `main` ni a `desarrollo`.**
6. **"Posición en Maps" no existe** y no se reintroduce (no se puede hacer de
   forma honesta).
7. **No borrar tests para que pase un cambio.**
8. **DNS:** `app.metricsfield.com` es un **CNAME** `app` →
   `5ffa34d97352b7b0.vercel-dns-017.com.` (TTL 300). Si desaparece, **todos los
   carteles y portales dejan de andar**. Antes de tocar la zona DNS por
   cualquier motivo, confirmá que ese registro sigue ahí.
9. **Datos de Mercado Libre:** no usar los datos del comprador que da Mercado
   Libre; nada de links ni teléfonos en lo que se manda por su mensajería.
10. **PIN de piezas:** solo después de verificar al dueño (§8).
11. **No tocar piezas reales de clientes para "probar":** escanear una pieza
    real suma un toque a sus estadísticas. Para pruebas, usar piezas de prueba
    y después "Devolver al inventario".

---

## 20. Historia: las mejoras, en orden

(Resumen; el detalle está en el historial de PRs de GitHub.)

- **Origen (Taply):** cartel NFC con "star-gate" (desviaba 1-3★ a un
  formulario privado) + panel. **El star-gate se eliminó** por riesgo legal y
  de políticas de Google.
- **Renombre a MetricsField**, dominio propio, `app.metricsfield.com`.
- **Panel reestructurado** (se borraron finanzas, prospectos, reportes,
  analytics, tutoriales). Se eliminó "Posición en Maps".
- **Login del equipo con Google** + allowlist + auditoría.
- **Seguridad zero-trust:** sesiones firmadas, rate limit en Upstash, tokens
  cifrados, tests, monitoreo a Slack.
- **Portal rediseñado** (jul. 2026): resumen, sucursales, dispositivos,
  personal, `DESIGN.md`.
- `lib/db.ts` partido por dominio; portal desarmado en componentes; cron con
  cursor; home pública para verificación OAuth.
- **Sync diario a las 00:05**, "Reseñas hoy", alertas por mail, resumen
  mensual.
- **Conclusiones, laboratorio de cruces, mapa de la zona, competencia mes a
  mes, objetivos de rating.**
- **Informe de los lunes** al dueño (mail + WhatsApp).
- **Respuestas automáticas** a reseñas positivas (listas, esperan la API) y
  **redacción con IA** opcional.
- **Landing nueva** generada por script, con tres verticales, Intel y 10 guías.
- **Loyalty** construido en `desarrollo` (apagado).
- **Canal Mercado Libre** (migración 019): activación en 3 pasos, aviso semanal
  gratis, videos y guía PDF.
- **PR #226:** buscador de la activación con autocompletado y prioridad
  Córdoba.
- **PR #228:** arreglo urgente para el revendedor (cambiar piezas varias
  veces).
- **PR #230:** llavero, **Mis piezas**, Entregar, Sumar y **Guardar con
  Google** (migración 020).
- **PR #232:** auditoría con 10 arreglos + **Devolver al inventario**.
- **PR #234:** revisión semanal de fichas, "Ver en Google Maps", regla de
  soporte del PIN, términos para revendedores, ayudas, guía impresa
  actualizada.

---

## 21. Pendientes y decisiones abiertas

**Del lado de Google**
- [ ] Aprobación de **Business Profile API** (caso 2-7611000041406). Cuando
      llegue: prender `GOOGLE_BUSINESS_PROFILE_HABILITADO` y
      `GOOGLE_REVIEWS_API_ENABLED`.
- [ ] **Alerta de presupuesto** en Google Cloud (Places se cobra por uso).

**Operativos**
- [ ] Revisión legal del párrafo de piezas/revendedores en `/terminos`.
- [ ] Pasarle la **regla de soporte del PIN** a quien atienda el WhatsApp de
      soporte.
- [ ] Reemplazar la guía vieja de Mercado Libre por la nueva
      (`public/instructivo/`).
- [ ] La Gran Feria: reconectar su Google.
- [ ] Probar en real el login con Google de "Mis piezas" y que lleguen los
      mails de revisión (no se pudo desde el entorno de Claude).

**Decisiones de negocio abiertas**
- [ ] Cómo se le cobra el panel a un comprador de Mercado Libre (WhatsApp
      manual vs. Mercado Pago).
- [ ] Esquema de afiliado/revendedor (comisión, precio mayorista, si el
      revendedor ve las métricas de lo que vende).
- [ ] Loyalty: verificación de teléfono y cuándo hacer el piloto.
- [ ] Fabricación del hardware nuevo (chip de mesa, tarjetas para mozos,
      standee QR+NFC).
- [ ] Automatizar Audit GEO y monitoreo de competencia (hoy manuales).

---

## 22. Recetas: cómo hacer X

**Dar de alta un cliente** → §6 "Alta de un cliente nuevo".

**Sumar a alguien al panel** → `/admin/administradores` → agregar su email de
Google.

**Un comprador de Mercado Libre perdió el PIN** → ¿guardó con Google? Que entre
a `app.metricsfield.com/t/mis-piezas` → "Guardar con Google" con esa cuenta.
Si no → regla de soporte (§8): foto de la pieza en el local → Admin → Hardware
→ PIN y devolución → tildar "Verifiqué" → PIN nuevo → mandárselo.

**Un revendedor quiere manejar muchas piezas** → que active cada pieza desde
el mismo celular (o use "Sumar una pieza" con los PIN), que guarde con Google,
y que use **Entregar** cuando se la da a un local.

**Me devolvieron una pieza / usé una para probar** → Admin → Hardware →
"Devolver al inventario" (tildar la confirmación).

**Un cliente dice que el cartel lleva a otro negocio** → en Mis piezas (si es
autogestionada) → Cambiar; si es de cliente del panel → `/admin/clientes/<id>`
→ links.

**Cambiar precios o textos de la landing** → editar
`scripts/landing/generar.mjs` → `node scripts/landing/generar.mjs` → rama → PR.

**Actualizar la guía impresa** → `scripts/instructivo/generar.mjs` → regenerar
→ PR.

**Correr una migración** → abrir el SQL Editor de Neon, **limpiar el editor**,
pegar solo el contenido del `.sql`, correr, verificar con un `SELECT`.

**Ver qué pasó en producción** → Vercel → proyecto → Logs / Deployments; fallas
importantes llegan a Slack.

**Volver atrás un deploy roto** → Vercel → Deployments → el anterior sano →
"Promote to Production" (y después arreglar en una rama).

---

## 23. Dónde está cada cosa (mapa de documentos)

| Documento | Qué tiene |
|---|---|
| `docs/MANUAL-METRICSFIELD.md` | **Este manual** |
| `CLAUDE.md` | Reglas del repo (las lee Claude Code automáticamente) |
| `docs/CONTEXTO-Y-PROGRESO.md` | Estado actual del producto, se actualiza con cada cambio |
| `DESIGN.md` | Sistema de diseño de portal y panel |
| `docs/PIEZAS-AUTOGESTION-PLAN.md` | Diseño, riesgos y auditoría de piezas autogestionadas |
| `docs/VENTAS-PITCH-DEMO-PRICING.html` | Pitch, demo, objeciones, alta, pricing |
| `docs/ONBOARDING.html` | Onboarding técnico (algunos números viejos: hoy son 258 tests y sí hay IA opcional) |
| `docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html` | Reglas para contar toques sin trampas |
| `docs/VERIFICACION-OAUTH.md` | Paso a paso de la verificación de Google |
| `docs/AUDITORIA-*.md` | Auditorías de seguridad |
| `docs/PROPUESTA-PIZZERIA-POPULAR-CORPORATIVO.md` | Propuesta RADAR 90 para cadenas |
| `docs/BRIEF-LUIS-SITIO-IMPULSO.html` | Brief del sitio |
| `docs/TAREAS-SEMANA.md` | Tareas por persona (histórico) |
| `.env.example` | Todas las variables, explicadas |
| `db/schema.sql`, `db/migrations/` | Base de datos |
| Rama `desarrollo`: `docs/LOYALTY-*.md` | Loyalty |
| Claude Docs (link que tiene Hernán) | Explicación para el equipo del sistema de "Mis piezas" |
