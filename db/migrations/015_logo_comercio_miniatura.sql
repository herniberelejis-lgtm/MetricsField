-- La miniatura de WhatsApp ya no se arma al vuelo en cada visita del bot de
-- preview (ver app/api/og-resena/[slug]/route.tsx) — se compone UNA vez,
-- al subir el logo, y se guarda lista para servir. Componerla en cada
-- request con next/og (satori) resultó demasiado lento para el tiempo que
-- WhatsApp espera antes de mostrar la tarjeta vacía.
--
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica.

ALTER TABLE comercio_logos ADD COLUMN IF NOT EXISTS miniatura BYTEA;
