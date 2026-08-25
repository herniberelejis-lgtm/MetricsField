-- Loyalty — PR A1: fundaciones del módulo (migración, nada de código en
-- este archivo). Módulo aditivo detrás de LOYALTY_ENABLED: si se revierte
-- este PR y el A2, Reviews queda exactamente igual, sin ninguna fila de
-- comercios/links_nfc/taps tocada salvo el ALTER puntual de abajo.
--
-- Correr a mano en el SQL Editor de Neon (o psql local) — no se auto-aplica.
-- Ver docs/CONTEXTO-Y-PROGRESO.md y el brief de Loyalty en la carpeta de
-- research del proyecto para el diseño completo.

-- Entitlement: un comercio puede ser Reviews-only, Loyalty-only o las dos
-- ("pack") con el mismo id — no hace falta panel nuevo para decidirlo.
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS tiene_loyalty BOOLEAN NOT NULL DEFAULT FALSE;

-- lat/lng: no existían en comercios. Hacen falta para el control de
-- geolocalización blanda del antifraude de Loyalty (comparar contra el
-- radio del comercio al reclamar puntos) — deterrente barato, no prueba
-- criptográfica, documentado en el diseño de antifraude del proyecto.
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS lng NUMERIC;

-- Identidad del cliente final (4to sistema de acceso del proyecto, además
-- de portal/admin/conexión-GBP). Global por teléfono, no por comercio: la
-- misma persona puede tener membresías en varios comercios sin recargar
-- sus datos cada vez.
CREATE TABLE IF NOT EXISTS clientes_finales (
  id             TEXT PRIMARY KEY,
  telefono       TEXT UNIQUE NOT NULL,
  nombre         TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  cookie_sesion  TEXT UNIQUE,               -- credencial de sesión propia, mismo patrón que el código privado del portal
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consentimiento versionado (Ley 25.326) — append-only a propósito: nunca
-- se actualiza una fila existente, se inserta una nueva cada vez que el
-- cliente vuelve a aceptar. Así queda historial completo de qué aceptó y
-- cuándo, no solo el estado actual.
CREATE TABLE IF NOT EXISTS consentimientos (
  id                BIGSERIAL PRIMARY KEY,
  cliente_final_id  TEXT NOT NULL REFERENCES clientes_finales(id) ON DELETE CASCADE,
  comercio_id       TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  version           TEXT NOT NULL,           -- versión del texto legal aceptado; si el texto cambia, se vuelve a pedir
  datos             BOOLEAN NOT NULL DEFAULT FALSE,
  marketing         BOOLEAN NOT NULL DEFAULT FALSE,
  wallet            BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente ON consentimientos(cliente_final_id, comercio_id);

-- Espejo local de la LoyaltyClass (Google) / Pass Type (Apple). Uno por
-- comercio en el wedge — sin multi-programa todavía, no hace falta.
CREATE TABLE IF NOT EXISTS programas_loyalty (
  comercio_id          TEXT PRIMARY KEY REFERENCES comercios(id) ON DELETE CASCADE,
  google_class_id      TEXT NOT NULL DEFAULT '',
  apple_pass_type_id   TEXT NOT NULL DEFAULT '',
  puntos_bienvenida    INTEGER NOT NULL DEFAULT 100,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Espejo local del LoyaltyObject (Google) / pase individual (Apple). La
-- base propia es la fuente de verdad — si la API de Google o Apple cae, la
-- membresía queda con estado 'pendiente' y un cron reintenta (Fase B).
CREATE TABLE IF NOT EXISTS membresias (
  id                    TEXT PRIMARY KEY,
  cliente_final_id      TEXT NOT NULL REFERENCES clientes_finales(id) ON DELETE CASCADE,
  comercio_id           TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  google_object_id      TEXT NOT NULL DEFAULT '',
  apple_serial_number   TEXT NOT NULL DEFAULT '',
  estado_google         TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente'|'emitido'|'error'
  estado_apple          TEXT NOT NULL DEFAULT 'pendiente',  -- Apple entra en Fase A como pase estático (ver decisión del proyecto)
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cliente_final_id, comercio_id)
);
CREATE INDEX IF NOT EXISTS idx_membresias_comercio ON membresias(comercio_id);

-- Misiones configurables por comercio. `verificacion` documenta el nivel
-- real: solo 'referido' puede ser 'automatica' sin pedir OAuth nuevo de
-- terceros (fuera de alcance actual) — reseña de Google y redes sociales
-- quedan 'autodeclarada' (sistema de honor), igual que hace la competencia
-- directa con la misma misión.
CREATE TABLE IF NOT EXISTS misiones (
  id            TEXT PRIMARY KEY,
  comercio_id   TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,                          -- 'resena_google'|'seguir_redes'|'referido'|'retorno_activo'|'cumpleanos'|'compra_minima'
  puntos        INTEGER NOT NULL DEFAULT 0,
  verificacion  TEXT NOT NULL DEFAULT 'autodeclarada',  -- 'automatica'|'autodeclarada'
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_misiones_comercio ON misiones(comercio_id);

-- Catálogo de canje, autogestionado por cada comercio.
CREATE TABLE IF NOT EXISTS beneficios (
  id            TEXT PRIMARY KEY,
  comercio_id   TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  costo_puntos  INTEGER NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beneficios_comercio ON beneficios(comercio_id);

-- Ledger append-only: el saldo de una membresía es SUM(delta), nunca se
-- sobreescribe una fila. `idem_clave` evita que un doble click duplique
-- ESTE movimiento puntual — no evita que alguien repita la acción completa
-- (eso lo cubre el rate limit de eventos_loyalty, con lib/ratelimit.ts que
-- ya usa el resto del repo).
CREATE TABLE IF NOT EXISTS movimientos_puntos (
  id            BIGSERIAL PRIMARY KEY,
  membresia_id  TEXT NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL,                -- positivo = suma, negativo = canje
  motivo        TEXT NOT NULL,                    -- 'bienvenida'|'mision'|'canje'|'ajuste_manual'
  mision_id     TEXT REFERENCES misiones(id) ON DELETE SET NULL,
  idem_clave    TEXT NOT NULL UNIQUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_membresia ON movimientos_puntos(membresia_id, creado_en);

-- Canje en mostrador: nonce de un solo uso. `id` es el propio código del
-- QR que se muestra en el celular del cliente y valida el empleado.
CREATE TABLE IF NOT EXISTS canjes (
  id            TEXT PRIMARY KEY,
  membresia_id  TEXT NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  beneficio_id  TEXT NOT NULL REFERENCES beneficios(id),
  validado      BOOLEAN NOT NULL DEFAULT FALSE,
  validado_en   TIMESTAMPTZ,
  admin_email   TEXT NOT NULL DEFAULT '',        -- quién lo validó, mismo patrón que auditoria.admin_email
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canjes_membresia ON canjes(membresia_id);

-- Log de eventos desde el día 1: los KPIs del piloto (tap→wallet, retorno a
-- 30 días) son queries sobre esta tabla, no algo que se calcule aparte. Es
-- también la base del antifraude Nivel 1 (cooldown, señal de anomalía) —
-- guarda ip_hash, nunca la IP en texto plano. Esto corrige a propósito una
-- limitación ya documentada de la tabla `taps` (no guarda IP ni nada que
-- permita revisar un patrón días después) — ver
-- docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html, sección 05.
CREATE TABLE IF NOT EXISTS eventos_loyalty (
  id                 BIGSERIAL PRIMARY KEY,
  comercio_id        TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  cliente_final_id   TEXT REFERENCES clientes_finales(id) ON DELETE SET NULL,
  tipo               TEXT NOT NULL,               -- 'tap'|'registro'|'wallet_guardada'|'mision_completada'|'canje_validado'|'cooldown_bloqueado'
  ip_hash            TEXT,
  detalle            TEXT NOT NULL DEFAULT '',
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_loyalty_comercio_fecha ON eventos_loyalty(comercio_id, creado_en);
-- Índice pensado directamente para el chequeo de cooldown del antifraude:
-- "¿este cliente ya sumó un tap en este comercio en las últimas 20h?"
CREATE INDEX IF NOT EXISTS idx_eventos_loyalty_cooldown ON eventos_loyalty(cliente_final_id, comercio_id, tipo, creado_en);
