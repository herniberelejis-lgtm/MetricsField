-- ============================================================================
-- Migración 010 — Limpieza de la base: sacar lo que ya no debería estar
-- ============================================================================
--
-- Reemplaza y amplía la 009 (que solo cubría el star-gate). Es IDEMPOTENTE:
-- si ya corriste la 009, correr esta igual no rompe nada.
--
-- CÓMO USARLA — en orden, no saltees el paso 1:
--
--   PASO 1  Corré el bloque de VERIFICACIÓN. Es de solo lectura.
--   PASO 2  Corré el BLOQUE SEGURO. No puede perder datos.
--   PASO 3  Mirá lo que devolvió el paso 1 y recién ahí decidí sobre el
--           BLOQUE CON DECISIÓN, que sí borra datos.
--
-- Regla del proyecto: ningún DROP de datos se corre sin que una persona lo
-- haya mirado antes. Por eso el paso 3 viene comentado.
--
-- ============================================================================


-- ============================================================================
-- PASO 1 · VERIFICACIÓN — solo lectura, no cambia nada
-- ============================================================================
-- Corré esto solo y guardá el resultado. Te dice qué hay realmente en la base
-- de producción, que puede no coincidir con la de desarrollo.

-- Usa SQL dinámico a propósito: Postgres resuelve los nombres de tabla al
-- planificar la consulta, así que un SELECT normal sobre una tabla que ya no
-- existe falla aunque esté detrás de un IF. Con EXECUTE, cada conteo se arma
-- recién cuando ya sabemos que la tabla está.

DO $$
DECLARE
  n bigint;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===== QUÉ HAY PARA LIMPIAR =====';

  -- 2.1
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='links_nfc' AND column_name='usar_filtro') THEN
    EXECUTE 'SELECT count(*) FROM links_nfc WHERE usar_filtro' INTO n;
    RAISE NOTICE 'links_nfc.usar_filtro en TRUE ....... % (esperado 0 -> borrar es seguro)', n;
  ELSE
    RAISE NOTICE 'links_nfc.usar_filtro ................ ya no existe, nada que hacer';
  END IF;

  -- 2.2
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='metricas_mensuales' AND column_name='posicion_maps') THEN
    EXECUTE 'SELECT count(*) FROM metricas_mensuales WHERE posicion_maps <> 0' INTO n;
    RAISE NOTICE 'posicion_maps con valor real ......... % (esperado 0 -> borrar es seguro)', n;
  ELSE
    RAISE NOTICE 'metricas_mensuales.posicion_maps ..... ya no existe, nada que hacer';
  END IF;

  -- 3.1
  IF to_regclass('public.feedback') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM feedback' INTO n;
    RAISE NOTICE 'tabla feedback ....................... % filas %', n,
      CASE WHEN n > 0 THEN '<<< RECLAMOS REALES: EXPORTAR ANTES DE BORRAR' ELSE '(vacía, borrar es seguro)' END;
  ELSE
    RAISE NOTICE 'tabla feedback ....................... ya no existe, nada que hacer';
  END IF;

  -- 3.2
  IF to_regclass('public.cobros') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM cobros' INTO n;
    RAISE NOTICE 'tabla cobros ......................... % filas %', n,
      CASE WHEN n > 0 THEN '<<< COBROS REALES: EXPORTAR ANTES DE BORRAR' ELSE '(vacía)' END;
  ELSE
    RAISE NOTICE 'tabla cobros ......................... ya no existe, nada que hacer';
  END IF;

  -- 3.3
  IF to_regclass('public.prospectos') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM prospectos' INTO n;
    RAISE NOTICE 'tabla prospectos ..................... % filas %', n,
      CASE WHEN n > 0 THEN '<<< TU PIPELINE DE VENTA: EXPORTAR SÍ O SÍ' ELSE '(vacía)' END;
  ELSE
    RAISE NOTICE 'tabla prospectos ..................... ya no existe, nada que hacer';
  END IF;

  RAISE NOTICE '================================';
  RAISE NOTICE '';
END $$;


-- ============================================================================
-- PASO 2 · BLOQUE SEGURO — no puede perder información
-- ============================================================================
-- Las dos columnas de acá abajo no las lee ni las escribe ninguna función de
-- lib/db.ts (verificado columna por columna contra el código). Sus valores son
-- todos el default. Borrarlas no pierde nada.

-- ---------------------------------------------------------------------------
-- 2.1 · links_nfc.usar_filtro — resto del star-gate
-- ---------------------------------------------------------------------------
-- El star-gate (desviar las reseñas de 1-3★ a un formulario privado) se
-- eliminó del producto: es "review gating" y Google lo penaliza. El checkbox
-- que seteaba esta columna se sacó de la UI hace varias versiones, y el deploy
-- del PR #52 la sacó también de la capa de datos.
--
-- ⚠️ Requiere que el PR #52 ya esté en producción. Si no lo está, los INSERT
--    de links_nfc todavía nombran la columna y van a fallar.

ALTER TABLE links_nfc DROP COLUMN IF EXISTS usar_filtro;

-- ---------------------------------------------------------------------------
-- 2.2 · metricas_mensuales.posicion_maps — feature eliminada
-- ---------------------------------------------------------------------------
-- "Posición en Maps" se sacó del producto entero porque no se puede
-- automatizar ni entregar de forma honesta al cliente. La columna es
-- NOT NULL DEFAULT 0 y quedó en 0 en todas las filas: nunca se cargó un dato
-- real. El propio schema.sql la marca como legacy.

ALTER TABLE metricas_mensuales DROP COLUMN IF EXISTS posicion_maps;


-- ============================================================================
-- PASO 3 · BLOQUE CON DECISIÓN — esto SÍ borra datos
-- ============================================================================
-- Las tres tablas de acá abajo no las toca ninguna línea de código (0
-- sentencias SQL en todo el repo). Pero pueden tener datos históricos reales
-- que no están en ningún otro lado.
--
-- Por cada una: mirá el conteo del PASO 1.
--   • Dio 0        → descomentá el DROP y listo.
--   • Dio > 0      → exportá primero (comando abajo), guardá el CSV en el
--                    Drive del equipo, y RECIÉN ahí descomentá el DROP.
--   • No apareció  → ya no existe, no hacés nada.

-- ---------------------------------------------------------------------------
-- 3.1 · tabla feedback — reclamos privados del star-gate
-- ---------------------------------------------------------------------------
-- Guardaba lo que escribía quien puntuaba 1-3★ cuando el star-gate existía.
-- Hoy ninguna función la lee ni la escribe (solo la nombran dos comentarios).
--
-- Exportar antes si tiene filas, desde tu terminal (no desde el editor de Neon):
--   psql "<DATABASE_URL>" -c "\copy (SELECT * FROM feedback) TO 'feedback-backup.csv' CSV HEADER"

-- DROP TABLE IF EXISTS feedback;

-- ---------------------------------------------------------------------------
-- 3.2 · tabla cobros — módulo de finanzas eliminado
-- ---------------------------------------------------------------------------
-- Quedó huérfana cuando se sacó /admin/finanzas del panel (commit d367091).
--
-- 💡 RECOMENDACIÓN: NO la borres todavía. El esquema está bien pensado y la
--    cobranza vuelve apenas pases de diez clientes — te vas a ahorrar
--    rehacerla. Una tabla vacía sin uso no molesta ni cuesta nada en Neon.
--    Dejala, salvo que quieras la base impecable.
--
--   psql "<DATABASE_URL>" -c "\copy (SELECT * FROM cobros) TO 'cobros-backup.csv' CSV HEADER"

-- DROP TABLE IF EXISTS cobros;

-- ---------------------------------------------------------------------------
-- 3.3 · tabla prospectos — CRM de prospección eliminado
-- ---------------------------------------------------------------------------
-- Mismo caso que cobros: se borró el módulo en d367091. Puede que ya no
-- exista (schema.sql menciona un db/22-eliminar-finanzas-prospectos.sql que
-- NO está en el repo, así que no sabemos si llegó a correrse en Neon).
--
-- ⚠️ OJO: si tenés prospectos cargados ahí, es tu pipeline de venta. Con la
--    salida a mercado de esta semana, esos contactos valen. Exportalos sí o sí.
--
--   psql "<DATABASE_URL>" -c "\copy (SELECT * FROM prospectos) TO 'prospectos-backup.csv' CSV HEADER"

-- DROP TABLE IF EXISTS prospectos;


-- ============================================================================
-- PASO 4 · COMPROBACIÓN FINAL — solo lectura
-- ============================================================================
-- Corré esto al terminar. Tiene que devolver 0 filas.

SELECT 'QUEDA SIN LIMPIAR: ' || nombre AS revisar FROM (
  SELECT 'columna links_nfc.usar_filtro' AS nombre
   WHERE EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='links_nfc' AND column_name='usar_filtro')
  UNION ALL
  SELECT 'columna metricas_mensuales.posicion_maps'
   WHERE EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='metricas_mensuales' AND column_name='posicion_maps')
) t;

-- Las tablas del PASO 3 no se listan acá a propósito: dejarlas es una
-- decisión válida, no algo pendiente.
