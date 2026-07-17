-- Migración 008: apaga el star-gate (desvío privado de reseñas 1-3★) por
-- defecto en todos los links existentes y nuevos.
--
-- Contexto: aunque el link público a Google siempre quedó visible incluso
-- para quien puntúa 1-3★ (nunca fue "review gating" en sentido estricto —
-- ver el comentario en components/tap/TapStarGate.tsx), la decisión es no
-- exponer esta funcionalidad como comportamiento por defecto mientras se
-- tramitan la verificación OAuth y el acceso a las Business Profile APIs,
-- para no darle a un revisor humano de Google un motivo de duda. La
-- función queda intacta en el código — solo se apaga el interruptor
-- (columna `usar_filtro`, panel: checkbox "Activar filtro de estrellas" en
-- cada link) — se puede prender de nuevo por cliente si lo piden.
--
-- Correr a mano en el SQL Editor de Neon. Idempotente.

ALTER TABLE links_nfc
  ALTER COLUMN usar_filtro SET DEFAULT FALSE;

UPDATE links_nfc SET usar_filtro = FALSE WHERE usar_filtro = TRUE;
