# Loyalty — dónde estamos (15/10/2026)

Este documento es el resumen en limpio de **qué es Loyalty, qué construimos, qué
probamos, qué falta y qué tenés que hacer vos**. Para el diseño completo del
producto (modelo de negocio, antifraude, decisiones) está
`docs/LOYALTY-PRODUCTO-COMPLETO.md`.

## En una frase

El club de beneficios con **Google Wallet** está construido de punta a punta,
revisado por un audit de seguridad y con todos los arreglos hechos, pero
**todavía no está prendido en ningún ambiente**: faltan unos pasos tuyos (base
de datos, variables en Vercel, Google) y una decisión (cómo verificar el
teléfono).

- Código: en el PR #153 hacia `desarrollo`, CI en verde, sin conflictos.
- Producción: no hay nada prendido. Todo está detrás de `LOYALTY_ENABLED` y de un
  interruptor por comercio, así que en producción es código dormido.
- Apple Wallet (iPhone): queda para después, a propósito.

---

## 1. Cómo funciona, desde cada punto de vista

### El cliente final (el que va al local)

1. Toca el cartel NFC o escanea el QR del local (una pieza configurada como
   "Club de beneficios").
2. Cae en `/l/<comercio>`. La primera vez se registra con nombre, celular y
   aceptando el uso de sus datos. Recibe puntos de bienvenida.
3. Se le crea la tarjeta de Google y ve el botón **Guardar en Google Wallet**.
4. Cada vez que vuelve a tocar el cartel suma puntos (máximo una visita cada
   20 horas).
5. Puede ganar más puntos con misiones: opinar en Google, seguir al local en
   redes, o invitar a un amigo nuevo (tope de 20 invitaciones).
6. Cuando le alcanza, pide un canje: se genera un código de 6 letras que vence
   a los 15 minutos. Se lo muestra al cajero.
7. En cualquier momento puede borrar su tarjeta y sus datos de ese local con un
   botón.

### El comercio (portal `/portal/<su código>`)

- Pestaña **Club de beneficios**: valida los códigos de canje en caja (los
  puntos se descuentan recién ahí), ve los socios con su saldo y última visita,
  y las métricas de 30 días (visitas, canjes, cuántos tocaron "Guardar en
  Google Wallet").
- El comercio **no** configura el club: lo arma el equipo (para el piloto).

### El equipo (panel `/admin`)

- `/admin/clientes/<id>/loyalty`: prender el club de un comercio, fijar puntos
  de bienvenida y por visita, crear beneficios y misiones. Al guardar, se crea
  o actualiza la clase de Google Wallet con el nombre y el logo del comercio.
- Links NFC/QR: destino nuevo **Club de beneficios**.
- **Liberar un teléfono**: si alguien registró un número que no era suyo, el
  equipo lo busca, ve de quién es la tarjeta y, confirmando, la borra para que
  el dueño real se pueda registrar (queda en la auditoría).
- `/admin/wallet-prueba`: página de diagnóstico de Google Wallet.

---

## 2. Qué construimos

| Pieza | Qué incluye | Estado |
|---|---|---|
| Base de datos | 9 tablas nuevas (socios, tarjetas, puntos, canjes, misiones, consentimientos, eventos…) + columnas nuevas | Hecho. **Falta correrlo en Neon** |
| Registro y tarjeta | Alta con consentimiento versionado (Ley 25.326), puntos de bienvenida, tarjeta de Google al instante | Hecho |
| Visitas | Solo suma un tap real del cartel (token firmado de 15 min) y máximo 1 cada 20 h, controlado en la base | Hecho |
| Misiones | Opinar en Google (premia opinar, nunca la calificación), seguir en redes, referidos | Hecho |
| Canje | Código de 6 letras, vence a los 15 min, se valida en el portal del local | Hecho |
| Panel de admin | Configuración del club, beneficios, misiones, liberar teléfonos | Hecho |
| Portal del comercio | Pestaña con socios, métricas y validación de canjes | Hecho |
| Google Wallet | Clase y tarjetas, saldo que se actualiza solo, logo 660×660 del comercio | Hecho y **probado con una tarjeta real en un Android** |
| Privacidad | Sección "Club de beneficios" en `/privacy#loyalty`, baja con un botón | Hecho. **Falta revisión legal** |
| Pruebas | 133 tests automáticos + 64 casos cruzados contra la app real (preview) y 61 (producción) | Hecho |
| Apple Wallet | El código del pase `.pkpass` está; falta la cuenta de Apple Developer | Pendiente a propósito |

### Reglas que quedaron fijas

- **La base propia es la verdad.** Google Wallet es una copia. Si Google falla,
  los puntos no se pierden: la tarjeta se marca con error y se vuelve a intentar
  cuando el cliente abre su página.
- **Sin desvío de reseñas.** La misión "opinar en Google" manda a todos al mismo
  link público; nunca filtra por calificación.
- **El teléfono no es una contraseña.** Registrar un número que ya existe no te
  da la tarjeta de esa persona (ver sección 5).

---

## 3. Qué probamos y qué no

**Probado**
- Alta completa en un navegador real: formulario → tarjeta con 100 puntos →
  código de canje.
- Una tarjeta real de Google Wallet creada y guardada en un Android de prueba.
- Que un comercio no pueda tocar los canjes, misiones ni socios de otro; que un
  doble canje descuente una sola vez; que un código vencido no sirva; que sumar
  sin tocar el cartel no funcione.
- Dos auditorías de seguridad y las re-verificaciones de los arreglos.

**No probado todavía**
- Nada de esto corrió en producción ni con datos reales.
- iPhone (no hay Apple Wallet todavía; el cliente en iPhone igual ve su tarjeta
  web con los puntos).
- Un comercio real usándolo en caja.
- Google Wallet con clientes que no sean cuentas de prueba (hace falta el acceso
  de publicación, ver sección 6).

---

## 4. Seguridad: hasta dónde llegó el audit

Corrimos de nuevo la skill de Cloudflare (perfil rápido) sobre todo el código,
incluido Loyalty. Todo en un sandbox sin red y con datos ficticios.

- **Resultado:** 6 problemas confirmados (todos de severidad baja), 2 pistas
  que dependen de datos de producción y 1 hueco de cobertura (Loyalty con un
  comercio pausado o dado de baja). Los 3 problemas serios del primer audit ya
  estaban resueltos.
- **Arreglado:** gasto doble de puntos al canjear; carteles reclamables después
  de borrar un cliente; tope de competidores salteable; consultas repetidas y
  pagas a Google; nombre del reseñador publicado en respuestas automáticas;
  tope de intentos del PIN por cartel; cuentas demo de solo lectura en
  producción; ciclo de vida de Loyalty (pausado/baja); varios endurecimientos
  chicos.
- **Cada arreglo tiene una prueba** que falla con el código viejo y pasa con el
  nuevo.
- **Riesgos aceptados:** el link dentro de la tarjeta de Wallet no vence (si
  vence, se rompen los pases ya emitidos); quien se da de baja y se re-registra
  cobra de nuevo los puntos de bienvenida.
- **No cerrado:** el teléfono sin verificar (sección 5).
- El audit fue **rápido**: no garantiza que el resto del sistema esté limpio.

---

## 5. La decisión pendiente: verificar el teléfono

### El problema

Hoy el teléfono es lo que identifica a cada cliente, pero **nadie comprueba que
el número sea suyo**. Si el sistema te dejara "entrar" solo escribiendo el
número, cualquiera podría escribir el de otra persona y ver su tarjeta, sus
puntos y pedir canjes. Por eso, cuando alguien escribe un número que ya tiene
tarjeta, el sistema **no lo deja entrar**: le dice que abra su tarjeta desde
Google Wallet.

Consecuencias:
- Alguien podría registrar el número de otro y dejarlo afuera (hoy lo resuelve
  el equipo desde el panel, a mano).
- Si un cliente cambia de celular o borra los datos del navegador y **no
  guardó la tarjeta en Wallet**, no tiene forma de volver a entrar.

### Dónde exactamente se verificaría

En **dos puntos** del cliente final, siempre en `/l/<comercio>`:

1. **Al registrarse:** después de escribir nombre y celular, antes de crear la
   tarjeta, el cliente recibe un código y lo escribe. Recién ahí se crea.
2. **Al "volver a entrar":** botón "Ya tengo tarjeta" → escribe su celular →
   recibe un código → escribe el código → queda adentro (sesión de 1 año).

Con eso, tu idea ("si ya estás registrado, simplemente hacés login") queda
resuelta bien: nadie entra a una tarjeta sin demostrar que controla ese número.

### Opciones

| Opción | Cómo funciona | Costo | Contras |
|---|---|---|---|
| **A. Código por WhatsApp** | Mandamos un código de 6 dígitos al WhatsApp | Paga por mensaje, hay que contratar un proveedor (WhatsApp Business o similar) y aprobar la plantilla | Setup y costo recurrente. Es lo más natural en Argentina y deja el número **verificado** para promos |
| **B. Código por SMS** | Igual, por SMS | Paga por mensaje (proveedor tipo Twilio) | Más caro y con peor entrega que WhatsApp |
| **C. Entrar con Google** | "Ya tengo tarjeta → Entrar con Google" | Gratis, usamos el login de Google que ya tenemos | La identidad pasa a ser la cuenta de Google; el teléfono queda como dato de contacto **sin verificar** |
| **D. Link por email** | Mandamos un link al email | Gratis con el SMTP que ya existe | Hay que volver el email obligatorio; en el mostrador es más lento |

**Mi recomendación:** para el piloto con 2 o 3 comercios, lo de hoy alcanza
(recuperar con el link de la tarjeta de Wallet + que el equipo libere un
teléfono). Para lanzar de verdad, **A (WhatsApp)** si querés números
verificados para mandar promos, o **C (Google)** si preferís cero costo.
Decime cuál y lo construyo.

---

## 6. Lo que falta — tu lista, paso a paso

Orden sugerido. Los pasos 1 a 4 te dejan probar todo en Preview sin tocar
producción.

### Paso 1 — Base de datos (Neon)

Los cambios de esquema no se aplican solos: hay que correrlos a mano. Las dos
migraciones **solo agregan cosas** (no borran nada) y se pueden correr dos veces
sin problema.

1. Entrá a `console.neon.tech` → proyecto de MetricsField → **SQL Editor**.
   Fijate en qué *branch* de Neon estás: tiene que ser el que usa tu ambiente.
2. Primero chequeá qué falta. Pegá esto y ejecutá:
   ```sql
   SELECT to_regclass('public.programas_loyalty') AS tabla_012,
          (SELECT count(*) FROM information_schema.columns
            WHERE table_name = 'programas_loyalty'
              AND column_name = 'puntos_por_visita') AS col_016;
   ```
   - `tabla_012` vacío (null) → falta la migración 012.
   - `col_016` en 0 → falta la migración 016.
3. En GitHub, rama `claude/repo-context-hi4dov`, abrí
   `db/migrations/012_loyalty_fundaciones.sql`, copiá **todo** el contenido,
   pegalo en el SQL Editor y ejecutá. Después hacé lo mismo con
   `db/migrations/016_loyalty_google.sql` (siempre en ese orden).
4. Si Preview y Producción usan **bases distintas**, repetí en la otra. Para
   saberlo: Vercel → Settings → Environment Variables → `DATABASE_URL` y mirá si
   tiene Production y Preview tildados en la misma variable (no hace falta abrir
   el valor).

### Paso 2 — Dos consultas de solo lectura (producción)

En el mismo SQL Editor, sobre la base de **producción**:

1. **Códigos de portal publicados en el repo.** Ejecutá:
   ```sql
   SELECT id, codigo_acceso, estado FROM comercios
   WHERE codigo_acceso IN ('demo2026','demo2026-g','demo2026-c','bg7k2m4p',
     'rn9x3c5v','cg2h8j6l','ta5q1w9e','vc4r7t2y','gg8u3i6o','en1a5s9d');
   ```
   - Sin filas: perfecto, no hay nada que hacer.
   - Con filas que son **cuentas de ejemplo**: en el panel, abrí el cliente →
     botón **Regenerar código** (o pasalo a estado "baja"). Excepción:
     `demo2026` es el que muestra la landing; ese dejalo, ahora es de solo
     lectura en producción.
   - Con filas que son **clientes reales** (si algún seed se usó de verdad):
     regenerá el código y mandales el link nuevo.
2. **Carteles huérfanos.** Abrí `db/consultas/links-huerfanos.sql`, copiá el
   `SELECT` y ejecutalo. Si sale algo, pasame la lista y lo revisamos antes de
   tocar nada (no borres nada en masa).

### Paso 3 — Variables en Vercel

`vercel.com` → proyecto **metricsfield** → **Settings** → **Environment
Variables**.

1. **Revisá que existan en Production** (solo que estén; no hace falta ver el
   valor): `LOYALTY_PII_KEY`, `LOYALTY_IP_PEPPER`, `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_BASE_URL`, `TOKEN_ENCRYPTION_KEY`.
   - Si falta `LOYALTY_PII_KEY` o `LOYALTY_IP_PEPPER`, generá cada una con
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
     y cargala. **Sin la primera, Loyalty no abre** (falla cerrado a propósito);
     sin la segunda, en producción no se guarda la IP.
2. **Para probar en Preview:**
   - Editá `LOYALTY_PII_KEY` y `LOYALTY_IP_PEPPER` y tildá también **Preview**.
   - Creá `LOYALTY_ENABLED` con valor `true`, tildando **solo Preview**.
   - Las tres `GOOGLE_WALLET_*` ya están en Preview.
   - Asegurate de que `NEXT_PUBLIC_BASE_URL` **no** esté tildada en Preview: si
     lo está, los links dentro de la tarjeta apuntan a `app.metricsfield.com`,
     donde Loyalty está apagado.
3. Volvé a desplegar el Preview: **Deployments** → el último de la rama →
   **⋯** → **Redeploy**.

### Paso 4 — Probarlo en Preview (unos 15 minutos)

1. Abrí la preview de la rama (el link "Preview" que deja Vercel en el PR #153)
   y entrá a `/admin` con la contraseña compartida.
2. Elegí un cliente de prueba → **Club de beneficios** → tildá el club, poné 100
   de bienvenida y 10 por visita, marcá "activo" → **Guardar**. Debe decir que la
   tarjeta de Google quedó actualizada.
3. Agregá un beneficio ("Café — 50 puntos") y una misión ("Opinar en Google — 20").
4. En **Links NFC/QR** creá o editá un link del cliente con destino **Club de
   beneficios**.
5. Desde tu Android (tu cuenta ya está como cuenta de prueba en la consola de
   Wallet), abrí `/t/<ese-link>`: registrate, guardá la tarjeta en Wallet.
6. Pedí un canje en la tarjeta, copiá el código de 6 letras, entrá al portal de
   ese cliente (`/portal/<su código>`) → pestaña **Club de beneficios** → validá.
   Los puntos tienen que bajar, también en la tarjeta del celular.
7. Probá "Borrar mi tarjeta y mis datos" al final de la tarjeta web.

Nota: la preview está protegida por Vercel, por eso Google no puede leer el logo
ahí y se usa el ícono de MetricsField. En producción se usa el logo del comercio.

### Paso 5 — Google Wallet para clientes reales

Hoy Wallet está en **modo demo**: solo las cuentas de prueba pueden guardar
tarjetas. En `pay.google.com/business/console` → **Google Wallet API**:

1. Completá el **Perfil de Negocio** (razón social, dirección, sitio).
2. Pedí el **acceso de publicación**. Google revisa cómo se ve la tarjeta y
   tarda unos días. (Los nombres exactos de los botones pueden variar.)
3. Mientras tanto, agregá como cuentas de prueba los mails de los dueños de los
   comercios piloto para que puedan probar.
4. Cuando lo aprueben y quieras lanzar: cargá las tres `GOOGLE_WALLET_*` también
   en Production y poné `LOYALTY_ENABLED=true` en Production.

### Paso 6 — Legal

Que alguien con criterio legal revise el texto de `/privacy#loyalty` y el
consentimiento del registro (Ley 25.326, leyenda de la AAIP).

### Paso 7 — Piloto

Elegir 2 o 3 comercios, cargarles logo, beneficios y misiones, y verlos usar el
club en caja. Es lo más importante de todo y no es de código: confirmar que un
dueño real diga "esto lo necesito".

### Paso 8 — Mergear

Cuando el Paso 4 salga bien: mergear el PR #153 a `desarrollo`. A `main` solo
cuando esté todo lo de arriba (migraciones en la base de producción incluidas).

---

## 7. Lo que falta — de código

| Qué | Por qué importa | Depende de |
|---|---|---|
| Verificación del teléfono / "login de nuevo" | Cierra el último problema de seguridad y el caso "cambié de celular" | Tu decisión (sección 5) |
| Apple Wallet (iPhone) | Sin esto, los iPhone no tienen tarjeta en Wallet | Cuenta Apple Developer (~99 USD/año) |
| Actualización automática del pase de Apple | El pase de Apple muestra el saldo del momento | Apple Wallet primero |
| Vencimiento / rotación del link de la tarjeta | Hoy no vence | Decisión: hay compromiso con los pases ya emitidos |
| Antifraude nivel 2 (ubicación, etc.) | Solo si el fraude aparece como problema medido | Datos del piloto |
| Modo offline en caja | Solo si algún comercio tiene mala conexión | Qué comercios se elijan |
| Configuración del club desde el portal | Hoy la hace el equipo | Si los comercios lo piden |

---

## 8. Dónde está cada cosa en el código

- Landing del cliente final y sus acciones: `app/(loyalty)/l/[codigo]/`
- Base de datos de Loyalty: `lib/db/loyalty.ts`
- Orquestación con Google Wallet: `lib/loyalty.ts`, `lib/wallet/google.ts`
- Credenciales del cliente final (cookie, tokens): `lib/loyalty-firma.ts`
- Panel de admin: `app/admin/clientes/[id]/loyalty/page.tsx` y las acciones
  `accion…Loyalty` en `app/actions.ts`
- Portal del comercio: `app/portal/[codigo]/_components/PanelLoyalty.tsx` y
  `app/portal/actions.ts`
- Migraciones: `db/migrations/012_loyalty_fundaciones.sql`,
  `016_loyalty_google.sql`
- Pruebas: `test/loyalty-*.test.ts`, `scripts/prueba-permisos.mjs`
- Reporte del audit: en el scratchpad de la sesión,
  `security-audit/MetricsField/run-2/REPORT.md`
