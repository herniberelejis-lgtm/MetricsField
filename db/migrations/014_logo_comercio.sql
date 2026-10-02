-- Logo del comercio, para la miniatura de WhatsApp de /t/[slug] (ver
-- app/api/og-resena/[slug]/route.tsx). Correr a mano en el SQL Editor de
-- Neon — no se auto-aplica.
--
-- Tabla aparte en vez de columna en `comercios`: así ningún SELECT * FROM
-- comercios existente (son decenas, en todo el panel y el portal) empieza
-- a traer bytes de imagen que no necesita. Solo se consulta donde hace
-- falta: la subida/preview en el admin y la generación de la miniatura.

CREATE TABLE IF NOT EXISTS comercio_logos (
  comercio_id    TEXT PRIMARY KEY REFERENCES comercios(id) ON DELETE CASCADE,
  datos          BYTEA NOT NULL,
  content_type   TEXT NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
