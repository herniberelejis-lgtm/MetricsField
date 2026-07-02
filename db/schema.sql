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
  fecha_alta         DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS metricas_mensuales (
  comercio_id      TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  mes              TEXT NOT NULL,                    -- 'YYYY-MM'
  resenas_nuevas   INTEGER NOT NULL DEFAULT 0,
  resenas_total    INTEGER NOT NULL DEFAULT 0,
  rating_promedio  NUMERIC NOT NULL DEFAULT 0,
  posicion_maps    INTEGER NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS links_nfc (
  id           TEXT PRIMARY KEY,                     -- slug corto, único global: /t/<id>
  comercio_id  TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  etiqueta     TEXT NOT NULL,                         -- "mostrador", "mesa 4"...
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
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE
);

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
