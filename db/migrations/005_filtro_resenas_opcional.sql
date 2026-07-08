-- Migración 005: hacer opcional el star-gate (filtro de reseñas) por link.
--
-- Contexto: varios clientes no quieren desviar las reseñas negativas a
-- feedback privado — prefieren que el cartel lleve derecho a la página de
-- reseña de Google para TODOS los que lo tocan, sin pasar por la pantalla
-- de estrellas. Ahora es una opción por link/pieza de hardware, no una
-- decisión global. El conteo de taps en tiempo real no cambia — se sigue
-- registrando antes de decidir a dónde redirigir.
--
-- Default TRUE: preserva el comportamiento actual para todo el hardware ya
-- instalado — nadie pierde el filtro sin pedirlo explícitamente.
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/005_filtro_resenas_opcional.sql
-- Idempotente. (Ya aplicada en producción — este archivo queda como registro.)

ALTER TABLE links_nfc
  ADD COLUMN IF NOT EXISTS usar_filtro BOOLEAN NOT NULL DEFAULT TRUE;
