-- Migración 007: email de notificaciones por comercio + hora de cada reseña.
--
-- email_notificaciones: a dónde mandarle la alerta de reseña/queja mala y
-- el resumen mensual. Vacío = no se manda nada (nunca se asume un email).
--
-- resenas.creado_en: hasta ahora `fecha` es DATE, sin hora. Se agrega un
-- TIMESTAMPTZ nuevo, nullable — las reseñas cargadas antes de esto quedan
-- sin hora (se muestra "hora no registrada"), pero de acá en más se
-- completa: a mano en el CRM, o real desde la Reviews API el día que esté
-- habilitada (createTime de Google, hoy se estaba truncando a solo fecha).
--
-- Correr a mano en el SQL Editor de Neon. Idempotente.

ALTER TABLE comercios
  ADD COLUMN IF NOT EXISTS email_notificaciones TEXT NOT NULL DEFAULT '';

ALTER TABLE resenas
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ;
