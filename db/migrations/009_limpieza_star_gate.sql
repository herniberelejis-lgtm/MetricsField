-- Migración 009 — Limpieza de los restos del star-gate (desvío de reseñas).
--
-- ⚠️ NO SE APLICA SOLA. Correr a mano en el SQL Editor de Neon, y recién
-- DESPUÉS de que esté en producción el deploy que sacó `usarFiltro` de la
-- capa de datos (rama claude/limpieza-y-seguridad). Si se corre antes, los
-- INSERT de links_nfc que todavía nombran la columna fallan.
--
-- ⚠️ ESTE ARCHIVO BORRA DATOS. Leer la sección de `feedback` antes de correr.
--
-- Contexto: el star-gate (mandar las reseñas de 1-3★ a un formulario privado
-- en vez de a Google) fue eliminado del producto — es "review gating" y
-- Google lo penaliza. El código ya no escribe ni lee nada de esto; lo que
-- queda son dos objetos huérfanos en la base.

-- ---------------------------------------------------------------------------
-- 1 · links_nfc.usar_filtro — SIN RIESGO
-- ---------------------------------------------------------------------------
-- Nadie la lee ni la escribe desde el deploy de limpieza. Todos los valores
-- son FALSE (el default), porque el checkbox que la seteaba se sacó de la UI
-- hace varias versiones.
--
-- Para confirmarlo antes de borrar, corré esto primero — tiene que dar 0:
--   SELECT count(*) FROM links_nfc WHERE usar_filtro = TRUE;

ALTER TABLE links_nfc DROP COLUMN IF EXISTS usar_filtro;

-- ---------------------------------------------------------------------------
-- 2 · tabla feedback — REVISAR ANTES
-- ---------------------------------------------------------------------------
-- Guardaba los reclamos privados que dejaba quien puntuaba 1-3★. Ninguna
-- función de lib/db.ts la lee ni la escribe hoy. PERO puede tener registros
-- históricos de cuando el star-gate estaba vivo, y eso es feedback real de
-- clientes finales de comercios reales.
--
-- Corré esto PRIMERO:
--   SELECT count(*) FROM feedback;
--
--   • Si da 0            → descomentá el DROP de abajo y listo.
--   • Si da más que 0    → NO borres todavía. Exportalo primero:
--                            \copy (SELECT * FROM feedback) TO 'feedback-backup.csv' CSV HEADER
--                          Guardá ese CSV en el Drive del equipo y recién
--                          ahí descomentá el DROP.
--
-- Se deja comentado a propósito: la regla del proyecto es que ningún DROP de
-- datos se corre sin que una persona lo haya mirado antes.

-- DROP TABLE IF EXISTS feedback;

-- ---------------------------------------------------------------------------
-- 3 · tabla cobros — NO BORRAR (todavía)
-- ---------------------------------------------------------------------------
-- Quedó huérfana cuando se sacó /admin/finanzas del panel: existe en la base,
-- ningún código la toca. No la borramos porque la cobranza vuelve apenas haya
-- más de diez clientes, y el esquema ya está bien pensado. Si tiene filas,
-- son los cobros que se cargaron cuando el módulo existía — vale la pena
-- conservarlas.
--   SELECT count(*) FROM cobros;
