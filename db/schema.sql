-- Esquema de Taply. Postgres puro (sin ORM) — pensado para correr igual
-- en local y en Neon (producción). Todas las tablas usan CREATE TABLE IF
-- NOT EXISTS: correr este archivo de nuevo no rompe nada.

CREATE TABLE IF NOT EXISTS comercios (
  id                 TEXT PRIMARY KEY,              -- slug, ej: "barberia-guemes"
  codigo_acceso      TEXT UNIQUE NOT NULL,           -- código privado del portal del cliente
  nombre             TEXT NOT NULL,
  rubro              TEXT NOT NULL,
  zona               TEXT NOT NULL,
  plan               TEXT NOT NULL,                  -- 'Base' | 'Premium'
  estado             TEXT NOT NULL,                  -- 'prospecto' | 'activo' | 'pausado' | 'baja'
  contacto           TEXT NOT NULL DEFAULT '',
  google_review_url  TEXT NOT NULL DEFAULT '',
  busqueda_clave     TEXT NOT NULL DEFAULT '',
  fee                NUMERIC NOT NULL DEFAULT 0,
  tono_marca         TEXT NOT NULL DEFAULT 'cercano', -- usado por el generador de respuestas
  fecha_alta         DATE NOT NULL DEFAULT CURRENT_DATE,
  google_place_id    TEXT NOT NULL DEFAULT '',        -- para sincronizar rating/reseñas por Places API
  google_location    TEXT NOT NULL DEFAULT '',        -- ficha en Business Profile ("locations/…"), se vincula sola
  rating_google       NUMERIC,                        -- último rating traído automáticamente
  resenas_google      INTEGER,                        -- último total de reseñas traído automáticamente
  google_sync_en      TIMESTAMPTZ,                     -- cuándo se sincronizó por última vez
  google_refresh_token TEXT NOT NULL DEFAULT '',       -- OAuth propio del cliente (Business Profile), no de la agencia
  google_conectado_en  TIMESTAMPTZ,                    -- cuándo autorizó su cuenta de Google — sirve para el aviso de reconexión semanal (app en modo Testing)
  auto_responder_positivas BOOLEAN NOT NULL DEFAULT TRUE, -- responder solas las reseñas positivas (requiere Reviews API aprobada — ver GOOGLE_REVIEWS_API_ENABLED)
  auto_responder_umbral    INTEGER NOT NULL DEFAULT 4 CHECK (auto_responder_umbral IN (4, 5)), -- a partir de cuántas estrellas se responde sola
  resenas_sync_en          TIMESTAMPTZ                 -- última sincronización de reseñas vía Google Reviews API
);

-- Ajustes de la agencia (clave/valor). Uso general para configuración suelta.
CREATE TABLE IF NOT EXISTS ajustes (
  clave           TEXT PRIMARY KEY,
  valor           TEXT NOT NULL,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuentas de Google admitidas para entrar al panel interno (allowlist del
-- equipo). El login con contraseña sigue funcionando como respaldo, pero
-- solo el login con Google deja identificada a la persona en `auditoria`.
CREATE TABLE IF NOT EXISTS admins (
  email       TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL DEFAULT '',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro de acciones del equipo dentro del panel — qué se hizo y quién
-- (si entró con Google; si entró con la contraseña compartida queda como
-- "equipo (sin identificar)").
CREATE TABLE IF NOT EXISTS auditoria (
  id           BIGSERIAL PRIMARY KEY,
  admin_email  TEXT NOT NULL DEFAULT '',
  accion       TEXT NOT NULL,
  detalle      TEXT NOT NULL DEFAULT '',
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(creado_en DESC);

CREATE TABLE IF NOT EXISTS metricas_mensuales (
  comercio_id      TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  mes              TEXT NOT NULL,                    -- 'YYYY-MM'
  resenas_nuevas   INTEGER NOT NULL DEFAULT 0,
  resenas_total    INTEGER NOT NULL DEFAULT 0,
  rating_promedio  NUMERIC NOT NULL DEFAULT 0,
  posicion_maps    INTEGER NOT NULL DEFAULT 0,  -- legacy: la app ya no la lee ni la escribe
  visitas_perfil   INTEGER NOT NULL DEFAULT 0,
  llamadas         INTEGER NOT NULL DEFAULT 0,
  clics_como_llegar INTEGER NOT NULL DEFAULT 0,
  citas_chatgpt    INTEGER,
  citas_copilot    INTEGER,
  citas_perplexity INTEGER,
  PRIMARY KEY (comercio_id, mes)
);

CREATE TABLE IF NOT EXISTS ventas_nfc (
  id                SERIAL PRIMARY KEY,
  comercio_id       TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  formato           TEXT NOT NULL,                   -- 'Sticker' | 'Tarjeta PVC' | 'Standee' | 'Pack completo'
  cantidad          INTEGER NOT NULL DEFAULT 1,
  precio_unitario   NUMERIC NOT NULL DEFAULT 0,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE
);

-- El gestor de links: la URL corta que el comercio nunca cambia
-- (taply.app/t/<slug>) pero cuyo destino se administra desde el panel.
-- comercio_id puede ser NULL: son piezas de hardware pre-generadas en lote
-- (impresas antes de saber a qué cliente van) que todavía esperan en el
-- inventario para asignarse — ver "Hardware" en el panel.
CREATE TABLE IF NOT EXISTS links_nfc (
  id           TEXT PRIMARY KEY,                     -- slug corto, único global: /t/<id> — FIJO una vez impreso
  comercio_id  TEXT REFERENCES comercios(id) ON DELETE SET NULL,
  etiqueta     TEXT NOT NULL DEFAULT '',               -- "mostrador", "mesa 4"... vacío mientras está libre
  tipo         TEXT NOT NULL DEFAULT 'nfc',            -- 'nfc'|'qr'|'ambos' — qué soporte físico es
  lote         TEXT NOT NULL DEFAULT '',                -- identifica la tanda de fabricación/pedido
  destino      TEXT NOT NULL DEFAULT 'resena',         -- 'resena'|'menu'|'instagram'|'promo'|'url_custom'
  url_destino  TEXT,                                   -- solo si destino = 'url_custom' u otro fijo
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada tap registrado (solo inserción, nunca se edita).
CREATE TABLE IF NOT EXISTS taps (
  id          BIGSERIAL PRIMARY KEY,
  link_id     TEXT NOT NULL REFERENCES links_nfc(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_taps_link_fecha ON taps(link_id, creado_en);

-- Feedback privado (1-3 estrellas, star-gate legal: nunca reemplaza la
-- opción pública, solo se ofrece antes).
CREATE TABLE IF NOT EXISTS feedback (
  id               SERIAL PRIMARY KEY,
  comercio_id      TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  estrellas        INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 3),
  texto            TEXT NOT NULL DEFAULT '',
  contacto         TEXT,
  estado           TEXT NOT NULL DEFAULT 'nuevo',      -- 'nuevo'|'en_proceso'|'resuelto'
  notas_internas   TEXT NOT NULL DEFAULT '',
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM de reseñas (las que el fundador carga a mano mientras no haya API
-- oficial de Google Business Profile).
CREATE TABLE IF NOT EXISTS resenas (
  id                    SERIAL PRIMARY KEY,
  comercio_id           TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  autor                 TEXT NOT NULL,
  estrellas             INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  texto                 TEXT NOT NULL DEFAULT '',
  plataforma            TEXT NOT NULL DEFAULT 'google', -- 'google'|'otra'
  estado                TEXT NOT NULL DEFAULT 'nueva',   -- 'nueva'|'respondida'|'escalada'|'resuelta'
  respuesta_sugerida    TEXT,
  respuesta_publicada   BOOLEAN NOT NULL DEFAULT FALSE,
  responsable           TEXT,
  notas                 TEXT NOT NULL DEFAULT '',
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  origen_google_id           TEXT,                     -- resource name en Google ("accounts/…/locations/…/reviews/…"), NULL si se cargó a mano
  publicada_automaticamente  BOOLEAN NOT NULL DEFAULT FALSE -- true si la respondió sola el sync (reseña positiva + automatización activa)
);

-- Único solo entre las reseñas que vienen de Google — evita duplicar si el
-- sync corre dos veces. Las cargadas a mano en el CRM quedan con NULL.
CREATE UNIQUE INDEX IF NOT EXISTS resenas_origen_google_id_idx
  ON resenas (origen_google_id)
  WHERE origen_google_id IS NOT NULL;

-- Audit GEO: registro manual asistido de si la IA recomienda al comercio.
CREATE TABLE IF NOT EXISTS audits_geo (
  id                       SERIAL PRIMARY KEY,
  comercio_id              TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  fecha                    DATE NOT NULL DEFAULT CURRENT_DATE,
  pregunta                 TEXT NOT NULL,
  plataforma               TEXT NOT NULL,               -- 'ChatGPT'|'Claude'|'Perplexity'|'Gemini'|'Otra'
  aparece                  BOOLEAN NOT NULL,
  competidores_mencionados TEXT NOT NULL DEFAULT ''
);

-- Checklist SEO: un ítem estandarizado por fila. hecho=false hasta marcarlo.
CREATE TABLE IF NOT EXISTS checklist_seo (
  comercio_id     TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  item_key        TEXT NOT NULL,
  hecho           BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comercio_id, item_key)
);

-- Competidores cargados a mano (rating/reseñas actualizados manualmente
-- cada semana, o vía Google Places API si hay key configurada).
CREATE TABLE IF NOT EXISTS competidores (
  id               SERIAL PRIMARY KEY,
  comercio_id      TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  rating           NUMERIC,
  total_resenas    INTEGER,
  google_place_id  TEXT,
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foto mensual de cada competidor: su rating y total de reseñas "al corte"
-- de cada mes. El snapshot del mes en curso se va pisando (upsert) en cada
-- sincronización; cuando el mes cambia, la fila del mes anterior queda
-- congelada con su último valor. Así se arma el benchmarking histórico sin
-- depender de que alguien anote nada a mano cada 30 días.
CREATE TABLE IF NOT EXISTS competidores_snapshots (
  competidor_id  INTEGER NOT NULL REFERENCES competidores(id) ON DELETE CASCADE,
  comercio_id    TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,                    -- denormalizado para mostrar aunque cambie
  mes            TEXT NOT NULL,                    -- 'YYYY-MM'
  rating         NUMERIC,
  total_resenas  INTEGER,
  capturado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competidor_id, mes)
);
CREATE INDEX IF NOT EXISTS idx_comp_snap_comercio ON competidores_snapshots(comercio_id, mes);

-- Cobros del abono mensual (y otros conceptos) de cada comercio. La cobranza
-- se opera a mano desde /admin/finanzas: se registra el cobro del período y
-- se marca pagado cuando entra. El estado "vencido" se deriva en la vista
-- (pendiente + vence_el pasado), no se guarda como transición.
CREATE TABLE IF NOT EXISTS cobros (
  id           SERIAL PRIMARY KEY,
  comercio_id  TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  periodo      TEXT NOT NULL,                       -- 'YYYY-MM' que cubre el cobro
  concepto     TEXT NOT NULL DEFAULT 'abono',        -- 'abono' | 'nfc' | 'otro'
  monto        NUMERIC NOT NULL DEFAULT 0,
  estado       TEXT NOT NULL DEFAULT 'pendiente',    -- 'pendiente' | 'pagado'
  metodo       TEXT NOT NULL DEFAULT '',             -- transferencia, efectivo, MP…
  vence_el     DATE,
  pagado_el    DATE,
  nota         TEXT NOT NULL DEFAULT '',
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cobros_comercio ON cobros(comercio_id, periodo);

-- Prospectos: locales a los que se les está vendiendo, todavía no son
-- clientes (eso pasa recién cuando se dan de alta en `comercios`). Tabla
-- separada a propósito, es prospección, no operación de un cliente activo.
CREATE TABLE IF NOT EXISTS prospectos (
  id          TEXT PRIMARY KEY,
  local       TEXT NOT NULL DEFAULT '',
  zona        TEXT NOT NULL DEFAULT '',
  contacto    TEXT NOT NULL DEFAULT '',
  redes       TEXT NOT NULL DEFAULT '',
  web         TEXT NOT NULL DEFAULT '',
  resenas     TEXT NOT NULL DEFAULT '',
  producto    TEXT NOT NULL DEFAULT '',
  precio      TEXT NOT NULL DEFAULT '',
  estado      TEXT NOT NULL DEFAULT 'a-contactar',
  seg_fecha   TEXT NOT NULL DEFAULT '',
  seg_texto   TEXT NOT NULL DEFAULT '',
  notas       TEXT NOT NULL DEFAULT '',
  capturas    JSONB NOT NULL DEFAULT '[]',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
