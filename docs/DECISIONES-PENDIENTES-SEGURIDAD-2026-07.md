# Decisiones de seguridad pendientes — julio 2026

Salen de la auditoría `gstack /cso --comprehensive` corrida sobre el repo. El
resto de los hallazgos de esa auditoría ya se arreglaron directo (ver commits
`4aa449c` y `66f2cf3` en `Development`). Estos dos quedaron afuera a propósito
porque son decisiones de diseño, no un fix mecánico — se documentan acá para
que el dev elija la opción óptima, no para que se implementen tal cual.

---

## 1. Piezas de hardware autogestionado: sin prueba de compra

### El problema

Canal: venta de hardware NFC/QR por Mercado Libre, sin cuenta ni portal
detrás — el comprador activa su propia pieza escaneándola por primera vez
(`/t/<slug>`), eligiendo un nombre de negocio, una URL de destino y un PIN
propio (`lib/db.ts`, `activarAutogestion()`).

Dos hechos combinados generan el hueco:

1. **Los slugs son correlativos y predecibles**: `p-0001`, `p-0002`, `p-0003`...
   Se generan en lote, ANTES de saber a qué comprador le va a tocar cada
   pieza (`lib/db.ts`, generador de inventario de hardware).
2. **La activación no prueba nada más que "la pieza está libre"**: la
   condición es `comercio_id IS NULL AND autogestionado = FALSE` — no hay
   ningún secreto, código de por medio, ni verificación de que quien activa
   es quien compró físicamente esa pieza. Es "el primero que llega, gana".

### Escenario de explotación

1. El equipo genera un lote de 50 piezas (`p-0101` a `p-0150`) y las manda a
   imprimir/programar antes de que estén todas vendidas.
2. Entre que se genera el lote y que el comprador real recibe su pieza por
   Mercado Libre (días), cualquiera que conozca o adivine el patrón de slugs
   puede visitar `/t/p-0102` y activarla primero: pone su propia URL de
   destino (ej. una página de phishing que imita la de reseñas de Google) y
   un PIN que solo él conoce.
3. Cuando el comprador legítimo recibe y escanea su cartel, ya está
   activado por otra persona. No tiene forma de recuperarlo: no sabe el PIN,
   y **hoy no existe ni una función de admin para "liberar" una pieza
   hijackeada** (`editarAutogestion()` exige el PIN correcto, sin excepción).
4. Mientras tanto, cada cliente real que escanee ese cartel (es la función
   completa del producto: dirigir tráfico del mostrador a una URL) termina
   en la página que eligió el atacante, no en la reseña de Google — daño
   reputacional para el comprador y para MetricsField.

### Opción A — Slug no adivinable en vez de correlativo

Separar "identificador legible para logística interna" ("Pieza #47, lote
julio") de "slug público en la URL" — el slug que va en el QR/NFC pasa a ser
un string aleatorio de alta entropía (ej. 10-12 caracteres, `nanoid`), sin
relación visible con el anterior o el siguiente.

- ✅ Cambio más chico: no toca el flujo de activación en sí, sigue siendo
  "quien tiene la pieza física en la mano puede activarla" (coherente con
  vender sin cuenta ni portal).
- ❌ Piezas YA generadas/impresas con slug correlativo quedan igual de
  expuestas — solo protege lotes nuevos. Hay que decidir qué hacer con el
  inventario actual (¿reimprimir? ¿conviven los dos esquemas?).

### Opción B — Código de activación separado del slug de tap

El QR/NFC público sigue yendo a `/t/p-0001` (slug legible, sirve para
soporte/logística), pero activar la pieza exige además un código secreto
impreso aparte — por ejemplo un sticker raspable, o un código que solo
aparece en el packaging/factura que recibe el comprador, no en el cartel
expuesto al público.

- ✅ Separa "quién puede escanear el cartel" (siempre público) de "quién
  puede activarlo" (solo quien tuvo el packaging en mano) — mismo patrón que
  usan routers/dispositivos IoT para su primera configuración.
- ❌ Más fricción operativa: hay que generar, imprimir y trackear un segundo
  código por pieza, coordinar con el proveedor de impresión, y asumir el
  riesgo de que el comprador pierda ese código y quede bloqueado.

### Opción C — Reserva ligada a la venta

Al vender una pieza puntual (hoy manual vía Mercado Libre), el admin la
marca como reservada para ese comprador antes de despacharla, y
`activarAutogestion()` deja de estar abierta para cualquier pieza "libre" en
general — solo se habilita pieza por pieza cuando el equipo la libera.

- ✅ No toca nada del esquema de URLs/slugs — resuelve el problema en el
  proceso operativo, no en el código.
- ❌ Agrega trabajo manual por cada venta (no escala tan bien si crece el
  volumen), y depende de que el equipo no se olvide de liberar la pieza
  antes de despachar — nuevo punto de fallo humano.

### Nota aparte, independiente de qué opción se elija

Hoy no existe ningún camino de recuperación si una pieza queda hijackeada
(ni con el PIN correcto — porque el legítimo no lo tiene — ni por admin).
Conviene sumar una función de admin para resetear una pieza a estado libre
(`autogestionado`, `pin_hash`, `pin_salt`, `nombre_negocio`, `url_destino`)
sin importar cuál de las tres opciones de arriba se elija — es barata, no
rompe nada existente, y da un plan B mientras se decide el resto.

---

## 2. `google_refresh_token` en texto plano

### El problema

Cada cliente conecta su propia cuenta de Google Business Profile desde su
portal (`/portal/[codigo]` → "Conectar tu Google Business Profile"). El
refresh token que devuelve el flujo OAuth se guarda tal cual en
`comercios.google_refresh_token` (columna `TEXT`, sin cifrar —
`db/schema.sql`). Con ese token el backend pide un access token nuevo
cuando lo necesita (así corre el sync diario, `lib/db.ts`,
`accessTokenGBPComercio()`) — quien tenga el refresh token tiene acceso de
lectura continuo a esa cuenta de Google hasta que el dueño lo revoque a
mano desde su propia cuenta de Google.

### Por qué ahora es más urgente que antes

No es un hallazgo nuevo (ya estaba en la auditoría zero-trust de julio), pero
el radio de exposición crece con cada cliente real que conecta su cuenta:
si la base se filtra alguna vez (backup expuesto, credencial de Neon
comprometida, error humano), no se filtra un token — se filtran los de
**toda la cartera** de una sola vez.

### Opción A — Cifrado simétrico a nivel de aplicación (AES-256-GCM)

Cifrar el token con una clave separada (ej. `TOKEN_ENCRYPTION_KEY`, distinta
de `DATABASE_URL`) antes de guardarlo, descifrar al leerlo.

- ✅ La más simple de implementar, sin infraestructura nueva. Cubre el
  escenario más realista: se filtra la base pero no las variables de
  entorno del servidor (son sistemas separados: Neon vs. Vercel).
- ❌ Si se compromete el SERVIDOR (no solo la base), la clave y los tokens
  cifrados quedan expuestos juntos — no protege ese escenario más severo.
  Rotar la clave exige re-cifrar todos los tokens existentes.

### Opción B — Secret manager externo, la base solo guarda una referencia

El token vive en un servicio separado (AWS Secrets Manager, Google Secret
Manager, Doppler — Neon/Vercel no traen uno nativo) con su propio control
de acceso y rotación; la base de datos solo guarda un ID de referencia.

- ✅ La protección más fuerte — separa "qué datos tengo" de "cómo accedo a
  ellos" en sistemas distintos. Estándar de industria para credenciales de
  terceros.
- ❌ La más cara de implementar y operar: nueva dependencia externa, nuevo
  punto de fallo (¿qué pasa si el secret manager está caído justo cuando
  corre el cron de sync?). Para el volumen actual de clientes, probablemente
  sobre-ingeniería.

### Opción C — Reducir el radio de daño, no el hallazgo en sí

No resuelve "está en texto plano", pero limita cuánto importa: confirmar que
el scope de OAuth pedido es el mínimo (solo lectura de Performance, nunca
escritura), y sumar una revisión (manual o cron) que detecte tokens sin
actividad hace mucho tiempo y los invalide proactivamente.

- ✅ Barata, complementa cualquiera de las otras dos opciones, reduce el
  daño incluso si la base llega a filtrarse.
- ❌ No cierra el hallazgo por sí sola — es una mitigación adicional, el dev
  probablemente la va a querer sumar a A o B, no usarla como reemplazo.

---

## Para el dev, en una línea

- **Hardware (#1):** A (slug aleatorio) es el cambio más chico y ataca la
  causa real; sumar el escape hatch de admin pase lo que pase, es gratis y
  falta hoy.
- **Refresh token (#2):** A (cifrado de aplicación) es proporcional al
  tamaño actual del equipo/infra; B queda para reconsiderar solo si la
  cartera crece mucho y hace falta ese nivel de garantía frente a clientes
  grandes; C conviene sumarla en paralelo a cualquiera de las dos, es casi
  gratis.
