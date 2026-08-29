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
  resenas_sync_en          TIMESTAMPTZ,                -- última sincronización de reseñas vía Google Reviews API
  email_notificaciones     TEXT NOT NULL DEFAULT '',   -- a dónde mandar la alerta de reseña mala y el resumen mensual; vacío = no se manda nada
  tiene_loyalty            BOOLEAN NOT NULL DEFAULT FALSE, -- entitlement del módulo Loyalty — un comercio puede ser Reviews-only, Loyalty-only o pack
  lat                      NUMERIC,                    -- para el control de geolocalización blanda de Loyalty (ver eventos_loyalty)
  lng                      NUMERIC,
  -- Multi-sucursal: NULL = esta fila es una cuenta (comportamiento de
  -- siempre, un solo local). No NULL = esta fila es una sucursal que
  -- cuelga de la cuenta apuntada — codigo_acceso/plan/fee/contacto/
  -- tono_marca/email_notificaciones/auto_responder_* de una sucursal se
  -- ignoran: siempre se leen de la fila raíz vía resolverCuenta() en
  -- lib/db.ts. Todo lo demás (Google Place ID, rating, links, reseñas,
  -- checklist, competidores) vive por fila = por local, sin cambios.
  comercio_padre_id        TEXT REFERENCES comercios(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comercios_padre ON comercios(comercio_padre_id);

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
CREATE INDEX IF NOT EXISTS idx_ventas_nfc_comercio ON ventas_nfc(comercio_id);

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
  destino      TEXT NOT NULL DEFAULT 'resena',         -- 'resena'|'menu'|'instagram'|'promo'|'url_custom' — etiqueta descriptiva, no condiciona el redirect (ver url_destino)
  url_destino  TEXT,                                   -- si tiene valor, el cartel manda SIEMPRE ahí (sin importar destino); vacío = manda a la reseña de Google del comercio
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  autogestionado BOOLEAN NOT NULL DEFAULT FALSE,        -- true = el propio comprador la activó (canal Mercado Libre, sin comercio_id)
  nombre_negocio TEXT NOT NULL DEFAULT '',              -- solo para piezas autogestionadas: nombre elegido por el comprador
  pin_hash     TEXT,                                    -- solo para piezas autogestionadas: PIN de edición (scrypt, ver lib/pin.ts)
  pin_salt     TEXT,
  nombre_empleado TEXT NOT NULL DEFAULT '',              -- tarjeta personal de un empleado (ej. "Juan Pérez"); vacío = tarjeta de mostrador/mesa. Se usa para buscar menciones en el texto de las reseñas — ver lib/empleados.ts
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_links_nfc_comercio ON links_nfc(comercio_id);

-- Cada tap registrado (solo inserción, nunca se edita).
CREATE TABLE IF NOT EXISTS taps (
  id          BIGSERIAL PRIMARY KEY,
  link_id     TEXT NOT NULL REFERENCES links_nfc(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_taps_link_fecha ON taps(link_id, creado_en);

-- Tabla histórica: pertenecía al "star-gate" (desvío de 1-3★ a un
-- formulario privado), eliminado del producto. El código ya no lee ni
-- escribe acá — se conserva solo por los datos ya guardados. No borrar
-- sin decisión explícita del dueño (implica DROP con pérdida de datos).
-- La tabla `feedback` guardaba los reclamos privados de quien puntuaba 1-3★
-- cuando existía el star-gate. Esa función se eliminó del producto (es
-- "review gating", Google lo penaliza) y ninguna línea de código la lee ni
-- la escribe. No se declara más acá: una base nueva no debe crearla.
-- Para sacarla de una base existente ver db/migrations/010_limpieza_base.sql,
-- que primero te dice si tiene reclamos históricos para exportar.

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
  publicada_automaticamente  BOOLEAN NOT NULL DEFAULT FALSE, -- true si la respondió sola el sync (reseña positiva + automatización activa)
  creado_en                  TIMESTAMPTZ               -- hora exacta si se conoce (Google o cargada a mano) — NULL en reseñas viejas, solo había DATE
);

-- Único solo entre las reseñas que vienen de Google — evita duplicar si el
-- sync corre dos veces. Las cargadas a mano en el CRM quedan con NULL.
CREATE UNIQUE INDEX IF NOT EXISTS resenas_origen_google_id_idx
  ON resenas (origen_google_id)
  WHERE origen_google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resenas_comercio ON resenas(comercio_id, fecha DESC);

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
CREATE INDEX IF NOT EXISTS idx_audits_geo_comercio ON audits_geo(comercio_id, fecha DESC);

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
CREATE INDEX IF NOT EXISTS idx_competidores_comercio ON competidores(comercio_id);

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

-- Las tablas `cobros` (cobranza/finanzas) y `prospectos` (pipeline de venta)
-- se eliminaron del producto — panel simplificado a las métricas clave de la
-- cartera. No se declaran acá: una base nueva no debe crearlas.
--
-- Si siguen existiendo en una base vieja, db/migrations/010_limpieza_base.sql
-- las detecta, te dice cuántas filas tienen y trae los DROP comentados con el
-- comando de export al lado. Ojo con `prospectos`: si tiene datos es pipeline
-- de venta real, exportalo antes de borrar nada.

-- ============================================================
-- Loyalty — módulo aditivo detrás de LOYALTY_ENABLED. Si se revierte,
-- Reviews queda exactamente igual. Ver db/migrations/011_loyalty_fundaciones.sql
-- para el detalle de cada decisión (por qué append-only, por qué ip_hash
-- y no IP, por qué clientes_finales es global y no por comercio, etc.).
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes_finales (
  id             TEXT PRIMARY KEY,
  telefono       TEXT UNIQUE NOT NULL,
  nombre         TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  cookie_sesion  TEXT UNIQUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consentimientos (
  id                BIGSERIAL PRIMARY KEY,
  cliente_final_id  TEXT NOT NULL REFERENCES clientes_finales(id) ON DELETE CASCADE,
  comercio_id       TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  version           TEXT NOT NULL,
  datos             BOOLEAN NOT NULL DEFAULT FALSE,
  marketing         BOOLEAN NOT NULL DEFAULT FALSE,
  wallet            BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente ON consentimientos(cliente_final_id, comercio_id);

CREATE TABLE IF NOT EXISTS programas_loyalty (
  comercio_id          TEXT PRIMARY KEY REFERENCES comercios(id) ON DELETE CASCADE,
  google_class_id      TEXT NOT NULL DEFAULT '',
  apple_pass_type_id   TEXT NOT NULL DEFAULT '',
  puntos_bienvenida    INTEGER NOT NULL DEFAULT 100,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membresias (
  id                    TEXT PRIMARY KEY,
  cliente_final_id      TEXT NOT NULL REFERENCES clientes_finales(id) ON DELETE CASCADE,
  comercio_id           TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  google_object_id      TEXT NOT NULL DEFAULT '',
  apple_serial_number   TEXT NOT NULL DEFAULT '',
  estado_google         TEXT NOT NULL DEFAULT 'pendiente',
  estado_apple          TEXT NOT NULL DEFAULT 'pendiente',
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cliente_final_id, comercio_id)
);
CREATE INDEX IF NOT EXISTS idx_membresias_comercio ON membresias(comercio_id);

CREATE TABLE IF NOT EXISTS misiones (
  id            TEXT PRIMARY KEY,
  comercio_id   TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  puntos        INTEGER NOT NULL DEFAULT 0,
  verificacion  TEXT NOT NULL DEFAULT 'autodeclarada',
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_misiones_comercio ON misiones(comercio_id);

CREATE TABLE IF NOT EXISTS beneficios (
  id            TEXT PRIMARY KEY,
  comercio_id   TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  costo_puntos  INTEGER NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beneficios_comercio ON beneficios(comercio_id);

CREATE TABLE IF NOT EXISTS movimientos_puntos (
  id            BIGSERIAL PRIMARY KEY,
  membresia_id  TEXT NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  delta         INTEGER NOT NULL,
  motivo        TEXT NOT NULL,
  mision_id     TEXT REFERENCES misiones(id) ON DELETE SET NULL,
  idem_clave    TEXT NOT NULL UNIQUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_membresia ON movimientos_puntos(membresia_id, creado_en);

CREATE TABLE IF NOT EXISTS canjes (
  id            TEXT PRIMARY KEY,
  membresia_id  TEXT NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  beneficio_id  TEXT NOT NULL REFERENCES beneficios(id),
  validado      BOOLEAN NOT NULL DEFAULT FALSE,
  validado_en   TIMESTAMPTZ,
  admin_email   TEXT NOT NULL DEFAULT '',
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canjes_membresia ON canjes(membresia_id);

CREATE TABLE IF NOT EXISTS eventos_loyalty (
  id                 BIGSERIAL PRIMARY KEY,
  comercio_id        TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  cliente_final_id   TEXT REFERENCES clientes_finales(id) ON DELETE SET NULL,
  tipo               TEXT NOT NULL,
  ip_hash            TEXT,
  detalle            TEXT NOT NULL DEFAULT '',
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_loyalty_comercio_fecha ON eventos_loyalty(comercio_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_eventos_loyalty_cooldown ON eventos_loyalty(cliente_final_id, comercio_id, tipo, creado_en);
