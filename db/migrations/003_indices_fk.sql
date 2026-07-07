-- Migración 003: índices sobre las FKs que la app consulta en cada request
-- y que hoy fuerzan seq scans (portal del cliente, gestor de links, CRM).
-- También aceleran los ON DELETE CASCADE al borrar un comercio.
--
-- Correr a mano en el SQL Editor de Neon (y en la base local):
--   psql "<DATABASE_URL>" -f db/migrations/003_indices_fk.sql
-- Idempotente: usa IF NOT EXISTS, correrla dos veces no rompe nada.

CREATE INDEX IF NOT EXISTS idx_links_nfc_comercio   ON links_nfc(comercio_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comercio    ON feedback(comercio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_resenas_comercio     ON resenas(comercio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_audits_geo_comercio  ON audits_geo(comercio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_competidores_comercio ON competidores(comercio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_nfc_comercio  ON ventas_nfc(comercio_id);
