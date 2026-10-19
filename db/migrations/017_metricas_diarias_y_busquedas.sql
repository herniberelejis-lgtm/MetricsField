-- Métricas diarias de Google Business Profile y palabras de búsqueda por mes.
--
-- Hasta ahora el sync sumaba los días del mes y descartaba el detalle. Con
-- el detalle día por día se pueden cruzar las métricas de Google con los
-- toques al cartel (qué día de la semana te buscan y nadie pide la reseña) y,
-- más adelante, marcar el antes y después de cada cosa que hace el comercio.
-- Las palabras de búsqueda permiten cruzar lo que la gente busca con lo que
-- dicen sus reseñas (lib/conclusiones.ts).
--
-- Solo crea tablas nuevas: no toca ni borra nada existente.
-- Correr a mano en el SQL Editor de Neon — no se auto-aplica.

CREATE TABLE IF NOT EXISTS metricas_diarias (
  comercio_id          TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  fecha                DATE NOT NULL,                 -- día en la zona horaria de la ficha
  impresiones_maps     INTEGER NOT NULL DEFAULT 0,    -- vistas del perfil en Maps (compu + celular)
  impresiones_busqueda INTEGER NOT NULL DEFAULT 0,    -- vistas del perfil en la Búsqueda (compu + celular)
  llamadas             INTEGER NOT NULL DEFAULT 0,
  como_llegar          INTEGER NOT NULL DEFAULT 0,
  clics_web            INTEGER NOT NULL DEFAULT 0,
  conversaciones       INTEGER NOT NULL DEFAULT 0,
  reservas             INTEGER NOT NULL DEFAULT 0,
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comercio_id, fecha)
);

CREATE TABLE IF NOT EXISTS busquedas_mensuales (
  comercio_id  TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  mes          TEXT NOT NULL,                         -- 'YYYY-MM'
  palabra      TEXT NOT NULL,                         -- tal como la escribió la gente (Google la normaliza a minúsculas)
  impresiones  INTEGER,                               -- NULL cuando Google solo informa "menos de <umbral>"
  umbral       INTEGER,                               -- el "menos de N" de Google; NULL si hay número exacto
  PRIMARY KEY (comercio_id, mes, palabra)
);
CREATE INDEX IF NOT EXISTS idx_busquedas_comercio_mes ON busquedas_mensuales(comercio_id, mes);
