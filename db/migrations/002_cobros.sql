-- Migración 002 — Módulo de finanzas (cobranza).
-- Correr una vez en el SQL Editor de Neon. Idempotente (IF NOT EXISTS).
--
-- Cobros del abono mensual (y otros conceptos) por comercio. La cobranza se
-- opera desde /admin/finanzas. El estado "vencido" se deriva en la vista
-- (pendiente + vence_el pasado), no se persiste. No borra ni toca nada.

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
