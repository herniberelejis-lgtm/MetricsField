-- Migración 006: autogestión de hardware (canal Mercado Libre).
--
-- Contexto: hoy toda pieza de links_nfc con comercio_id NULL es "inventario
-- libre" que un admin asigna a mano desde /admin/hardware. Para vender el
-- producto suelto (sin software, sin agencia, ej. Mercado Libre) la pieza
-- tiene que poder autoconfigurarse: el comprador la escanea, carga su link
-- de reseña de Google y elige un PIN — sin crear una fila en `comercios`
-- (esa tabla carga cosas de agencia que acá no aplican: fee, plan, zona,
-- histórico mensual). `comercio_id` sigue NULL para siempre en estas
-- piezas; `autogestionado` es lo que distingue "todavía libre en el
-- inventario" de "ya activada por su dueño".
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/006_autogestion_hardware.sql
-- Idempotente.

ALTER TABLE links_nfc
  ADD COLUMN IF NOT EXISTS autogestionado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nombre_negocio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS pin_salt TEXT;
