# Loyalty — contexto para agentes de IA

> Para Claude Code, Cursor, Codex, Copilot o cualquier agente que vaya a tocar
> el módulo de fidelización (Club de beneficios con Google Wallet). Leelo
> **antes** de escribir código en `app/(loyalty)/`, `lib/loyalty*.ts`,
> `lib/db/loyalty.ts`, `lib/wallet/`, `db/migrations/*loyalty*` o en las
> acciones y pantallas de Loyalty de `app/admin/` y `app/portal/`.
>
> Complementa al `CLAUDE.md` de la raíz (reglas de todo el repo), a
> `docs/LOYALTY-PRODUCTO-COMPLETO.md` (producto y modelo de negocio) y a
> `docs/LOYALTY-ESTADO.md` (qué se probó y qué falta hacer). Este archivo es
> sobre **el código**: qué no romper y por qué.
>
> Verificado contra la rama `claude/repo-context-hi4dov` (PR #153), commit
> `1885a86`, el 15/10/2026. Si pasó tiempo, verificá con `git` y `gh` antes de
> dar por cierto lo del estado.

---

## 1 · Dónde está parado esto

| | |
|---|---|
| Rama | `claude/repo-context-hi4dov` |
| PR | **#153**, base `desarrollo`, abierto, no es borrador |
| `main` | **No tiene nada de Loyalty** (ni una migración) |
| Flag | `LOYALTY_ENABLED` apagado en producción: es código dormido |
| Base de datos | **La misma que el resto de la app** (ver §2.1) |

El estado de las pruebas, lo que falta y los pasos manuales (Neon, Vercel,
Google) están en `docs/LOYALTY-ESTADO.md`. No los dupliques acá: se desactualizan.

**No re-implementes lo que ya está.** Antes de construir algo, buscalo en el
mapa de la §5.

### Hubo otra implementación: está descartada

Existió un PR #118 (rama `claude/loyalty-l5-canje`, y los #114, #115, #116) con
**otra arquitectura**: base de datos separada, esquema `loyalty`, rol
`app_loyalty`, `LOYALTY_DATABASE_URL`, datos personales cifrados, `lib/loyalty/*`
y `lib/sql-loyalty.ts`. **El equipo eligió el #153 y esa línea no se usa.**

- No copies código, migraciones ni reglas de esas ramas. Su `012` es un archivo
  **distinto** al de acá, y su `013` (el rol `app_loyalty`) no existe en esta rama.
- Si en el código, en un comentario o en un doc viejo leés `LOYALTY_DATABASE_URL`,
  `sqlLoyalty` o `app_loyalty`, es de esa línea. Acá no aplica.

---

## 2 · Las reglas que no se rompen

Romper cualquiera de estas causa daño real, no un lint rojo.

### 2.1 Una sola base de datos, con el rol de toda la app

`lib/db/loyalty.ts` usa el mismo `sql` de `lib/sql.ts` que el resto del repo: rol
con acceso total, tablas en el esquema `public`. **No hay aislamiento por
permisos de base de datos.**

La consecuencia es la regla más importante del módulo: **el aislamiento entre
comercios lo hace el código, no la base.** Toda consulta que lee o escribe datos
de un comercio **filtra por `comercio_id`**, y toda acción de un comercio recibe
el `comercioId` del que está autenticado, nunca uno que mande el cliente sin
verificar. `scripts/prueba-permisos.mjs` comprueba que el comercio B no puede
tocar los canjes, misiones ni socios del A. Si agregás una consulta, agregá su
caso ahí.

Toda query de Loyalty vive en `lib/db/loyalty.ts`. No escribas SQL de Loyalty en
componentes, actions ni rutas.

### 2.2 El ledger: el saldo es la suma de los movimientos

El saldo **es `SUM(delta)`** de `movimientos_puntos` (`calcularSaldo()`). Nunca
hay un número de saldo guardado aparte.

- Sumar o restar puntos = **insertar** una fila con su `delta`. En todo el código
  de la app no hay ningún `UPDATE` ni `DELETE` directo sobre esa tabla.
- Para corregir un error, insertá un movimiento compensatorio
  (`motivo = 'ajuste_manual'`), no edites el anterior.
- **Las filas de puntos solo se borran por cascada**, cuando se borra la
  membresía: la baja pedida por el cliente (`eliminarMembresiaYDatos`, derecho
  de supresión de la Ley 25.326) y la liberación de un teléfono
  (`liberarTelefono`). No escribas un `DELETE` propio. El único `DELETE
  FROM movimientos_puntos` del repo está en `scripts/prueba-permisos.mjs`,
  sobre datos de prueba.

**Cuidado con `idem_clave`.** La tabla la exige `UNIQUE`, pero en
`acreditarVisita()` se arma con un `crypto.randomUUID()`: **ahí no deduplica
nada**. Lo que evita que dos taps simultáneos sumen dos veces es otra cosa: un
`pg_advisory_xact_lock` por membresía **más** el chequeo de la ventana de 20 h,
los dos dentro de la misma transacción. No separes esos dos pasos, no saques el
lock, y no lo reemplaces por un rate limit en memoria: en serverless es por
instancia y no es confiable. La base es la fuente de verdad del cooldown.

### 2.3 La base es la verdad; Google Wallet es una copia

Si Google falla, **no se pierde ni un punto**: el movimiento ya quedó en la base,
la tarjeta se marca con error (`marcarEstadoGoogle`) y se reintenta cuando el
cliente abre su página o toca "Guardar en Google Wallet".

- Nunca hagas depender un movimiento de puntos de la respuesta de Google.
- Toda la orquestación base ↔ Google está en `lib/loyalty.ts`. Los
  `console.error` de ahí loguean solo el mensaje del error; mantené eso.

### 2.4 Credenciales del cliente final: firmadas, y fallan cerradas

El cliente final tiene un cuarto sistema de acceso, en `lib/loyalty-firma.ts`.
Todo es HMAC con `LOYALTY_PII_KEY`. **Tres tokens distintos**, cada uno con su
propio prefijo dentro de la firma para que uno nunca valga como otro:

| Token | Para qué | Dura |
|---|---|---|
| Sesión | La cookie del celular del cliente | 1 año |
| Visita | Lo agrega `/t/<slug>` al mandar a `/l/<comercio>`: **prueba que hubo un tap real en el cartel** | 15 min |
| Tarjeta | Va dentro del pase de Wallet ("Ver mis puntos"): le devuelve la sesión si cambió de celular | Sin vencimiento |

- **Solo un tap real suma puntos.** Volver a abrir `/l/<comercio>` sin token de
  visita válido no suma. No agregues un camino que acredite visitas sin él.
- **Fallan cerradas.** En producción sin `LOYALTY_PII_KEY`, `claveLoyalty()`
  devuelve `null` y `loyaltyHabilitado()` da `false`: Loyalty no abre. No agregues
  una clave por defecto. (En desarrollo hay una clave de desarrollo a propósito;
  no la copies a ningún otro lado.)
- No hagas que un token valga en otro rol, ni los alargues, ni uses la cookie de
  sesión como link de tarjeta. Hay tests que lo exigen (`test/loyalty-firma.test.ts`).
- El link de la tarjeta **no vence**, y es un riesgo aceptado: hacerlo vencer
  rompe los pases ya emitidos. Cambiarlo requiere una decisión, no un arreglo.

### 2.5 El teléfono NO es una contraseña

El cliente final se identifica por su teléfono (`clientes_finales.telefono`, único
y **global**: una persona es una sola aunque sea socia de varios comercios). Pero
nadie comprueba que el número sea suyo.

Por eso, **registrar un número que ya tiene tarjeta no te da esa tarjeta**: el
sistema le dice que la abra desde su Google Wallet. Esto es deliberado.

- **No agregues "entrar con solo escribir el teléfono"**, ni nada equivalente.
  Cualquiera podría ver los puntos y pedir canjes de otra persona.
- La salida actual si alguien registró un número ajeno es manual:
  `accionLiberarTelefonoLoyalty` en el panel de admin.
- La verificación real (WhatsApp, SMS, Google o email) es una **decisión
  pendiente del dueño** (`docs/LOYALTY-ESTADO.md` §5). No implementes ninguna
  hasta que esté tomada.

### 2.6 Los datos personales NO están cifrados

Esto es distinto de lo que se podría suponer: en esta rama `nombre`, `telefono` y
`email` se guardan **en texto plano** en `clientes_finales`. `LOYALTY_PII_KEY`
solo **firma** credenciales; no cifra nada.

- No escribas ni digas en un commit, un PR, un comentario o un texto legal que
  los datos están cifrados. No lo están.
- **Nunca loguees nombre, teléfono, email ni IP**: ni en `console.log`, ni en un
  mensaje de error, ni en un test que imprima el objeto entero.
- Las IPs se guardan solo como hash (`hashearIp`): HMAC con `LOYALTY_IP_PEPPER`.
  **En producción sin el pepper devuelve `""`** — a propósito, porque un SHA-256
  pelado de una IPv4 se revierte probando todas las IPs posibles. No "arregles"
  eso devolviendo el hash simple.
- Si el producto decide cifrar estos campos, es un cambio de esquema y de
  lecturas que hay que decidir y planificar; no lo metas de paso.

### 2.7 Un solo guardia: `comercioConLoyalty()`

Toda entrada pública a Loyalty (la landing, `entrar`, `google`, el logo) pasa por
`comercioConLoyalty(comercioId)` en `lib/loyalty.ts`, que devuelve `null` (404 o
redirección) si falla **cualquiera** de estas condiciones:

1. `LOYALTY_ENABLED === "true"` **y** hay clave (`loyaltyHabilitado()`)
2. El comercio tiene `tiene_loyalty`
3. El comercio **y su cuenta raíz** no están en estado `baja` ni `pausado`
   (una sucursal de una cuenta en baja tampoco tiene Loyalty)
4. Existe el programa y está `activo`

No agregues una ruta que lea datos de Loyalty sin pasar por ahí. No relajes
ninguna de las cuatro.

### 2.8 Loyalty toca más de Reviews de lo que parece

No es un módulo aislado en archivos propios. Además de lo suyo, modifica:

| Archivo | Qué toca |
|---|---|
| `app/t/[slug]/page.tsx` | La rama del router del tap: destino `loyalty` + `tiene_loyalty` + `comercioConLoyalty()` → redirige a `/l/<comercio>` con el token de visita. Si falta una condición, el cartel se comporta como siempre |
| `app/actions.ts` | Seis acciones de admin (`accionGuardarLoyalty`, `accionCrearBeneficioLoyalty`, `accionToggleBeneficioLoyalty`, `accionCrearMisionLoyalty`, `accionToggleMisionLoyalty`, `accionLiberarTelefonoLoyalty`) |
| `app/portal/actions.ts` | `accionValidarCanjePortal` (el canje en caja) |
| `app/portal/[codigo]/` | `_components/PanelLoyalty.tsx` y la pestaña en `page.tsx` / `_lib.tsx` |
| `app/admin/clientes/[id]/` | La pantalla `loyalty/page.tsx` y enlaces desde `page.tsx` y `links/page.tsx` |
| `app/admin/actividad/page.tsx` | Las etiquetas de auditoría de las acciones de Loyalty (`guardar_loyalty`, `crear_beneficio_loyalty`…): si agregás una acción de admin, agregá su etiqueta |
| `lib/db/clientes.ts`, `lib/types.ts` | El campo `tieneLoyalty` y los tipos del programa |
| `app/privacy/page.tsx` | La sección "Club de beneficios" |
| `.github/workflows/verificacion.yml` | Variables de Loyalty para el job de permisos |

Antes de tocar esos archivos por otro motivo, fijate que no rompas la parte de
Loyalty. Y las acciones de admin siguen la regla del repo: empiezan con
`await requireAdmin()` y dejan rastro en la auditoría.

### 2.9 Las migraciones no se auto-aplican

Regla de oro del repo, y acá también. El entorno del agente **no tiene acceso a
Neon**.

- Todo cambio de esquema es un `.sql` nuevo en `db/migrations/`, para correr **a
  mano** en el SQL Editor de Neon. **Nunca asumas que una migración ya se
  corrió**: preguntá.
- **Además** hay que actualizar `db/schema.sql`: es la referencia canónica y el
  CI lo carga en un Postgres real. Si lo olvidás, el job de permisos falla.
- Las de Loyalty son la **012** (`012_loyalty_fundaciones.sql`) y la **016**
  (`016_loyalty_google.sql`). **La 013 no existe en esta rama**: ese número es de
  la línea descartada. **La próxima libre es la 017.** No reuses la 013.
- Escribilas idempotentes (`IF NOT EXISTS`): se pueden correr dos veces.
- **Alerta.** Si alguien corrió en Neon las migraciones de la línea descartada
  (esquema `loyalty` o rol `app_loyalty`), esa base tiene otra estructura.
  Antes de ejecutar cualquier cosa, confirmá con el dueño qué se corrió.

### 2.10 Nunca saques `prepare: false`

Está en `lib/sql.ts`. Neon corre en modo pooler (PgBouncer) y los prepared
statements con nombre provocan el error aleatorio `cached plan must not change
result type`. Es un bug intermitente: se ve en producción, no en tu prueba.

### 2.11 Sin desvío de reseñas — nunca

La misión "opinar en Google" **premia opinar, nunca la calificación**, y manda a
todos al mismo link público. No filtres, desvíes ni condiciones el premio por
estrellas: roza el *review gating* que Google penaliza. Aplica a todo el producto.

### 2.12 Los textos legales

`VERSION_CONSENTIMIENTO` (en `lib/loyalty.ts`, hoy `"2026-10"`) es la versión del
texto que el cliente acepta al registrarse. **Si cambiás la sección de Loyalty de
`app/privacy/page.tsx` o el consentimiento del alta, subí esa constante**: los
consentimientos son append-only y el historial depende de ella.

El texto **todavía no tiene revisión legal**. No lo describas como validado en un
commit, un PR ni un comentario.

---

## 3 · Por qué los archivos están donde están

```
lib/loyalty-firma.ts       → HMAC de sesión, visita y tarjeta. Puro, sin base.
lib/loyalty-antifraude.ts  → hash de IP y tipos de eventos. Sin base.
lib/db/loyalty.ts          → toda la capa de datos. Importa lib/sql.ts.
lib/loyalty.ts             → orquestación base ↔ Google Wallet. Importa next/headers.
lib/wallet/google.ts       → cliente de la Issuer API (HTTP + JWT RS256).
lib/wallet/apple.ts        → armado y firma del .pkpass.
```

**La razón de la separación:** `lib/db/loyalty.ts` importa `lib/sql.ts`, que tira
apenas se importa si falta `DATABASE_URL`. Si la lógica de firma o de antifraude
viviera ahí, **no se podría testear sin una base de datos**. Por eso esos dos
archivos están afuera y sus tests corren en el CI sin ninguna variable.

Si vas a agregar lógica nueva, preguntate: **¿necesita la base?** Si no, va en
`lib/loyalty-firma.ts` o `lib/loyalty-antifraude.ts` (o un archivo puro nuevo).
Si sí, va en `lib/db/loyalty.ts`.

`verificarCooldownTap()` en `lib/loyalty-antifraude.ts` usa `lib/ratelimit.ts` y
**no es la fuente de verdad** del límite de visitas: esa es la base (§2.2).

---

## 4 · Cómo verificar antes de dar algo por hecho

```bash
npx tsc --noEmit     # tipos
npm run lint         # next lint
npm test             # vitest
npm run build        # next build
```

Las cuatro tienen que pasar, y el CI corre lo mismo. Si algo se pone rojo, **el
cambio está mal, no el test**. No borres un test para hacer pasar un cambio.

### El CI tiene dos pruebas distintas

1. **La verificación común:** instalación, tipos, lint, tests, build y auditoría
   de dependencias. Los tests son de lógica pura.
2. **El job `permisos`:** levanta un **Postgres 16 real**, carga `db/schema.sql` y
   `db/seed.sql`, hace el build, arranca la app y corre
   `scripts/prueba-permisos.mjs` contra ella, en modo preview **y** en modo
   producción. Es donde se prueba lo que de verdad importa de Loyalty.

### Qué está cubierto y qué no

| Dónde | Qué protege |
|---|---|
| `test/loyalty-firma.test.ts` | Sesión, token de visita y link de tarjeta: no se falsifican, no se estiran, no valen unos como otros, fallan cerrados sin clave |
| `test/loyalty-antifraude.test.ts` | El hash de IP |
| `test/wallet-google.test.ts` | Firma del JWT RS256 de la Issuer API |
| `test/wallet-apple.test.ts` | Firma PKCS#7 del `.pkpass`, validada contra OpenSSL de verdad; las imágenes embebidas (PNG válidos, del tamaño que pide Apple); el dorso con el link; los PEM con los saltos de línea escritos como texto |
| `test/loyalty-apple-ruta.test.ts` | La ruta `/apple` con la base y el generador simulados: sin sesión, con cookie falsificada o sin ser socia no entrega pase; con límite por IP, Apple sin configurar o falla al armar, vuelve con aviso; el log no lleva datos del cliente |
| `scripts/prueba-permisos.mjs` | Aislamiento entre comercios (canjes, misiones, links de tarjeta, bajas ajenas), código vencido, sumar sin tap real o con el token de visita de otro comercio, misión cobrada dos veces. La lista completa está en el script |

**La lógica de base de datos de Loyalty (`acreditarVisita`, `validarCanje`,
misiones, referidos) no tiene tests unitarios.** Se prueba solo a través de
`prueba-permisos.mjs`, que necesita un servidor y un Postgres. Si cambiás
`lib/db/loyalty.ts`, corré esa prueba (o dejá que la corra el CI) y **no digas
que verificaste algo que no ejecutaste**.

Los tests van en `test/`, no junto al archivo: la config de vitest solo incluye
`test/**/*.test.ts`. Un test co-locado en `lib/` **no se ejecuta nunca** y vas a
creer que pasó.

---

## 5 · Mapa: si tenés que hacer X, tocá Y

| Si querés… | Editá |
|---|---|
| El formulario y las pantallas del cliente final | `app/(loyalty)/l/[codigo]/_componentes.tsx` y `page.tsx` |
| Registrarse, sumar, misiones, pedir canje, darse de baja | `app/(loyalty)/l/[codigo]/actions.ts` |
| "Ver mis puntos" desde dentro del pase de Wallet | `app/(loyalty)/l/[codigo]/entrar/route.ts` |
| El botón "Guardar en Google Wallet" | `app/(loyalty)/l/[codigo]/google/route.ts` |
| Cómo se acreditan puntos, canjes, misiones, referidos | `lib/db/loyalty.ts` |
| La ventana de 20 h o los topes (referidos, vencimiento del canje) | Constantes al tope de `lib/db/loyalty.ts` |
| Cookies y tokens del cliente final | `lib/loyalty-firma.ts` |
| Emitir o actualizar la tarjeta de Google | `lib/loyalty.ts` y `lib/wallet/google.ts` |
| El `.pkpass` de Apple (armado, firma, dorso) | `lib/wallet/apple.ts` |
| Las imágenes del pase de Apple | `lib/wallet/apple-assets.ts` (embebidas en código; la cabecera explica cómo regenerarlas) |
| El botón "Agregar a Apple Wallet" y la entrega del pase | `app/(loyalty)/l/[codigo]/apple/route.ts` y el botón en `page.tsx` |
| El logo de la tarjeta (660×660) | `app/api/loyalty/logo/[comercioId]/route.ts` |
| Configurar el club, beneficios y misiones (equipo) | `app/admin/clientes/[id]/loyalty/page.tsx` + acciones en `app/actions.ts` |
| Liberar un teléfono | `accionLiberarTelefonoLoyalty` en `app/actions.ts` |
| Validar canjes y ver socios y métricas (comercio) | `app/portal/[codigo]/_components/PanelLoyalty.tsx` + `app/portal/actions.ts` |
| Diagnosticar Google Wallet | `app/admin/wallet-prueba/` |
| Agregar una tabla o columna | Un `.sql` nuevo en `db/migrations/` **y** `db/schema.sql` |

Los parámetros que hoy están fijos: ventana entre visitas **20 h**, tope de
referidos **20**, vencimiento del canje **15 min**, token de visita **15 min**,
sesión **1 año**. El código del canje es de 6 letras. Puntos de bienvenida y por
visita se configuran **por comercio** en `programas_loyalty`.

El segmento `[codigo]` de `/l/[codigo]` es el **`comercio.id`**.

Los archivos de Loyalty tienen comentarios de cabecera que explican por qué
existen y qué no hay que hacerles: leelos antes de editar. (Esta rama no usa
bloques `CONEXIONES`.)

---

## 6 · Recetas

**Agregar una consulta.** Función exportada en `lib/db/loyalty.ts`, que filtre por
`comercio_id` (§2.1). Mapeá `snake_case` a `camelCase` con un mapper explícito,
como el resto del archivo.

**Agregar una columna.** Cuatro lugares; si falta uno, rompe en runtime o en el CI:

1. Un `.sql` nuevo en `db/migrations/` (a mano en Neon)
2. `db/schema.sql`
3. El mapper en `lib/db/loyalty.ts`
4. El tipo en `lib/types.ts`

**Agregar lógica que no toca la base.** En un archivo puro (§3), no en
`lib/db/loyalty.ts`.

**Agregar una acción de admin.** Empieza con `await requireAdmin()`, valida la
entrada en el borde, y deja rastro en la auditoría.

**Trabajar sin las credenciales de Google.** Sin `GOOGLE_WALLET_*` la tarjeta de
Google no se emite (el botón vuelve con `?wallet=error`), pero el resto del
módulo se puede desarrollar y probar. `walletGoogleConfigurado()` te dice si
están. No agregues un fallback silencioso: un botón "Guardar" que no hace nada es
peor que un error visible.

**El logo en una preview.** En previews de Vercel Google no puede leer el logo del
comercio (están protegidas), y `urlLogoTarjeta()` usa el de respaldo. Es a
propósito, no un bug.

---

## 7 · Trampas conocidas

**El `classId` de Google es `<issuerId>.<comercio.id>`.** Las clases de Google
Wallet **no se pueden borrar jamás**. Hoy nada en el código renombra
`comercios.id`; si alguien agrega esa función, las clases ya creadas quedan
huérfanas para siempre. No la agregues sin resolver esto.

**`NEXT_PUBLIC_BASE_URL` en las previews.** Si está tildada en Preview, los links
de dentro de la tarjeta de Wallet apuntan a `app.metricsfield.com`, donde Loyalty
está apagado.

**El pase de Apple es estático y lleva el saldo del momento de emitirlo.** No
tiene `webServiceURL` ni push, así que ese número queda viejo apenas el cliente
suma o canjea ("dice 100 y tengo 300"); el pase avisa que hay que tocar el cartel
para actualizarlo, y su dorso trae el link "Ver mis puntos al día" a la tarjeta web.
Mejorarlo (web service + APNs) está en la lista de pendientes de
`docs/LOYALTY-ESTADO.md`; no lo "arregles" por tu cuenta.

**Apple Wallet: el código está completo, pero nunca se probó con un certificado
real ni en un iPhone real.** La ruta `/l/<comercio>/apple` y su botón existen y
están cubiertos con certificados de prueba. El botón solo aparece en iPhone y solo
cuando están cargadas las cinco `APPLE_*` (`appleWalletConfigurado()`); si no, la
landing sigue diciendo "Apple Wallet llega pronto". Sin cuenta de Apple Developer
no se puede emitir ninguno. Todos los pases llevan la marca de MetricsField, no el
logo del comercio (el nombre del comercio va al lado, en `logoText`).

**Modo demo de Google Wallet.** Hasta que Google apruebe el acceso de
publicación, solo pueden guardar la tarjeta los Admin, los Developer y las cuentas
de prueba. Que un cliente real no pueda guardarla no es un bug del código.

**No hay cron de Loyalty en esta rama.** El único cron del repo es `sync-google`.
Los canjes llevan `expira_en` y los códigos vencidos no sirven.

**El lockfile y la versión de Node.** `npm install` con Node 24 **borra**
`node_modules/vite-node/node_modules/{@types/node,undici-types}`, que el npm de
Node 22 (el del CI) exige. Si tocás `package-lock.json` con otra versión de Node,
verificá que esas entradas sigan, o `npm ci` falla en el primer paso, antes de
correr un solo test.

**PRs en borrador.** En GitHub, "draft" significa "no lo revises todavía". Un PR
de Loyalty ya estuvo diez días parado por eso.

**Nunca pushees directo a `main` ni a `desarrollo`.** Rama propia y PR. El #153
apunta a `desarrollo`; `main` no tiene nada de Loyalty y solo debería recibirlo
cuando estén hechos los pasos de `docs/LOYALTY-ESTADO.md`.

---

## 8 · Decisiones tomadas: no las re-litigues

Todas tienen una razón que no es obvia mirando el código. Si una tarea parece
pedirte revertirlas, preguntá antes.

- **Una sola base y un solo rol.** Se eligió el #153 sobre la línea con base
  separada. El costo (sin aislamiento por permisos, sin cifrado de datos
  personales) es conocido y queda del lado del código y de las pruebas de permisos.
- **Puntos por visita, no por monto.** Por monto obliga al empleado a cargar algo
  en cada venta, y eso se abandona en la segunda semana.
- **La base es la verdad, Google es una copia** (§2.3).
- **Las misiones sociales son autodeclaradas.** No hay OAuth nuevo de terceros
  (Meta, Shopify, GA4 quedan fuera).
- **El club lo configura el equipo, no el comercio**, durante el piloto.
- **Sin ORM.** SQL directo con el driver `postgres`.
- **Sin desvío de reseñas** (§2.11).

---

## 9 · Lo que falta construir

El detalle y el orden están en `docs/LOYALTY-ESTADO.md` §6 y §7. Para que no
reimplementes algo hecho ni des por hecho algo que falta:

| | Estado |
|---|---|
| Alta, consentimiento, tarjeta de Google, visitas, misiones, canje | ✅ hecho |
| Panel de admin y pestaña del portal del comercio | ✅ hecho |
| Verificación del teléfono / "volver a entrar" | ❌ **decisión pendiente** (§2.5) |
| Apple Wallet (iPhone) | ⚠️ código completo y probado con certificados de prueba; falta la cuenta de Apple Developer y probarlo en un iPhone real |
| Logo del comercio en el pase de Apple | ❌ hoy todos llevan la marca de MetricsField |
| Actualización automática del pase de Apple | ❌ depende de Apple Wallet |
| Vencimiento o rotación del link de la tarjeta | ❌ decisión (compromiso con pases ya emitidos) |
| Antifraude nivel 2 (ubicación, etc.) | ❌ solo si el piloto muestra fraude |
| Modo offline en caja | ❌ solo si algún comercio tiene mala conexión |
| Configurar el club desde el portal | ❌ solo si los comercios lo piden |
| Revisión legal de la privacidad y el consentimiento | ❌ pendiente |

Y lo que no es código y bloquea de verdad: **un comercio real que diga "esto lo
necesito"**. Si estás por proponer construir más funcionalidad, ese es el dato
que más pesa.

---

## 10 · Convenciones

- **Todo en español**: comentarios, mensajes de commit, nombres de dominio,
  UI y documentación.
- **Commits**: `<tipo>: <descripción>` — `feat`, `fix`, `refactor`, `docs`,
  `test`, `chore`, `perf`, `ci`.
- **Sin ORM.** Las filas `snake_case` se mapean a objetos `camelCase` con mappers
  explícitos.
- **Mutaciones por Server Actions**, no por endpoints REST. (Las rutas `entrar` y
  `google` son Route Handlers porque tienen que poner una cookie o redirigir.)
- **Errores explícitos.** Nada de tragarse un error en silencio ni de devolver un
  fallback que oculte que algo falló.
- **Validá en el borde** todo lo que llega del cliente: teléfono normalizado,
  enteros acotados, ids verificados contra el comercio.
