-- Loyalty — fundaciones, reescritas (septiembre 2026).
--
-- Reemplaza por completo la versión anterior de este archivo (PR #90,
-- mergeado a `desarrollo` pero NUNCA CORRIDO en Neon — no hay una sola fila
-- de estas tablas en la base real). Por eso se reescribe el archivo entero
-- en vez de agregar una migración correctiva: no hay datos que migrar.
--
-- Qué cambia respecto de la versión anterior y por qué, en
-- docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §4 y §11:
--   · Esquema propio `loyalty` (no `public`) — permite un rol de base con
--     permisos mínimos (ver db/migrations/013_loyalty_rol.sql).
--   · La MEMBRESÍA es la credencial del cliente final (token de 256 bits,
--     se guarda su hash), no el teléfono. El teléfono es un dato de
--     contacto cifrado, con índice ciego para poder buscar por él.
--   · Identidad por PROGRAMA (por comercio), nunca global entre comercios.
--   · `saldo` denormalizado en `membresias` con CHECK >= 0: Postgres hace
--     cumplir el invariante, no la aplicación. El ledger sigue siendo
--     append-only y es la fuente de la verdad para reconciliar.
--   · `programas.id` (no `comercios.id`, que es un slug editable) es lo
--     que se usa como base del `classId` de Google Wallet — esas clases
--     no se pueden borrar nunca.
--   · Sin columnas `lat`/`lng` en `comercios`: la geolocalización blanda
--     como antifraude quedó descartada (ver §3, "entrada laxa, salida
--     estricta" — el control fuerte va en el canje, no en la visita).
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/012_loyalty_fundaciones.sql
-- Idempotente. Después correr db/migrations/013_loyalty_rol.sql (rol propio
-- con permisos mínimos) — ver ese archivo para el detalle.

BEGIN;

CREATE SCHEMA IF NOT EXISTS loyalty;

-- Entitlement: vive en la tabla núcleo porque el router del tap
-- (app/t/[slug]/page.tsx) lo consulta en cada request.
ALTER TABLE public.comercios
  ADD COLUMN IF NOT EXISTS tiene_loyalty BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------
-- Programa: un ID propio e inmutable, uno por cuenta de comercio.
-- No se reusa comercios.id (es un slug editable) porque las clases de
-- Google Wallet NO SE PUEDEN BORRAR NUNCA: si el slug cambiara, la clase
-- quedaría huérfana para siempre. cuenta_id referencia siempre la fila
-- raíz de una cuenta (nunca una sucursal) — ver comercio_padre_id y
-- resolverCuenta() en lib/db.ts: todas las sucursales de una cuenta
-- comparten un solo programa.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.programas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id          TEXT NOT NULL UNIQUE REFERENCES public.comercios(id) ON DELETE CASCADE,
  codigo_publico     TEXT NOT NULL UNIQUE,          -- segmento de /l/<codigo>
  google_class_id    TEXT NOT NULL DEFAULT '',
  apple_pass_type_id TEXT NOT NULL DEFAULT '',
  puntos_bienvenida  INTEGER NOT NULL DEFAULT 100 CHECK (puntos_bienvenida >= 0),
  -- Puntos que otorga CADA visita repetida (motivo 'visita' en el ledger,
  -- sujeta al cooldown de 20h — ver lib/db/loyalty.ts::registrarVisita).
  -- Default bajo a propósito respecto de puntos_bienvenida: el primer
  -- sello tiene que sentirse valioso sin volver el programa gratis. Es
  -- autogestionable por el comercio (L6/L7, sección de admin) — no es
  -- una regla de negocio fija en código.
  puntos_por_visita  INTEGER NOT NULL DEFAULT 10 CHECK (puntos_por_visita >= 0),
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Cliente final. Alcance POR PROGRAMA, nunca global: la misma persona en
-- dos comercios son dos filas distintas. Es más datos duplicados, y es
-- correcto — sin padrón cruzado de consumidores, cada comercio sigue
-- siendo el responsable del tratamiento de sus propios datos (Ley
-- 25.326) y MetricsField su encargado, no un responsable con una base
-- propia de consumidores.
--
-- Teléfono con índice ciego: telefono_hmac es HMAC-SHA256(E.164,
-- LOYALTY_PII_KEY) — permite el UNIQUE y la búsqueda por igualdad sin
-- guardar el valor en claro ni con cifrado determinístico (que filtraría
-- igualdad directamente en el ciphertext). telefono_cif es el valor real,
-- cifrado con AES-256-GCM, para poder mostrarlo/usarlo cuando hace falta.
-- Normalizar SIEMPRE a E.164 antes de hashear (lib/loyalty/identidad.ts) o
-- el UNIQUE no sirve: "351 555 1234", "+543515551234" y "03515551234"
-- tienen que dar el mismo resultado.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  telefono_hmac  BYTEA NOT NULL,
  telefono_cif   BYTEA NOT NULL,
  nombre_cif     BYTEA NOT NULL,
  email_cif      BYTEA,
  clave_version  SMALLINT NOT NULL DEFAULT 1,       -- permite rotar LOYALTY_PII_KEY sin migrar todo de golpe
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (programa_id, telefono_hmac)
);

-- ---------------------------------------------------------------
-- Membresía = LA CREDENCIAL del cliente final (token_hash), no el
-- teléfono. Como una tarjeta de plástico: quien tiene el token, la usa.
-- Elimina la clase entera de robo de cuenta por teléfono ajeno.
--
-- `saldo` denormalizado con CHECK (saldo >= 0): el invariante "nunca
-- negativo" lo hace cumplir Postgres, no la aplicación (ver
-- lib/db/loyalty.ts::registrarMovimiento — actualiza este campo y el
-- ledger en la misma transacción).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.membresias (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES loyalty.clientes(id) ON DELETE CASCADE,
  programa_id       UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  token_hash        BYTEA NOT NULL UNIQUE,          -- SHA-256 de un token aleatorio de 256 bits; el token nunca se guarda
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
CREATE INDEX IF NOT EXISTS idx_membresias_programa ON loyalty.membresias(programa_id);

-- ---------------------------------------------------------------
-- Ledger append-only. `saldo_despues` deja la traza de qué saldo dejó
-- cada movimiento, para poder reconciliar contra membresias.saldo y
-- detectar cualquier deriva (ver la query de reconciliación en
-- docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §5).
--
-- `idem_clave` hace DOS trabajos a la vez: idempotencia (un reintento con
-- la misma clave no duplica el movimiento — ON CONFLICT DO NOTHING en el
-- código) y cooldown de visitas (la clave de una visita incluye la
-- ventana horaria: dos intentos en la misma ventana chocan solos, sin
-- Redis ni ninguna tabla aparte).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.movimientos (
  id            BIGSERIAL PRIMARY KEY,
  membresia_id  UUID NOT NULL REFERENCES loyalty.membresias(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  saldo_despues INTEGER NOT NULL CHECK (saldo_despues >= 0),
  motivo        TEXT NOT NULL
                  CHECK (motivo IN ('bienvenida','visita','mision','canje','ajuste_manual')),
  idem_clave    TEXT NOT NULL UNIQUE,
  actor         TEXT NOT NULL DEFAULT '',           -- email del empleado/admin, solo en movimientos manuales
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_membresia ON loyalty.movimientos(membresia_id, creado_en DESC);

-- ---------------------------------------------------------------
-- Catálogo de canje, autogestionado por cada comercio desde su portal.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.beneficios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programa_id   UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 80),
  costo_puntos  INTEGER NOT NULL CHECK (costo_puntos > 0),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beneficios_programa ON loyalty.beneficios(programa_id);

-- ---------------------------------------------------------------
-- Canje. Se pide en 'pendiente' (sin descontar puntos) y se confirma
-- desde un dispositivo DEL COMERCIO — nunca desde el teléfono del
-- cliente, que es quien tiene el incentivo de falsificar la confirmación
-- (ver §6 del documento de arquitectura). `programa_id` está
-- desnormalizado A PROPÓSITO: la pantalla del comercio filtra por él, así
-- un canje de un comercio no puede confirmarse desde el portal de otro.
-- `costo_puntos` queda congelado al pedirlo, por si el comercio cambia el
-- precio del beneficio mientras el canje está pendiente.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.canjes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membresia_id   UUID NOT NULL REFERENCES loyalty.membresias(id) ON DELETE CASCADE,
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  beneficio_id   UUID NOT NULL REFERENCES loyalty.beneficios(id),
  costo_puntos   INTEGER NOT NULL CHECK (costo_puntos > 0),
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','entregado','vencido','cancelado')),
  expira_en      TIMESTAMPTZ NOT NULL,
  confirmado_en  TIMESTAMPTZ,
  confirmado_por TEXT NOT NULL DEFAULT '',          -- email del empleado del comercio que confirmó la entrega
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canjes_pendientes ON loyalty.canjes(programa_id, creado_en DESC)
  WHERE estado = 'pendiente';

-- ---------------------------------------------------------------
-- Consentimiento versionado (Ley 25.326, art. 5 y 6). Append-only a
-- propósito: nunca se actualiza una fila existente, se inserta una nueva
-- cada vez que el cliente vuelve a aceptar — así queda historial completo
-- de qué aceptó y cuándo. `texto_hash` guarda el hash del texto EXACTO
-- que se aceptó: sin eso no se puede probar qué aceptó la persona si el
-- texto legal cambió después. `edad_declarada` es la declaración de tener
-- 16 años o más (edad mínima del programa).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.consentimientos (
  id             BIGSERIAL PRIMARY KEY,
  cliente_id     UUID NOT NULL REFERENCES loyalty.clientes(id) ON DELETE CASCADE,
  programa_id    UUID NOT NULL REFERENCES loyalty.programas(id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  texto_hash     BYTEA NOT NULL,
  datos          BOOLEAN NOT NULL DEFAULT FALSE,
  wallet         BOOLEAN NOT NULL DEFAULT FALSE,
  marketing      BOOLEAN NOT NULL DEFAULT FALSE,
  edad_declarada BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent     TEXT NOT NULL DEFAULT '',
  ip_hmac        BYTEA,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente ON loyalty.consentimientos(cliente_id, creado_en DESC);

-- ---------------------------------------------------------------
-- Log de eventos desde el día uno: los KPIs del piloto (tap→wallet,
-- retorno a 30 días) son queries sobre esta tabla, no un cálculo aparte
-- que hay que mantener sincronizado.
--
-- `plataforma` es OBLIGATORIA porque el piloto exige medir tap→wallet
-- separado por Android/iPhone (mirar solo el agregado no permite saber
-- si Apple realmente aportó o si Android sostenía el promedio) — sin esta
-- columna esa medición es imposible después.
--
-- `ip_hmac` usa HMAC con clave secreta (LOYALTY_IP_PEPPER), NO un SHA-256
-- pelado: el espacio completo de direcciones IPv4 se revierte por fuerza
-- bruta en segundos con una GPU, así que un hash sin clave no es dato
-- disociado.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty.eventos (
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
CREATE INDEX IF NOT EXISTS idx_eventos_programa_fecha ON loyalty.eventos(programa_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON loyalty.eventos(programa_id, tipo, creado_en DESC);

COMMIT;
