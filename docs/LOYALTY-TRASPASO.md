# Loyalty — traspaso a una ventana nueva (15/10/2026)

**Para qué sirve este archivo.** Si abrís una sesión nueva (otra ventana de
Claude Code, Cursor, Codex…) para trabajar **solo en Loyalty**, empezá por acá.
Dice en qué situación real está todo hoy, qué falta, qué decisión es tuya y cómo
trabajar con vos. No explica el código: eso está en
`docs/LOYALTY-PARA-AGENTES.md`.

**Orden de lectura para una sesión nueva:**

1. Este archivo (la situación y qué hacer).
2. `CLAUDE.md` de la raíz (reglas de todo el repo).
3. `docs/LOYALTY-PARA-AGENTES.md` (el código: qué no romper y por qué).
4. `docs/LOYALTY-ESTADO.md` (cómo se ve el producto y la lista de pasos manuales).
5. `docs/LOYALTY-PRODUCTO-COMPLETO.md` (producto y modelo de negocio, solo si hace falta).

> Fecha de verdad de este archivo: **15/10/2026**. Si pasó tiempo, verificá el
> estado con `git log origin/desarrollo` y en GitHub antes de darlo por cierto.

---

## Prompt para pegar en la ventana nueva

```text
Vas a trabajar SOLO en el módulo Loyalty (Club de beneficios con Google
Wallet) de MetricsField. Es un repo en español: respondé y commiteá en español.

Antes de hacer nada, leé en este orden: docs/LOYALTY-TRASPASO.md, CLAUDE.md,
docs/LOYALTY-PARA-AGENTES.md y docs/LOYALTY-ESTADO.md. El primero te dice en
qué situación está todo hoy y qué falta; el tercero, qué reglas del código no
se rompen.

Reglas duras: rama propia y PR (nunca push directo a main ni a desarrollo);
los cambios de esquema van como .sql nuevo en db/migrations/ para que yo los
corra a mano en Neon (vos no tenés acceso); ningún DELETE/DROP masivo sin
avisarme; nunca saques prepare:false de lib/sql.ts; no borres un test para que
pase un cambio; no me pidas que te pegue secretos ni claves.

Soy dueño del producto, no desarrollador: cuando me pidas algo en Neon, Vercel
o Google, dame el paso a paso exacto y qué resultado tengo que ver. Antes de
construir algo, buscalo en el mapa de la §5 del briefing: no re-implementes lo
que ya está.

Empezá confirmando con git que el estado de la §2 de LOYALTY-TRASPASO.md sigue
siendo cierto, y preguntame cuál de las tareas de la §4 hacemos primero.
```

---

## 1 · Qué es y hasta dónde llegó

Club de beneficios con **Google Wallet** para comercios locales: el cliente toca
el cartel NFC/QR, se registra con nombre y celular, recibe una tarjeta en Google
Wallet, suma puntos por visita y misiones, y los canjea en caja con un código de
6 letras que valida el comercio desde su portal.

Está **construido de punta a punta** (registro, visitas, misiones, canje, panel
de admin, portal del comercio, privacidad y baja con un botón). Lo único que
funcionó con un dispositivo real fue la **tarjeta de prueba de Wallet en un
Android**. El flujo completo todavía **no se probó en Preview con una persona
real** (ver §4, tarea 1).

Apple Wallet (iPhone) quedó afuera a propósito: el código del pase está, falta
la cuenta de Apple Developer.

## 2 · Situación hoy (verificar con git antes de confiar)

### Código

| | Estado |
|---|---|
| PR #153 (Loyalty + arreglos del audit) | **Mergeado a `desarrollo`** el 15/10 |
| PR #154 (hotfix de carteles huérfanos) | **Mergeado a `main`** el 15/10 |
| `main` vs `desarrollo` | `main` está contenido en `desarrollo` (sincronizados) |
| Loyalty en `main` | **Nada**: ni código ni migraciones |
| Loyalty en producción | **Apagado.** Código dormido en `desarrollo`; nadie lo ve |
| CI | `verificar` y `permisos` en verde. Ojo: el job `permisos` hace un `next build` que baja una fuente de Google Fonts y a veces falla por red (no por el código); se relanza |

### Base de datos (Neon, proyecto "Metrics Field", branch `production`, base `neondb`)

- **Migraciones 012 y 016 corridas en `public` el 15/10/2026.** Se verificó:
  9 tablas de Loyalty y la columna `puntos_por_visita`. Quedan idénticas a
  `db/schema.sql` (se comparó columna por columna, índice por índice).
- Existe además un esquema **`loyalty`** (creado el 20/9 por la implementación
  descartada, con tablas `membresias`, `beneficios`, `canjes`,
  `consentimientos` y un rol `app_loyalty`). **Es de la línea descartada: no lo
  uses ni lo toques.** Si hay que borrarlo, es una decisión del dueño, con
  copia de seguridad.
- Se corrió por error `db/seed.sql` en producción (7 negocios de ejemplo con
  códigos de portal publicados en el repo). **Ya se borraron** esos 7 negocios y
  sus links, y también 18 carteles huérfanos de prueba. Quedan 23 filas en
  `links_nfc` sin comercio: 19 piezas libres de inventario y 4 piezas físicas de
  prueba (`p-0001`, `p-0003`, `p-0004`, `p-0009`) que se dejaron a propósito.
- **Los datos de Loyalty en producción están vacíos**: nadie se registró.
- Neon no es accesible desde el entorno del agente. Todo SQL lo corre el dueño
  a mano.

### Variables en Vercel (según lo que dijo el dueño; el agente no puede verlas)

- `LOYALTY_PII_KEY`, `LOYALTY_IP_PEPPER`: cargadas (Production y Preview).
- `LOYALTY_ENABLED=true`: **solo Preview**. En Production **no** está.
- `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_WALLET_SERVICE_ACCOUNT_KEY`: **solo Preview**.
- `NEXT_PUBLIC_BASE_URL` (`https://app.metricsfield.com`): **no debe estar en
  Preview**; si lo está, los links dentro de la tarjeta apuntan a producción,
  donde Loyalty está apagado.
- Duda abierta: si Preview y Production comparten la misma `DATABASE_URL`. Si la
  comparten, lo que se pruebe en Preview queda en la base de producción.

### Google Wallet

- Issuer ID `3388000000023214787` en **modo demo**: solo cuentas de prueba (hoy
  `herniberelejis@gmail.com`) pueden guardar tarjetas. Para clientes reales hay
  que completar el Perfil de Negocio y pedir el **acceso de publicación**.
- `/admin/wallet-prueba` es la página de diagnóstico: si Google rechaza algo,
  muestra el error y qué tocar.

### Seguridad

- Se corrieron dos audits (skill de Cloudflare, perfil rápido). El segundo
  encontró 6 hallazgos de severidad baja y 2 pistas; **todos arreglados**, cada
  uno con una prueba que falla con el código viejo y pasa con el nuevo. El
  informe está en el scratchpad de aquella sesión (no en el repo); si lo
  necesitás, repetí el audit.
- **Riesgos aceptados** (decisión, no olvido): el link "Ver mis puntos" de la
  tarjeta no vence; quien se da de baja y se re-registra cobra de nuevo los
  puntos de bienvenida; los datos personales están en texto plano en la base.
- **No cerrado:** el teléfono no está verificado (ver tarea 2 de la §4). Hoy lo
  mitiga que registrar un número ajeno no da acceso a su tarjeta, y que el
  equipo puede liberar un teléfono desde el panel (dos pasos, con vista previa y
  confirmación, y queda auditado).
- El audit fue rápido: no garantiza que el resto del sistema esté limpio. Hay
  una unidad que nunca se cazó en serio (el ciclo de vida completo de un
  comercio con Loyalty); está cubierta por `comercioConLoyalty()`, pero una
  tercera pasada ayudaría antes de producción.

## 3 · Cómo se verifica localmente (receta que funcionó)

El entorno del agente no tiene Neon, así que se prueba con Postgres local.

```bash
# 1. Postgres 16 local (cualquier forma), una base vacía "e2e"
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE e2e"
psql -h 127.0.0.1 -U postgres -d e2e -v ON_ERROR_STOP=1 -q -f db/schema.sql
psql -h 127.0.0.1 -U postgres -d e2e -v ON_ERROR_STOP=1 -q -f db/seed.sql

# 2. Ciclo de verificación (las cuatro tienen que pasar)
npx tsc --noEmit && npm test && npm run lint
DATABASE_URL=postgres://b:b@127.0.0.1:5432/b ADMIN_PASSWORD=x npm run build

# 3. Prueba cruzada de permisos contra la app real, en los dos modos
export DATABASE_URL=postgres://postgres@127.0.0.1:5432/e2e
export ADMIN_PASSWORD=clave-solo-para-el-ci CRON_SECRET=secreto-solo-para-el-ci
export LOYALTY_ENABLED=true LOYALTY_PII_KEY=clave-loyalty-solo-para-el-ci
PORT=3100 npx next start &            # modo preview
node scripts/prueba-permisos.mjs
# (matar el server y repetir con VERCEL_ENV=production, PORT=3101,
#  BASE_URL=http://127.0.0.1:3101 y MODO=produccion)
```

Trampas conocidas de esa prueba:

- **Se niega a correr contra una base que no sea local** (`localhost`,
  `127.0.0.1`): reescribe datos en masa. Para otra base de prueba hace falta
  `PERMITIR_BASE_DE_PRUEBA=1`. **Jamás** contra Neon de producción.
- Cada corrida necesita una **base limpia** (recargá `schema.sql` y `seed.sql`).
  La prueba rota los códigos del seed con el prefijo `e2e-` (los del seed están
  publicados en el repo, y en producción son de solo lectura).
- Si queda un `next start` vivo de una corrida anterior, la siguiente pega
  contra el server viejo y da fallas falsas. Matá los procesos entre corridas.
- Cada arreglo nuevo debería traer su caso en `scripts/prueba-permisos.mjs`, y
  comprobarse **contra el código viejo** para ver que realmente falla.

## 4 · Qué falta, en orden

### Tarea 1 — Probar el flujo completo en Preview (la hace el dueño, con guía)

Es lo más importante y lo que hace falta antes que cualquier otra cosa. Paso a
paso en `docs/LOYALTY-ESTADO.md` §6, Paso 4: crear un cliente de prueba (nombre
claro, ej. "PRUEBA Loyalty"), prender el club, cargar un beneficio y una misión,
crear un link con destino "Club de beneficios", registrarse desde un Android de
prueba, guardar la tarjeta, canjear y validar en el portal, y borrarse. Al
final **borrar el cliente de prueba**. Si algo falla, pedir captura del error.

### Tarea 2 — Verificar el teléfono (decisión del dueño, después se construye)

Hoy el teléfono identifica al cliente pero nadie comprueba que sea suyo, y por
eso no hay "entrar de nuevo" por teléfono. Cuatro opciones, con la
recomendación en `docs/LOYALTY-ESTADO.md` §5: WhatsApp (verifica el número y
sirve para promos, tiene costo por mensaje), SMS (más caro, peor entrega),
Google (gratis, pero la identidad pasa a ser la cuenta de Google) o link por
email (gratis, hay que volver el email obligatorio). **No implementar nada
hasta que el dueño elija.** Se verifica en dos puntos: al registrarse y en un
botón "Ya tengo tarjeta".

### Tarea 3 — Lo de Google y lo legal (no son de código)

- Pay & Wallet Console: Perfil de Negocio + acceso de publicación (Google
  tarda días en revisar la tarjeta). Mientras tanto, cuentas de prueba.
- Revisión legal de `/privacy#loyalty` y del consentimiento (Ley 25.326, leyenda
  de la AAIP).
- Elegir 2 o 3 comercios piloto y cargarles logo, beneficios y misiones.

### Tarea 4 — Salir a producción

Solo cuando 1 a 3 estén hechas: cargar las tres `GOOGLE_WALLET_*` y
`LOYALTY_ENABLED=true` en Production, confirmar que las migraciones ya están en
la base de producción (lo están), y mergear `desarrollo` a `main` con un PR.
**Antes de ese merge, repasar el audit** (tercera pasada).

### Pendientes de código, sin dueño asignado

| Qué | Depende de |
|---|---|
| Verificación del teléfono y "volver a entrar" | Tarea 2 |
| Apple Wallet (iPhone) | Cuenta de Apple Developer (~99 USD/año) |
| Actualización automática del pase de Apple | Apple Wallet primero |
| Vencimiento o rotación del link de la tarjeta | Decisión: rompe pases ya emitidos |
| Antifraude nivel 2 (ubicación, etc.) | Que el fraude aparezca como problema medido |
| Configuración del club desde el portal del comercio | Que los comercios lo pidan |
| Modo offline en caja | Qué comercios se elijan |

## 5 · Cómo trabajar con el dueño

- **Idioma:** español, siempre (código, commits, docs, UI y chat).
- **Perfil:** dueño de producto, no desarrollador. Pide instrucciones claras
  para lo que hace a mano. Para Neon, Vercel y Google: pasos numerados, qué
  botón tocar, qué resultado tiene que ver y cuándo parar y preguntar.
- **Neon:** el dueño pega SQL en el SQL Editor y manda capturas. Dale bloques
  separados, **con una vista previa de solo lectura antes de cada borrado** y con
  el número exacto que tiene que dar. Que corra cada bloque por separado.
  Recomendá una copia (branch de Neon) antes de cambios grandes.
- **Secretos:** nunca le pidas que pegue una clave, el JSON de la cuenta de
  servicio ni una `DATABASE_URL`. Se cargan directo en Vercel. Para generar un
  valor al azar en Windows (PowerShell):
  `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`
- **Confirmar antes de actuar** en lo que no se deshace o sale hacia afuera:
  borrar datos, mergear a `main`, tocar producción. Ya hubo una pérdida de datos
  real y un `seed.sql` corrido en producción por error.
- **Ramas:** una rama por tarea, PR a `desarrollo` (o a `main` solo si es un
  hotfix de producción), y cuando `main` avanza, bajarlo a `desarrollo` el mismo
  día.
- **Honestidad:** si algo no se probó, decilo. Si un check falla por una causa
  ajena (como la fuente de Google Fonts), explicá por qué y relanzalo.

## 6 · Qué NO hacer

- No reintroducir el desvío de reseñas ("star-gate") ni nada que filtre por
  calificación. La misión "opinar en Google" manda a todos al mismo link.
- No reintroducir "Posición en Maps".
- No usar el esquema `loyalty` de Neon ni nada de la implementación descartada
  (`LOYALTY_DATABASE_URL`, `sqlLoyalty`, `app_loyalty`).
- No agregar "entrar con solo escribir el teléfono".
- No decir que los datos personales están cifrados: no lo están.
- No prender `LOYALTY_ENABLED` en Production sin que el dueño lo pida.
- No volver a correr `db/seed.sql` contra una base real.
