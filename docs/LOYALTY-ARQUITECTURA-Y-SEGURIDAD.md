# Loyalty — arquitectura y modelo de seguridad

> **Qué es este documento.** La definición técnica de cómo se construye Loyalty:
> modelo de identidad, esquema de datos, integridad del saldo, canje, wallets y
> custodia de claves. Es el documento que manda sobre el *cómo*.
>
> `docs/LOYALTY-PRODUCTO-COMPLETO.md` sigue mandando sobre el *qué* y el *por qué*
> (producto, negocio, métricas del piloto). Donde este documento contradice al de
> producto, **vale este** — las secciones afectadas están listadas en §11.
>
> Escrito: septiembre 2026 · Estado: aprobado, listo para construir

---

## 1 · Las decisiones, en una tabla

| Tema | Decisión | Por qué |
|---|---|---|
| **Identidad del consumidor** | La **membresía** es la credencial (token random de 256 bits). El teléfono es un atributo de contacto | Elimina la clase entera de robo de cuenta sin agregar fricción al paso que define la métrica del piloto |
| **Alcance de la identidad** | Por **programa** (cuenta de comercio), nunca global | Seguridad y legal coinciden: sin padrón cruzado, MetricsField es *encargado* y no *responsable* |
| **Modelo de seguridad** | **Entrada laxa, salida estricta** | El control fuerte va donde sale el valor (el canje), no donde entra |
| **Canje** | Se confirma en un dispositivo **del comercio** | La confirmación nunca puede vivir en la pantalla de quien tiene el incentivo de hacer trampa |
| **NFC** | Solo para **captación**. Nunca para validar canje | Leer el pase exige terminal certificada (Apple pide que ya acepte Apple Pay). Un tag que toca el cliente no prueba presencia en el momento del canje |
| **Saldo** | Columna `saldo` con `CHECK (saldo >= 0)` + ledger append-only, ambos en la misma transacción | El invariante lo hace cumplir Postgres, no la aplicación |
| **Cooldown de visita** | Derivado de la clave de idempotencia del ledger | Es una regla contable. Vive en Postgres, no en Redis |
| **Repo** | Compartido | El acoplamiento con `comercios`, el router del tap y el portal es intrínseco |
| **Base** | Esquema `loyalty` separado, con rol propio y permisos mínimos | Es donde la separación compra seguridad real |
| **Apple en MVP** | Pase estático, **sin saldo como campo principal** | Un número congelado es peor que ningún número |

---

## 2 · Modelo de identidad

### La regla

**La membresía es la credencial.** Al registrarse se genera un token aleatorio de
256 bits. Ese token es lo único que autentica al consumidor — como una tarjeta de
plástico: quien la tiene, la usa.

- En la base se guarda **solo el SHA-256 del token**, nunca el token.
- El token viaja en una cookie `HttpOnly; Secure; SameSite=Lax` y en el link de
  respaldo que se le da al cliente ("guardá este link para ver tu tarjeta").
- El teléfono **no autentica nada**. Es un dato de contacto, cifrado en reposo.

### Qué elimina y qué no

Elimina por completo: robo de cuenta por teléfono ajeno, enumeración de
consumidores registrados, y pisado de nombre/email de otro.

**No elimina el farmeo del bono de bienvenida.** Cualquiera puede generar
membresías nuevas. La defensa no es verificar el alta — es que **los puntos solo
se convierten en algo cuando un empleado confirma el canje**. Puntos que nunca se
pueden canjear no cuestan dinero.

Consecuencia que hay que respetar al medir: el KPI "tarjetas activas ≥ 150" se
cuenta sobre membresías con **al menos una visita confirmada**, no sobre altas.
Contar altas es contar humo.

### Alcance: por programa, no global

`loyalty.clientes` cuelga de `loyalty.programas`, y un programa pertenece a una
**cuenta** de comercio. La misma persona en dos comercios son dos filas. Es más
datos duplicados y es correcto: sin padrón cruzado de consumidores, cada comercio
es el responsable del tratamiento y MetricsField es su encargado.

> **Multi-sucursal.** `comercios` tiene `comercio_padre_id`: una fila puede ser
> una sucursal que cuelga de una cuenta. El programa de Loyalty se ata a la
> **cuenta raíz** (`resolverCuenta()` en `lib/db.ts`), no a la fila de sucursal.
> Un cliente que suma puntos en una sucursal los canjea en cualquier otra.

---

## 3 · El modelo de seguridad: entrada laxa, salida estricta

Es la idea que ordena todo el resto.

**Entrada laxa.** Registrarse y sumar una visita es fácil a propósito. La métrica
que valida el producto entero es tap → wallet guardada; todo lo que agregue
fricción ahí trabaja en contra del piloto. Aceptamos que alguien pueda sumar
visitas sin estar en el local.

**Salida estricta.** El canje es la única operación donde el comercio entrega algo
de valor real. Ahí se concentran todos los controles: transacción atómica,
confirmación desde un dispositivo del comercio, identidad del empleado, y
expiración corta.

Esto es lo que nos permite **no construir** geolocalización, verificación de
horario, chips NTAG 424 ni OTP en el MVP. No es pereza: es poner el control donde
está el riesgo.

**Riesgo residual aceptado:** las visitas pueden inflarse, lo que ensucia la
métrica de recurrencia del comercio. Mitigación: el log de eventos permite
detectar el patrón después. Si aparece en los datos del piloto, se agrega
confirmación de visita del lado del comercio — que es el mismo mecanismo que ya
vamos a tener construido para el canje.

---

## 4 · Esquema corregido

Reemplaza por completo a `db/migrations/012_loyalty_fundaciones.sql` (PR #90,
ya mergeado a `desarrollo`; el archivo se renumeró de 011 a 012 al ponerse al día
contra `main`, donde otro PR ya había tomado el 011 — el contenido es el mismo que
se analiza acá). La migración **nunca se corrió** en Neon, así que se reescribe el
archivo en vez de migrar datos reales.

```sql
-- Loyalty — fundaciones. Esquema propio, rol propio, permisos mínimos.
-- Correr a mano en el SQL Editor de Neon. No se auto-aplica.

BEGIN;

CREATE SCHEMA IF NOT EXISTS loyalty;

-- Entitlement: vive en la tabla núcleo porque el router del tap lo consulta.
ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS tiene_loyalty BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------
-- Programa: un ID propio e inmutable.
-- No se reusa comercios.id (es un slug editable) porque las clases de
-- Google Wallet NO SE PUEDEN BORRAR NUNCA: si el slug cambia, la clase
-- queda huérfana para siempre.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.programas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id          TEXT NOT NULL UNIQUE REFERENCES public.comercios(id) ON DELETE CASCADE,
  codigo_publico     TEXT NOT NULL UNIQUE,          -- segmento de /l/<codigo>
  google_class_id    TEXT NOT NULL DEFAULT '',
  apple_pass_type_id TEXT NOT NULL DEFAULT '',
  puntos_bienvenida  INTEGER NOT NULL DEFAULT 100 CHECK (puntos_bienvenida >= 0),
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Cliente final. Alcance POR PROGRAMA, nunca global.
-- Teléfono con índice ciego: HMAC para buscar, cifrado para guardar.
-- Normalizar SIEMPRE a E.164 antes de hashear o el UNIQUE no sirve.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  telefono_hmac  BYTEA NOT NULL,                    -- HMAC-SHA256(E.164, LOYALTY_PII_KEY)
  telefono_cif   BYTEA NOT NULL,                    -- AES-256-GCM
  nombre_cif     BYTEA NOT NULL,
  email_cif      BYTEA,
  clave_version  SMALLINT NOT NULL DEFAULT 1,       -- permite rotar la clave sin migrar todo de golpe
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (programa_id, telefono_hmac)
);

-- ---------------------------------------------------------------
-- Membresía = la credencial. `saldo` denormalizado con CHECK: el
-- invariante "nunca negativo" lo hace cumplir Postgres.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.membresias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES loyalty.clientes(id) ON DELETE CASCADE,
  programa_id       UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  token_hash        BYTEA NOT NULL UNIQUE,          -- SHA-256 del token de 256 bits
  saldo             INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  google_object_id  TEXT NOT NULL DEFAULT '',
  apple_serial      UUID NOT NULL DEFAULT gen_random_uuid(),
  estado_google     TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_google IN ('pendiente','emitido','error')),
  estado_apple      TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_apple IN ('pendiente','emitido','error')),
  visitas           INTEGER NOT NULL DEFAULT 0 CHECK (visitas >= 0),
  ultima_visita_en  TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, programa_id)
);
CREATE INDEX idx_membresias_programa ON loyalty.membresias(programa_id);

-- ---------------------------------------------------------------
-- Ledger append-only. `saldo_despues` deja la traza para reconciliar
-- contra membresias.saldo y detectar deriva.
-- `idem_clave` hace DOS trabajos: idempotencia y cooldown (ver §5).
-- ---------------------------------------------------------------
CREATE TABLE loyalty.movimientos (
  id            BIGSERIAL PRIMARY KEY,
  membresia_id  UUID NOT NULL REFERENCES loyalty.membresias(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  saldo_despues INTEGER NOT NULL CHECK (saldo_despues >= 0),
  motivo        TEXT NOT NULL
                  CHECK (motivo IN ('bienvenida','visita','mision','canje','ajuste_manual')),
  idem_clave    TEXT NOT NULL UNIQUE,
  actor         TEXT NOT NULL DEFAULT '',           -- email del empleado/admin en movimientos manuales
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movimientos_membresia ON loyalty.movimientos(membresia_id, creado_en DESC);

-- ---------------------------------------------------------------
-- Catálogo de canje, autogestionado por el comercio.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.beneficios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id   UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 80),
  costo_puntos  INTEGER NOT NULL CHECK (costo_puntos > 0),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_beneficios_programa ON loyalty.beneficios(programa_id);

-- ---------------------------------------------------------------
-- Canje. `programa_id` está desnormalizado A PROPÓSITO: la pantalla del
-- comercio filtra por él, y así un canje de un comercio no puede ser
-- confirmado desde el portal de otro ni por error ni a propósito.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.canjes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membresia_id   UUID NOT NULL REFERENCES loyalty.membresias(id) ON DELETE CASCADE,
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  beneficio_id   UUID NOT NULL REFERENCES loyalty.beneficios(id),
  costo_puntos   INTEGER NOT NULL CHECK (costo_puntos > 0),  -- congelado al pedir
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','entregado','vencido','cancelado')),
  expira_en      TIMESTAMPTZ NOT NULL,
  confirmado_en  TIMESTAMPTZ,
  confirmado_por TEXT NOT NULL DEFAULT '',          -- email del empleado del comercio
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_canjes_pendientes ON loyalty.canjes(programa_id, creado_en DESC)
  WHERE estado = 'pendiente';

-- ---------------------------------------------------------------
-- Consentimiento versionado (Ley 25.326). Append-only: nunca se
-- actualiza, siempre se inserta una fila nueva.
-- `texto_hash` guarda el hash del texto EXACTO que se aceptó — sin eso
-- no se puede probar qué aceptó la persona si el texto cambió después.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.consentimientos (
  id             BIGSERIAL PRIMARY KEY,
  cliente_id     UUID NOT NULL REFERENCES loyalty.clientes(id) ON DELETE CASCADE,
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  texto_hash     BYTEA NOT NULL,
  datos          BOOLEAN NOT NULL DEFAULT FALSE,
  wallet         BOOLEAN NOT NULL DEFAULT FALSE,
  marketing      BOOLEAN NOT NULL DEFAULT FALSE,
  edad_declarada BOOLEAN NOT NULL DEFAULT FALSE,    -- declara 16 años o más
  user_agent     TEXT NOT NULL DEFAULT '',
  ip_hmac        BYTEA,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consentimientos_cliente ON loyalty.consentimientos(cliente_id, creado_en DESC);

-- ---------------------------------------------------------------
-- Log de eventos: los KPIs del piloto son queries sobre esta tabla.
-- `plataforma` es obligatoria porque el piloto exige medir tap→wallet
-- SEPARADO por Android/iPhone, y sin esta columna no se puede.
-- `ip_hmac` con clave secreta, NO SHA-256 pelado: el espacio IPv4 entero
-- se revierte por fuerza bruta en segundos.
-- ---------------------------------------------------------------
CREATE TABLE loyalty.eventos (
  id           BIGSERIAL PRIMARY KEY,
  programa_id  UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  membresia_id UUID REFERENCES loyalty.membresias(id) ON DELETE SET NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN (
                 'tap','registro','wallet_guardada','visita','canje_pedido',
                 'canje_confirmado','canje_vencido','cooldown_bloqueado')),
  plataforma   TEXT NOT NULL DEFAULT 'otro' CHECK (plataforma IN ('android','ios','otro')),
  ip_hmac      BYTEA,
  detalle      JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_eventos_programa_fecha ON loyalty.eventos(programa_id, creado_en DESC);
CREATE INDEX idx_eventos_tipo ON loyalty.eventos(programa_id, tipo, creado_en DESC);

COMMIT;
```

### Permisos — el append-only como permiso, no como convención

Se corre una sola vez, con el rol dueño del esquema:

```sql
-- Rol de la app para Loyalty. La contraseña va a LOYALTY_DATABASE_URL.
CREATE ROLE app_loyalty LOGIN PASSWORD '<generar>';

GRANT USAGE ON SCHEMA loyalty TO app_loyalty;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA loyalty TO app_loyalty;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA loyalty TO app_loyalty;

-- El ledger es inmutable. Ni la app puede reescribir historia.
REVOKE UPDATE, DELETE ON loyalty.movimientos FROM app_loyalty;
REVOKE UPDATE, DELETE ON loyalty.consentimientos FROM app_loyalty;

-- Lectura mínima del núcleo: solo lo que el router del tap necesita.
GRANT USAGE ON SCHEMA public TO app_loyalty;
GRANT SELECT (id, nombre, tiene_loyalty, comercio_padre_id) ON public.comercios TO app_loyalty;
```

> Si el `REVOKE` rompe un `INSERT ... ON CONFLICT DO UPDATE` en el ledger, el
> código está mal, no el permiso. El ledger solo se inserta.

---

## 5 · Integridad del saldo

### El bug que hay que no repetir

El código actual (`lib/db/loyalty.ts`) inserta el movimiento y **después** suma el
saldo, en dos sentencias sin transacción. Dos canjes simultáneos leen el mismo
saldo, los dos ven fondos, los dos descuentan: **saldo negativo**. Es pérdida de
dinero directa y es el defecto más caro del código actual.

### Cómo se hace bien

Una transacción, y el `UPDATE` condicional hace de candado:

```ts
export async function registrarMovimiento(datos: {
  membresiaId: string;
  delta: number;
  motivo: Motivo;
  idemClave: string;
  actor?: string;
}): Promise<{ saldo: number; aplicado: boolean }> {
  return sqlLoyalty.begin(async (tx) => {
    // 1. Mueve el saldo y bloquea la fila. Si delta es negativo y no
    //    alcanza, no actualiza ninguna fila: fondos insuficientes.
    const filas = await tx`
      UPDATE loyalty.membresias
         SET saldo = saldo + ${datos.delta}
       WHERE id = ${datos.membresiaId}
         AND saldo + ${datos.delta} >= 0
      RETURNING saldo
    `;
    if (filas.length === 0) throw new SaldoInsuficiente();

    // 2. Asienta en el ledger. El UNIQUE de idem_clave corta el duplicado.
    const mov = await tx`
      INSERT INTO loyalty.movimientos
        (membresia_id, delta, saldo_despues, motivo, idem_clave, actor)
      VALUES (${datos.membresiaId}, ${datos.delta}, ${filas[0].saldo},
              ${datos.motivo}, ${datos.idemClave}, ${datos.actor ?? ""})
      ON CONFLICT (idem_clave) DO NOTHING
      RETURNING id
    `;

    // 3. Si el movimiento ya existía, deshacer el paso 1.
    //    Es un reintento, no un movimiento nuevo.
    if (mov.length === 0) throw new MovimientoDuplicado();

    return { saldo: Number(filas[0].saldo), aplicado: true };
  });
}
```

`MovimientoDuplicado` aborta la transacción, lo que revierte el `UPDATE` del saldo.
El llamador lo trata como **éxito** (el movimiento ya estaba aplicado), no como
error — si lo trata como error y reintenta, duplica.

### El cooldown, sin Redis

`idem_clave` deriva de la **intención**, no de un UUID aleatorio. Para una visita:

```
visita:<membresia_id>:<floor(epoch_segundos / 72000)>
```

72000 segundos son 20 horas. El `UNIQUE` sobre `idem_clave` **es** el cooldown: el
segundo intento en la misma ventana choca y no inserta. Un solo mecanismo, dos
garantías, y vive en Postgres donde tiene que vivir.

Redis (`lib/ratelimit.ts`) se queda **solo** para anti-DoS por IP, donde fallar
abierto es tolerable. Nunca para reglas que emiten valor.

### Reconciliación

Un chequeo semanal en el cron que ya existe:

```sql
SELECT m.id, m.saldo, COALESCE(SUM(v.delta), 0) AS ledger
  FROM loyalty.membresias m
  LEFT JOIN loyalty.movimientos v ON v.membresia_id = m.id
 GROUP BY m.id, m.saldo
HAVING m.saldo <> COALESCE(SUM(v.delta), 0);
```

Cero filas es lo esperado. Cualquier fila es un bug y se avisa por email.

---

## 6 · Canje

### El flujo

```
1. El cliente abre su tarjeta (link o cookie) y pide un beneficio
                    ↓
2. Se crea loyalty.canjes en estado 'pendiente', con expira_en = ahora + 5 min.
   NO se descuentan puntos todavía.
                    ↓
3. Aparece en vivo en la pantalla del comercio: nombre, beneficio, cuenta regresiva
                    ↓
4. El empleado entrega el premio y toca "Entregado"
                    ↓
5. Recién ahí: transacción única que marca el canje y descuenta los puntos
```

### Por qué se descuenta al final y no al pedir

Si se descontara al pedir, un cliente podría dejar canjes vencidos consumiendo su
saldo y habría que construir un proceso de devolución. Descontando al confirmar,
un canje que vence simplemente no pasó nada.

Contrapartida: el saldo puede alcanzar para dos canjes pedidos a la vez pero solo
para uno confirmado. Lo resuelve el `UPDATE ... AND saldo + delta >= 0` del §5: el
segundo falla con fondos insuficientes y el empleado ve el motivo en pantalla.

### La confirmación, atómica

```sql
UPDATE loyalty.canjes
   SET estado = 'entregado',
       confirmado_en = now(),
       confirmado_por = $3
 WHERE id = $1
   AND programa_id = $2      -- el comercio solo confirma lo suyo
   AND estado = 'pendiente'
   AND expira_en > now()
RETURNING membresia_id, costo_puntos;
```

Cero filas devueltas significa: ya se confirmó, venció, o no es de este comercio.
Nunca se lee primero para decidir después — eso es la condición de carrera.

Con la fila devuelta, y **dentro de la misma transacción**, se llama a
`registrarMovimiento` con `delta = -costo_puntos` e
`idemClave = 'canje:<canje_id>'`.

### Quién confirma

La pantalla de canje vive en el portal del comercio, detrás del login de Google
que ya existe (`portal_usuarios`, `lib/portal-auth.ts`). `confirmado_por` guarda
el email — así hay traza de qué empleado confirmó cada entrega, que es el control
contra la colusión interna.

> **Cambio de naturaleza del portal.** Hoy es de solo lectura. El canje es su
> primera escritura. Esa pantalla se trata con el cuidado del panel de admin, no
> con el de una vista: toda acción empieza validando la sesión y que el
> `programa_id` pertenezca al comercio de esa sesión.

---

## 7 · Wallets — correcciones al código actual

### Google

**Lo que está bien y no se toca:** el enfoque de cuenta de servicio + REST directo
sigue vigente sin deprecaciones. Y mandar `reviewStatus: "UNDER_REVIEW"` en cada
actualización **es correcto** según la documentación de Google, incluso con la
clase ya aprobada — no es un bug.

**Lo que hay que cambiar:**

1. **El link de guardado no debe llevar el objeto inline.** Hay un límite real de
   ~1800 caracteres de URL. Como el objeto ya se crea por API antes, el JWT solo
   debe referenciarlo:
   ```ts
   payload: { loyaltyObjects: [{ id: objectId }] }
   ```
2. **El `classId` sale de `programas.id`**, no de `comercios.id`. Las clases no se
   pueden borrar nunca y el slug es editable.
3. **Rate limit de 20 req/s.** Toda escritura a Google pasa por una cola con
   reintentos y backoff, nunca directo desde el request del usuario.

### Apple

**El pase del MVP es estático y no muestra el saldo como campo principal.** Un
número congelado que nunca cambia es peor que no mostrarlo: genera un reclamo
("dice 100 y yo tengo 300"). El pase muestra el nombre del miembro y un link a la
tarjeta web, que sí está viva.

El saldo en vivo dentro del pase llega en Fase B, con el PassKit Web Service
(cuatro endpoints + APNs). Dos precisiones para cuando toque: usar **auth key .p8**
en vez de certificado (no vence nunca), e implementar `POST /v1/log` primero,
porque es la única visibilidad sobre por qué Wallet rechaza algo.

**Tranquilizador:** el vencimiento anual del certificado **no rompe los pases ya
instalados**. Solo impide emitir nuevos y actualizar los existentes.

---

## 8 · Custodia de claves — el activo más sensible del proyecto

La clave privada de Google Wallet y la clave del certificado de Apple permiten
**emitir y actualizar pases en el teléfono de cualquier cliente de cualquier
comercio**, sin tocar nuestra base ni nuestro servidor. Son más sensibles que
`DATABASE_URL`.

Reglas:

- Viven **solo** en variables de entorno de Vercel, marcadas como *sensitive*.
  Nunca en el repo, nunca en un `.env` commiteado, nunca en un mensaje de Slack.
- Se agrega `LOYALTY_PII_KEY` (cifrado y HMAC de datos personales) y
  `LOYALTY_IP_PEPPER` (HMAC de IPs) a la misma categoría.
- El acceso a producción en Vercel se limita a quien realmente lo necesita.
- **Runbook de rotación escrito antes de lanzar**, no después: qué se regenera,
  en qué orden, y qué se rompe mientras tanto.
- Recordatorio en calendario **30 días antes** del vencimiento del certificado de
  Apple. Es la causa número uno de caída silenciosa en productos de wallet.

---

## 9 · Legal — lo que bloquea el lanzamiento

Research completo con fuentes en la conversación de diseño. Lo operativo:

**Ley 25.326 sigue vigente** (la reforma está en trámite temprano, no sancionada).

| Requisito | Qué hay que hacer |
|---|---|
| **Roles** | Cada comercio es responsable; MetricsField es encargado. Exige **anexo de tratamiento de datos firmado con cada comercio** (art. 25 Decreto 1558/2001). Sin eso, ante un reclamo no hay cómo sostener que somos encargados |
| **Transferencia internacional** | Neon/AWS está en EEUU, que **no es país adecuado**. Se sostiene con **consentimiento expreso e informado** que nombre el destino y a Google/Apple. Tiene que estar en el texto del checkbox, no escondido en la política |
| **Bloque informativo art. 6** | Visible **en el formulario**, no solo un link: finalidad, identidad y domicilio del responsable, carácter voluntario, y cómo ejercer acceso/rectificación/supresión |
| **Checkboxes** | Tres, **desmarcados por defecto**. El de marketing separado y claramente opcional |
| **Evidencia** | Por cada alta: versión, hash del texto exacto, timestamp, user agent, IP con HMAC. Ya está en el esquema |
| **Derechos** | Acceso: **10 días corridos**. Rectificación y supresión: **5 días hábiles**. Baja total y baja solo de marketing, separadas, desde la web |
| **Borrado real** | Cascada en Postgres + **revocación del pase** en Google/Apple. El `ON DELETE CASCADE` ya está |
| **Edad** | Mínimo declarado **16 años** |
| **Registro AAIP** | Inscripción de bases sigue siendo obligatoria, sin umbral de tamaño. Primeros meses, no bloqueante del piloto |

> Esto es research, no asesoramiento legal. Los textos y el contrato con los
> comercios los valida un abogado antes de encender el flag.

---

## 10 · Qué NO se construye en el MVP

Explícito para que nadie lo agregue "de paso":

- **Misiones.** Ni reseña, ni redes, ni referidos. El piloto mide si la gente
  guarda la tarjeta y vuelve; las misiones son la capa de encima.
- **Geolocalización y horario del comercio como antifraude.** La ubicación del
  navegador la provee el cliente y se falsea en segundos. Es teatro.
- **NTAG 424 DNA.** Ver §1.
- **OTP.** Ver §2.
- **PassKit Web Service / push de Apple.** Fase B.
- **Vertical de Mercado Libre.** Requiere convertir ese dashboard en multi-cliente,
  que es un proyecto aparte.

---

## 11 · Qué cambia respecto de `LOYALTY-PRODUCTO-COMPLETO.md`

| Sección | Qué decía | Qué vale ahora |
|---|---|---|
| §5, §7 | Identidad global por teléfono; `ip_hash` SHA-256 | Identidad por programa con la membresía como credencial; `ip_hmac` con clave secreta |
| §6 | Misiones en el alcance inicial | Fuera del MVP |
| §6 | Canje con QR de un solo uso mostrado por el cliente | Canje confirmado desde la pantalla del comercio |
| §7 | Antifraude con geolocalización, horario y cooldown en Redis | Entrada laxa / salida estricta. Cooldown en Postgres. Sin geolocalización |
| §10 | Nueve tablas en `public` | Esquema `loyalty` con rol propio; tablas y columnas corregidas |
| §11 | "Apple como pase estático" | Se mantiene, pero **sin el saldo como campo principal** |
| §12 | "Nadie pidió esto todavía" | Hay comercios comprometidos para el piloto |
| §13 | "Tarjetas activas ≥150" | Se cuenta sobre membresías con **≥1 visita confirmada** |

Lo que **no** cambia: el mismo repo, el flag `LOYALTY_ENABLED`, el triple candado
del router del tap, la base propia como fuente de verdad, y que si se borra el
módulo entero Reviews queda exactamente igual.
