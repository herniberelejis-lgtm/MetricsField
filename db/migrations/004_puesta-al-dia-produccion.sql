-- Migración 004 — PUESTA AL DÍA COMPLETA del esquema de producción.
--
-- POR QUÉ: el código en main espera columnas/tablas que la base de Neon no
-- tiene, y eso hoy rompe con error 500: /t/<slug> (¡el star-gate de los
-- carteles NFC!), /portal/<codigo>, /admin/finanzas y las acciones de
-- /admin/hardware. Errores confirmados: "column l.usar_filtro does not
-- exist", "column l.tipo does not exist", "relation cobros does not exist".
--
-- CÓMO CORRERLA: pegar TODO este archivo en el SQL Editor de Neon y Run.
--
-- SEGURA: 100% idempotente (correrla dos veces no rompe nada) y solo
-- AGREGA columnas/tablas/índices — no borra ni modifica ningún dato
-- existente. Cubre también lo de las migraciones 001, 002 y 003 por si
-- alguna no se llegó a correr: con este único archivo la base queda
-- alineada con db/schema.sql.

-- ---------- comercios: automatización de respuestas (Reviews API) ----------
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS auto_responder_positivas BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS auto_responder_umbral INTEGER NOT NULL DEFAULT 4;
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS resenas_sync_en TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comercios_auto_responder_umbral_check'
  ) THEN
    ALTER TABLE comercios ADD CONSTRAINT comercios_auto_responder_umbral_check
      CHECK (auto_responder_umbral IN (4, 5));
  END IF;
END $$;

-- ---------- links_nfc: inventario de hardware (QR dinámicos) ----------
-- tipo/lote: qué soporte físico es cada pieza y de qué tanda de fabricación.
-- usar_filtro: si el destino 'resena' pasa por el star-gate o va directo.
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'nfc';
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS lote TEXT NOT NULL DEFAULT '';
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS usar_filtro BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE links_nfc ALTER COLUMN etiqueta SET DEFAULT '';

-- Piezas pre-generadas en lote todavía sin cliente: comercio_id pasa a
-- admitir NULL, y si se borra un comercio sus piezas vuelven al inventario
-- (SET NULL) en vez de borrarse (los QR impresos siguen existiendo).
ALTER TABLE links_nfc ALTER COLUMN comercio_id DROP NOT NULL;
DO $$
DECLARE fk RECORD;
BEGIN
  SELECT conname, confdeltype INTO fk
  FROM pg_constraint
  WHERE conrelid = 'links_nfc'::regclass
    AND contype = 'f'
    AND confrelid = 'comercios'::regclass
  LIMIT 1;
  IF fk.conname IS NOT NULL AND fk.confdeltype <> 'n' THEN
    EXECUTE format('ALTER TABLE links_nfc DROP CONSTRAINT %I', fk.conname);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'links_nfc'::regclass
      AND contype = 'f'
      AND confrelid = 'comercios'::regclass
  ) THEN
    ALTER TABLE links_nfc ADD CONSTRAINT links_nfc_comercio_id_fkey
      FOREIGN KEY (comercio_id) REFERENCES comercios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------- resenas: sync con Google Reviews API ----------
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS origen_google_id TEXT;
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS publicada_automaticamente BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS resenas_origen_google_id_idx
  ON resenas (origen_google_id)
  WHERE origen_google_id IS NOT NULL;

-- ---------- Tabla nueva: fotos mensuales de competencia (benchmarking) ----------
CREATE TABLE IF NOT EXISTS competidores_snapshots (
  competidor_id  INTEGER NOT NULL REFERENCES competidores(id) ON DELETE CASCADE,
  comercio_id    TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  mes            TEXT NOT NULL,                    -- 'YYYY-MM'
  rating         NUMERIC,
  total_resenas  INTEGER,
  capturado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (competidor_id, mes)
);
CREATE INDEX IF NOT EXISTS idx_comp_snap_comercio ON competidores_snapshots(comercio_id, mes);

-- ---------- Tabla nueva: cobros (módulo de finanzas) ----------
CREATE TABLE IF NOT EXISTS cobros (
  id           SERIAL PRIMARY KEY,
  comercio_id  TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  periodo      TEXT NOT NULL,                       -- 'YYYY-MM' que cubre el cobro
  concepto     TEXT NOT NULL DEFAULT 'abono',        -- 'abono' | 'nfc' | 'otro'
  monto        NUMERIC NOT NULL DEFAULT 0,
  estado       TEXT NOT NULL DEFAULT 'pendiente',    -- 'pendiente' | 'pagado'
  metodo       TEXT NOT NULL DEFAULT '',
  vence_el     DATE,
  pagado_el    DATE,
  nota         TEXT NOT NULL DEFAULT '',
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cobros_comercio ON cobros(comercio_id, periodo);

-- ---------- Índices de FKs (contenido de la migración 003) ----------
CREATE INDEX IF NOT EXISTS idx_links_nfc_comercio    ON links_nfc(comercio_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comercio     ON feedback(comercio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_resenas_comercio      ON resenas(comercio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_audits_geo_comercio   ON audits_geo(comercio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_competidores_comercio ON competidores(comercio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_nfc_comercio   ON ventas_nfc(comercio_id);
