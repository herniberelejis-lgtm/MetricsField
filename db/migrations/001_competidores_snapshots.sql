-- Migración 001 — Benchmarking competitivo histórico.
-- Correr una vez en el SQL Editor de Neon. Idempotente (IF NOT EXISTS).
--
-- Foto mensual de cada competidor (rating + reseñas "al corte" del mes).
-- El mes en curso se pisa por upsert en cada sync; al cambiar de mes, la
-- fila del mes anterior queda congelada. No borra ni toca datos existentes.

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
