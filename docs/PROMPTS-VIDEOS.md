# Prompts de video por vertical — MetricsField

Un video por producto, con la misma estructura: **el dolor → el gesto físico →
lo que ve el dueño en el panel → el cierre**. Pensados para Instagram/Reels y
para la landing.

## Cómo usarlos (importante)

- **Formato:** vertical 9:16, 20–30 segundos, 4 o 5 tomas de 4–6 s cada una.
- **Las IA de video (Veo/Gemini, Sora, Kling, Higgsfield) no escriben bien
  textos ni pantallas.** Usalas para las **tomas físicas** (el local, la mano,
  el celular, el cartel). Las pantallas del panel y de Google van como
  **grabación de pantalla real** (o la captura de la landing) montada encima
  en la edición (CapCut). En los prompts eso está marcado como
  `[INSERTO: grabación real]`.
- **Generá cada toma por separado** con su prompt corto, y después montalas.
  Si la herramienta acepta imagen de referencia, pasale la foto del cartel o
  del local (`fotos/productos/`) para que el producto se parezca al real.
- **Textos en pantalla y voz en off** se agregan en la edición, en Montserrat
  blanca o negra, frases cortas. Voz: rioplatense, cercana, sin acento neutro.
- **Música:** tema en tendencia de Instagram del momento, instrumental o con
  la voz bajada.
- **Cierre siempre igual:** logo de MetricsField (hexágonos) + "Comentá
  DEMO" + `metricsfield.com/<producto>`.
- **Reglas que no se rompen:** nunca mostrar que se filtra por estrellas ni
  que se regala algo a cambio de la reseña. Todos los números en pantalla son
  "de ejemplo" salvo que sean de un cliente con permiso.

Estilo visual común para pegar al final de cada prompt:

> Estilo: cinematográfico realista, luz cálida de local real en Córdoba,
> Argentina, cámara en mano suave, profundidad de campo baja, colores
> naturales, sin texto en pantalla, sin logos de marcas reales, vertical 9:16.

---

## 1. MetricsField Reviews — "Un toque y te dejan la reseña"

**Idea:** el cliente se va contento pero nunca deja reseña. Con el cartel, en
el momento justo, lo hace en 10 segundos. El dueño lo ve en el panel.

| Toma | Prompt para la IA (o inserto) | Texto en pantalla | Voz en off |
|---|---|---|---|
| 1 · Dolor (4 s) | Un dueño de café de barrio, 40 años, mira el celular detrás del mostrador con cara de preocupación mientras el local tiene clientes contentos tomando café. Primer plano del dueño, fondo desenfocado con gente sonriendo. | "Tus clientes salen contentos…" | "Tus clientes salen contentos… pero no te dejan reseña." |
| 2 · Gesto (5 s) | Primer plano de una mano que acerca un celular a un pequeño cartel acrílico de mostrador con el texto "Dejanos tu reseña en Google" y un código QR; el celular se ilumina al tocarlo. Mostrador de madera de un café, taza de café al costado. | "Un toque" | "Con MetricsField, acercan el celular al cartel…" |
| 3 · Reseña (5 s) | `[INSERTO: grabación real del celular abriendo la ventana de reseña de Google y tocando 5 estrellas]` | "Directo a Google, sin apps" | "…y se abre Google para dejar la reseña. Sin apps, igual para todos." |
| 4 · Panel (6 s) | `[INSERTO: grabación del panel/portal: toques del día, reseña nueva, respuesta sugerida]`. Opcional para la IA: el dueño sonríe mirando una tablet en el mostrador. | "Y vos lo ves todo en tu panel" | "Y vos ves cuántos tocaron, qué reseñas llegaron y qué responder." |
| 5 · Cierre (4 s) | Plano general del café lleno, el cartel en el mostrador en primer plano, foco suave. | Logo + "Comentá DEMO" · metricsfield.com/reviews | "MetricsField Reviews. Comentá DEMO y te lo mostramos." |

**Variante con mozo** (para restaurantes): reemplazá la toma 2 por: *Un mozo
sonriente le acerca una tarjeta de PVC al cliente al cerrar la cuenta; el
cliente apoya el celular en la tarjeta. Restaurante con luz cálida de noche.*

---

## 2. MetricsField Retail — "Vendiste. ¿Cuánto ganaste?"

**Idea:** vender en Mercado Libre se siente bien, pero entre comisión, envío,
publicidad e impuestos no sabés cuánto queda. Retail lo desarma venta por
venta.

| Toma | Prompt para la IA (o inserto) | Texto en pantalla | Voz en off |
|---|---|---|---|
| 1 · Dolor (5 s) | Una emprendedora de 30 años en su depósito casero lleno de cajas, embala un paquete y suena una notificación en el celular; sonríe al verla. Luz de tarde por la ventana. | "¡Nueva venta!" | "Vendiste en Mercado Libre. ¡Bien!" |
| 2 · Duda (4 s) | La misma emprendedora, sentada con una calculadora y un cuaderno con números tachados, cara de duda, de noche con una lámpara. | "¿Cuánto te quedó?" | "Pero… ¿cuánto te quedó de verdad?" |
| 3 · Desarme (6 s) | `[INSERTO: la cascada de la landing (metricsfield.com/retail): precio → comisión → envío → publicidad → impuestos → costo → ganancia real]` | "Comisión, envío, publicidad, impuestos, costo" | "Retail se conecta a tu cuenta y te muestra todo lo que se va en cada venta." |
| 4 · Decisión (5 s) | La emprendedora mira la notebook, asiente y cambia el precio de un producto; se la ve aliviada. Escritorio ordenado, cajas al fondo. | "Tu ganancia real, producto por producto" | "Ves tu margen real y decidís qué subir, qué pausar y qué dejar de vender." |
| 5 · Cierre (4 s) | Plano de cajas listas para despachar con la notebook abierta al lado, foco suave. | Logo + "Prueba gratis 30 días" · metricsfield.com/retail | "MetricsField Retail. Probalo gratis 30 días." |

---

## 3. MetricsField Loyalty — "Que vuelvan"

**Idea:** un cliente nuevo cuesta mucho más que uno que vuelve. Con un toque
se suma al club y lleva la tarjeta en el celular (Google Wallet). Está en
piloto: el cierre invita a ser comercio piloto.

| Toma | Prompt para la IA (o inserto) | Texto en pantalla | Voz en off |
|---|---|---|---|
| 1 · Dolor (4 s) | La puerta de una heladería de barrio: entran y salen personas distintas; el dueño mira desde atrás del mostrador sin reconocer a nadie. | "¿Quién volvió esta semana?" | "Cada día entra gente… ¿pero quién vuelve?" |
| 2 · Gesto (5 s) | Primer plano de una clienta que acerca el celular a un sticker NFC en el mostrador de la heladería; sonríe. | "Un toque y se suma al club" | "Con un toque, tu cliente se suma al club…" |
| 3 · Tarjeta (5 s) | `[INSERTO: la tarjeta del club en Google Wallet con los sellos (escena de la landing metricsfield.com/loyalty)]` | "La tarjeta, en su celular" | "…y lleva la tarjeta en el celular: cada visita suma un sello." |
| 4 · Canje (5 s) | La misma clienta, otro día, muestra el celular al heladero, que le entrega un cucurucho de regalo; los dos sonríen. | "Canjea en el mostrador" | "Cuando completa la tarjeta, canjea su beneficio en el mostrador." |
| 5 · Cierre (4 s) | Heladería llena a la tarde, foco suave en el sticker del mostrador. | Logo + "Buscamos comercios piloto" · metricsfield.com/loyalty | "MetricsField Loyalty. Buscamos comercios piloto en Córdoba: escribinos." |

---

## 4. MetricsField Intel — "Decidí con números" (opcional)

Más corto (15 s), para contenido educativo.

| Toma | Prompt para la IA (o inserto) | Texto en pantalla | Voz en off |
|---|---|---|---|
| 1 (5 s) | El dueño de una pizzería mira su ficha de Google en el celular: 4,3 estrellas; se rasca la cabeza. | "¿Cuántas reseñas me faltan para 4,7?" | "¿Cuántas reseñas de 5 estrellas te faltan para llegar a 4,7?" |
| 2 (6 s) | `[INSERTO: la calculadora de metricsfield.com/herramientas con 4,3 / 120 reseñas → resultado]` | "Calculalo gratis" | "Calculalo gratis, sin registrarte." |
| 3 (4 s) | Logo + metricsfield.com/herramientas | "Gratis · sin registrarte" | "MetricsField Intel." |

---

## Video de marca (opcional, 20 s) — "Una marca, varias soluciones"

Para la bio o la home. Tres tomas rápidas, una por producto (el toque al
cartel en el café, la notificación de venta en el depósito, el sello en la
heladería), y cierre con el logo y la frase: **"MetricsField. Medimos lo que
pasa en tu negocio para que decidas mejor."**

---

## Copy para la descripción de cada post (con llamado a la acción)

> **Reviews:** Tus clientes salen contentos pero no te dejan reseña. 😅 Con
> MetricsField acercan el celular al cartel y en 10 segundos están en Google.
> Vos ves todo en tu panel. 👉 Comentá **DEMO** y te lo mostramos en tu local.
> 📲 ¿Conocés a alguien con un local? Mandáselo. 📍 Córdoba, Argentina

> **Retail:** Vendiste en Mercado Libre… ¿pero cuánto ganaste de verdad?
> Retail te muestra comisión, envío, publicidad, impuestos y costo, venta por
> venta. 👉 Comentá **RETAIL** y te pasamos la prueba gratis de 30 días.

> **Loyalty:** ¿Sabés quién vuelve a tu local? Con un toque tus clientes se
> suman al club y llevan la tarjeta en el celular. 👉 Buscamos comercios
> piloto en Córdoba: comentá **CLUB**.
