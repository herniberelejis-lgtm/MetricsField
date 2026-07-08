-- Migración 004: automatización de respuestas a reseñas positivas +
-- vínculo con la Reviews API de Google Business Profile.
--
-- Contexto: hoy el acceso a esa API todavía no está aprobado por Google
-- (requiere una revisión aparte, ver developers.google.com/my-business/
-- content/prereqs). Este cambio deja la base lista para el día que llegue
-- esa aprobación — el código que la usa está gateado por la variable de
-- entorno GOOGLE_REVIEWS_API_ENABLED (ver .env.example), así que hasta
-- entonces estas columnas simplemente no se usan.
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/004_automatizacion_resenas_google.sql
-- Idempotente: se puede reintentar sin romper nada si se corta a la mitad.
-- (Ya aplicada en producción — este archivo queda como registro.)

ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS auto_responder_positivas BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS auto_responder_umbral INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS resenas_sync_en TIMESTAMPTZ;

ALTER TABLE comercios
  DROP CONSTRAINT IF EXISTS comercios_auto_responder_umbral_check;
ALTER TABLE comercios
  ADD CONSTRAINT comercios_auto_responder_umbral_check CHECK (auto_responder_umbral IN (4, 5));

ALTER TABLE resenas
  ADD COLUMN IF NOT EXISTS origen_google_id TEXT,
  ADD COLUMN IF NOT EXISTS publicada_automaticamente BOOLEAN NOT NULL DEFAULT FALSE;

-- Único solo entre las que sí vienen de Google (evita duplicar una reseña
-- si el sync corre dos veces) — las reseñas cargadas a mano en el CRM
-- interno quedan con origen_google_id NULL y no entran en esta restricción.
CREATE UNIQUE INDEX IF NOT EXISTS resenas_origen_google_id_idx
  ON resenas (origen_google_id)
  WHERE origen_google_id IS NOT NULL;
