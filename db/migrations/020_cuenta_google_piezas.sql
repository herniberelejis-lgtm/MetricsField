-- Piezas autogestionadas guardadas en una cuenta de Google (Mis piezas):
-- el mail de la cuenta que las maneja. Con eso, quien pierde o cambia el
-- celular entra con Google y recupera todas sus piezas sin PIN, y el equipo
-- ve en Admin → Hardware qué cuenta maneja cada pieza (revendedores).
--
-- Solo agrega una columna y un índice: no toca ni borra nada existente.
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica. Mientras no se
-- corra, todo funciona igual con el llavero del celular y el botón "Guardar
-- en mi cuenta de Google" no aparece.

ALTER TABLE links_nfc ADD COLUMN IF NOT EXISTS duenio_email TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS links_nfc_duenio_email_idx ON links_nfc (lower(duenio_email)) WHERE duenio_email <> '';
