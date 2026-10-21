-- Ubicación (lat/lng) del comercio y de sus competidores, para el mapa de la
-- zona del portal (Google Maps Static API, lib/mapa.ts).
--
-- Sale de Google Places, cuyos términos dejan guardar las coordenadas hasta
-- 30 días: `ubicacion_en` marca cuándo se trajeron, el sync diario las
-- renueva y el cron borra las vencidas (lib/db/ubicaciones.ts).
--
-- Solo agrega columnas: no toca ni borra nada existente.
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica. Mientras no se
-- corra, el portal funciona igual, solo que sin mapa.

ALTER TABLE comercios    ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION;
ALTER TABLE comercios    ADD COLUMN IF NOT EXISTS lng          DOUBLE PRECISION;
ALTER TABLE comercios    ADD COLUMN IF NOT EXISTS ubicacion_en TIMESTAMPTZ;

ALTER TABLE competidores ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION;
ALTER TABLE competidores ADD COLUMN IF NOT EXISTS lng          DOUBLE PRECISION;
ALTER TABLE competidores ADD COLUMN IF NOT EXISTS ubicacion_en TIMESTAMPTZ;
