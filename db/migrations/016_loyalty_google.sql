-- Loyalty — A4 a A7 con Google Wallet: registro, visitas, misiones, canje
-- en mostrador y configuración desde el panel. Va DESPUÉS de
-- 012_loyalty_fundaciones.sql (que crea las tablas): si 012 no se corrió
-- todavía en esta base, correr primero ese archivo y después este.
--
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica. Todo es
-- aditivo (ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS): no
-- borra ni reescribe ninguna fila existente, y se puede correr dos veces.

-- Puntos que suma cada visita (tap en el cartel de fidelización, máximo
-- una cada 20 h por persona y comercio). Los de bienvenida ya existían.
ALTER TABLE programas_loyalty ADD COLUMN IF NOT EXISTS puntos_por_visita INTEGER NOT NULL DEFAULT 10;
ALTER TABLE programas_loyalty ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now();

-- Misiones con destino: la de reseña usa el link de Google del comercio,
-- pero "seguir en redes" necesita a dónde mandar (Instagram, TikTok...).
ALTER TABLE misiones ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';

-- Orden estable del catálogo de beneficios en la tarjeta del cliente.
CREATE INDEX IF NOT EXISTS idx_beneficios_comercio_costo ON beneficios(comercio_id, costo_puntos);

-- Canje: el código que el cliente muestra en caja vence a los 15 minutos
-- (no se puede sacar una foto hoy y canjearla la semana que viene) y se
-- guarda cuántos puntos costó en el momento de validarlo, por si después
-- el comercio cambia el precio del beneficio.
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS comercio_id TEXT REFERENCES comercios(id) ON DELETE CASCADE;
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS costo_puntos INTEGER;
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS expira_en TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_canjes_comercio ON canjes(comercio_id, creado_en);

-- Misiones ya cumplidas por cada membresía (una vez cada una): consulta
-- directa sobre el ledger sin recorrer todos los movimientos.
CREATE INDEX IF NOT EXISTS idx_movimientos_mision ON movimientos_puntos(membresia_id, mision_id) WHERE mision_id IS NOT NULL;

-- Métricas del portal (tarjetas, visitas, retorno a 30 días) por tipo.
CREATE INDEX IF NOT EXISTS idx_eventos_loyalty_tipo ON eventos_loyalty(comercio_id, tipo, creado_en);
