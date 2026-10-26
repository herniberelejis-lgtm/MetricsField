-- Activación de piezas compradas por Mercado Libre (autogestionadas):
-- el lugar de Google elegido y, solo si el comprador lo pide, un contacto
-- para mandarle el aviso semanal gratis de cuántos usaron su cartel.
--
-- Los datos de contacto los carga el propio comprador en nuestra página de
-- activación, con una casilla de aceptación — no salen de Mercado Libre.
-- `novedades_aceptadas_en` guarda cuándo aceptó; `novedades_baja_en`,
-- cuándo se dio de baja (el link de baja va en cada mail).
--
-- Solo agrega columnas: no toca ni borra nada existente.
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica. Mientras no se
-- corra, la activación funciona igual, solo que sin guardar estos datos.

ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS google_place_id        TEXT;
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS contacto_email         TEXT NOT NULL DEFAULT '';
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS contacto_whatsapp      TEXT NOT NULL DEFAULT '';
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS novedades_aceptadas_en TIMESTAMPTZ;
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS novedades_baja_en      TIMESTAMPTZ;
ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS activado_en            TIMESTAMPTZ;
