# Manual del equipo — cómo usar el panel

Este documento es para el equipo interno (no para mostrarle al cliente). Explica
cada pantalla del panel `/admin`: para qué sirve y cómo se usa paso a paso.

Si buscás cómo instalar la plataforma desde cero o cómo vender el portal a un
cliente, eso está en `INSTRUCTIVO.md` (raíz del repo). Este manual es sobre el
día a día operando el panel.

---

## 1 · Entrar al panel

- URL: `tudireccion.vercel.app/admin`
- Pide una sola contraseña (`ADMIN_PASSWORD`), la misma para todo el equipo.
- Arriba a la izquierda queda un menú fijo con tres secciones: **Analytics**,
  **Clientes**, **Reportes**. Para salir, botón **Cerrar sesión** abajo del
  menú.

Cada comercio que cargamos se llama, dentro del sistema, un "cliente".

---

## 2 · Analytics — vista de toda la cartera

`/admin/analytics`

Para qué sirve: ver de un vistazo cómo viene el negocio completo, sin entrar
cliente por cliente. Muestra gráficos con la evolución agregada de reseñas,
ingresos por abonos y venta de NFC de todos los comercios juntos.

Uso: es solo lectura, no hay nada para cargar acá. Entrás cuando querés un
panorama general (por ejemplo, antes de una reunión de revisión mensual).

---

## 3 · Clientes — listado y alta

`/admin/clientes`

Para qué sirve: ver todos los comercios de la cartera, con su estado (activo /
pausado) y su plan (Base / Premium).

### 3.1 · Dar de alta un cliente nuevo

Botón **+ Nuevo cliente** → completar:

| Campo | Qué poner |
|---|---|
| Nombre, rubro, zona | Datos básicos del comercio |
| Plan | Base o Premium (define si tiene Citaciones en IA) |
| Contacto | WhatsApp del dueño, con código de país — se usa para los avisos automáticos |
| Link de reseñas de Google | El link directo a "escribir reseña" de su ficha (ver 3.3) |
| Búsqueda clave | Cómo lo buscaría un cliente real, ej. "barbería en Güemes" — se usa para armar las preguntas del Audit GEO |
| Abono mensual y tono de marca | El tono define cómo suenan las respuestas sugeridas del CRM |

Al crear, el sistema genera solo: la ficha, un código de portal único, y un
primer link NFC llamado "Mostrador".

### 3.2 · Editar un cliente / registrar venta de material NFC

`/admin/clientes/[id]/editar`

Ahí arriba está el mismo formulario de alta, para corregir cualquier dato.

Abajo, **Registrar venta NFC**: cada vez que le vendés un sticker, tarjeta o
standee a un cliente, cargalo acá (formato, fecha, cantidad, precio unitario).
Sirve para llevar registro de cuánto facturaste en hardware, separado del
abono mensual — se ve reflejado en la ficha del cliente y en Analytics.

### 3.3 · Cómo conseguir el link de reseñas de Google

1. Buscá el negocio en Google Maps.
2. En su ficha, "Compartir" → o desde el perfil de empresa del dueño, "Pedir
   reseñas".
3. Tiene esta forma: `https://g.page/r/...../review` o
   `https://search.google.com/local/writereview?placeid=...`.
4. Se pega en el campo "Link de reseñas" del alta/edición.

---

## 4 · Ficha del cliente

`/admin/clientes/[id]`

Es la pantalla principal de cada comercio. De arriba a abajo:

- **Botones de acción**: acceso directo a cada módulo (Links NFC, CRM, SEO,
  GEO, Competencia, Reporte) — se explican abajo, uno por uno.
- **Portal del cliente**: el código de acceso y el link
  `/portal/<codigo>` que le mandás al dueño para que vea su propio progreso
  (solo lectura, aislado del resto de la cartera). Botón **Regenerar código**
  si hay que cortarle el acceso a alguien (por ejemplo, si dejó de pagar).
- **KPIs del mes**: reseñas nuevas, posición en Maps, visitas al perfil,
  llamadas (o citaciones en IA si es Premium) — comparado contra el mes
  anterior.
- **Evolución**: gráficos de reseñas acumuladas y posición en Maps a lo largo
  del tiempo.
- **Detalle mensual**: tabla con todos los meses cargados.

---

## 5 · Links NFC — gestor de carteles

`/admin/clientes/[id]/links`

Para qué sirve: cada cartel físico (mesa, vidriera, mostrador, etc.) es un
"link" independiente, con su propia estadística de cuántas veces lo tocaron.

### Crear un link nuevo
1. **Etiqueta**: dónde va físicamente (ej. "Mesa 4", "Vidriera").
2. **Destino**: a dónde manda el tap. Lo normal es dejar **"Reseña de Google
   (star-gate)"** — usa el link de reseñas cargado en el cliente y aplica el
   filtro de estrellas. También se puede apuntar un link a un menú, Instagram,
   una promoción, o cualquier URL custom.
3. Crear. El sistema te da una URL corta tipo `/t/<id>` — esa es la que se
   programa en la tarjeta NFC (ver 5.2).

### Ver rendimiento
El gráfico de arriba muestra los taps de los últimos 14 días. Cada link
listado abajo muestra su total histórico de taps. Desde "Editar / desactivar"
podés cambiar el destino o desactivar un link sin borrarlo (por ejemplo, si
sacaste un cartel de una mesa).

### 5.2 · Cómo programar el NFC físico
1. Copiá la dirección del link (`tudireccion.vercel.app/t/<id>`).
2. App gratis **NFC Tools** (Android/iPhone).
3. **Escribir → Añadir un registro → URL/URI** → pegar la dirección →
   **Escribir** → apoyar la tarjeta contra el celular.
4. Probar con otro celular antes de entregarlo.

Si el comercio quiere carteles distintos por mesa, se crea un link nuevo por
cada uno.

---

## 6 · CRM de reseñas

`/admin/clientes/[id]/crm`

Tiene tres bloques:

### 6.1 · Feedback privado recibido
Acá aparece automáticamente cada vez que alguien califica 1-3★ en el cartel
NFC y deja un comentario privado (ver sección 9, star-gate). Por cada uno:
- Botón **"Avisar al dueño por WhatsApp"**: abre WhatsApp con un mensaje ya
  armado para reenviarle al dueño del comercio, para que lo resuelva antes de
  que se vuelva un problema público.
- **Cambiar estado / agregar nota**: marcá si sigue "nuevo", pasó a "en
  proceso" o quedó "resuelto", y dejá una nota interna de qué se hizo.

### 6.2 · Cargar reseña
Cuando encontrás una reseña nueva en la ficha de Google del comercio (mirando
manualmente, no hay integración automática), la cargás acá: autor, estrellas,
texto, plataforma y fecha. Así queda todo el historial de reseñas en un solo
lugar, no solo en Google.

### 6.3 · Bandeja de reseñas
Cada reseña cargada tiene una **respuesta sugerida**, generada automáticamente
según el sentimiento (positiva/negativa), el tema del comentario y el tono de
marca que definiste al cargar el cliente. Se puede editar libremente antes de
usarla. Pasos:
1. Leer/ajustar la respuesta sugerida.
2. Copiarla y pegarla como respuesta real en Google (esto se hace a mano,
   fuera del sistema — Google no permite responder por API sin verificación
   business avanzada).
3. Tildar **"Ya publiqué esta respuesta en Google"** y marcar el estado como
   "respondida" (o "escalada" si hay que avisarle algo al dueño, "resuelta"
   cuando se cerró el tema).

---

## 7 · Checklist SEO local

`/admin/clientes/[id]/seo`

Para qué sirve: una lista de verificación de todo lo que debería tener
completo la ficha de Google Business Profile de ese comercio (horarios,
categoría, fotos, descripción, etc.).

Uso: se revisa la ficha real en Google Maps y se van tildando los ítems que ya
están completos. La barra de progreso de arriba muestra el % optimizado. Sirve
como argumento de venta ("te faltan completar 4 de 12 cosas en tu ficha") y
como lista de tareas para el mes.

---

## 8 · Audit GEO — menciones en IA

`/admin/clientes/[id]/geo`

Para qué sirve: medir si ChatGPT, Claude, Perplexity o Gemini recomiendan a
este comercio cuando alguien les pregunta algo relacionado (esto es lo que se
vende como "posicionamiento en IA", distinto del SEO tradicional en Google).

Paso a paso (manual, no hay API automática):
1. **Paso 1**: el sistema arma 2-3 preguntas usando el rubro y la zona del
   comercio (ej. "¿Cuál es la mejor barbería en Güemes, Córdoba?"). Botón para
   copiar cada una.
2. **Paso 2**: abrir un chat gratuito (hay accesos directos a ChatGPT,
   Claude.ai, Perplexity, Gemini) y pegar la pregunta.
3. **Paso 3**: registrar el resultado — qué pregunta usaste, en qué
   plataforma, si apareció mencionado o no, y qué competidores mencionó en su
   lugar (si los hay).

El historial de abajo acumula todas las mediciones, con un contador de
"cuántas de cuántas consultas aparecieron". Se repite una vez al mes por
cliente Premium — es el argumento de venta más fuerte: "hoy la IA no te
nombra, en dos meses sí".

---

## 9 · Monitoreo de competencia

`/admin/clientes/[id]/competencia`

Para qué sirve: comparar al cliente contra 3-5 negocios de la misma zona y
rubro, para poder decirle "estás 2do en tu zona" o "tenés menos reseñas que
tu competencia directa".

Uso:
1. **Agregar competidor**: nombre + rating + total de reseñas (se consigue
   mirando su ficha en Google Maps, 2 minutos por competidor).
2. La tabla de arriba arma un ranking automático, comparando al cliente
   (resaltado) contra todos los competidores cargados, ordenado por rating.
3. **Actualizar cada semana**: mismo formulario, para ir corrigiendo el rating
   y el total de reseñas de cada competidor con el tiempo.

---

## 10 · Cargar métricas del mes

`/admin/clientes/[id]/metricas`

Para qué sirve: es la carga mensual de números que alimenta los KPIs y
gráficos de la ficha del cliente (y del reporte).

Campos: mes, reseñas nuevas, reseñas totales, rating promedio, posición en
Maps (para la búsqueda clave del cliente), visitas al perfil, llamadas, clics
en "cómo llegar". Si el cliente es Premium, además: citaciones en ChatGPT,
Copilot y Perplexity del mes.

Si cargás un mes que ya existe, se reemplaza (no duplica). Abajo hay una tabla
con todos los meses cargados, con opción de eliminar alguno si se cargó mal.

---

## 11 · Reportes mensuales

`/admin/reportes` → elegís un cliente → `/admin/reportes/[id]`

Para qué sirve: genera automáticamente un reporte de 1-2 páginas con las 3
métricas clave del mes y una recomendación concreta para el mes siguiente,
usando los datos ya cargados (no hay que escribir nada a mano).

Uso: abrir el reporte del cliente → botón **Imprimir / Guardar como PDF** del
navegador → mandarlo por WhatsApp. Es lo que justifica el abono mensual frente
al cliente.

---

## 12 · Portal del cliente (lo que ve el dueño del comercio)

`/portal/<codigo>` — no tiene sidebar, es una pantalla aparte, pública para
quien tenga el link pero aislada por comercio.

El dueño ve, solo de su negocio: reseñas y evolución, posición en Maps, taps
del cartel NFC, quejas resueltas (feedback privado), avance del checklist SEO,
y si es Premium, sus citaciones en IA. No ve nada de otros clientes ni puede
editar nada — es de solo lectura.

Si el cliente deja de pagar: ficha del cliente → **Regenerar código**. El link
viejo deja de funcionar al instante, sin tener que borrar ningún dato.

---

## 13 · La página pública del cartel (lo que ve el cliente final)

`/t/<id-del-link>` — esta es la pantalla que se abre al tocar el cartel NFC
con el celular. No requiere login, la ve cualquiera.

### Cómo funciona el star-gate (importante, es la base legal del producto)
1. El cliente final elige de 1 a 5 estrellas.
2. **4-5 estrellas**: va directo a un botón "Publicar en Google" con el link
   de reseñas real del comercio.
3. **1-3 estrellas**: se le ofrece además un formulario de feedback privado
   (texto + WhatsApp opcional) — pero el link para dejar reseña pública en
   Google **sigue visible en la misma pantalla, siempre**. Nunca se le esconde
   el camino público a nadie, ni a los que puntúan mal.

Esto no es un detalle menor: esconder el link público a los que puntúan mal
(“review gating”) viola las políticas de Google y puede terminar en que le
penalicen o borren la ficha al comercio. El sistema está armado para que eso
sea imposible de hacer por accidente.

El formulario de feedback tiene un límite de 5 envíos por IP cada 10 minutos
(anti-spam), y todo lo que se envía aparece automáticamente en el CRM de
reseñas del comercio (sección 6.1).

---

## 14 · Seguridad — qué ya está resuelto

- El panel `/admin` pide contraseña y cada acción de guardado revalida la
  sesión del lado del servidor (no se puede forzar por afuera).
- Los datos de cada cliente están aislados: el portal solo muestra el comercio
  correspondiente a ese código de acceso.
- Los formularios públicos (feedback del cartel) tienen límite de envíos por
  IP para frenar spam.
- Headers de seguridad activos (anti-clickjacking, HTTPS forzado).
- No hay contraseñas ni claves en el código — todo va por variables de entorno
  en Vercel (`DATABASE_URL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_WHATSAPP_NUMBER`).

No compartan el link de portal de un cliente con otro, y no usen una
`ADMIN_PASSWORD` obvia.
