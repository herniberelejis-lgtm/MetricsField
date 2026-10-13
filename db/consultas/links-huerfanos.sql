-- Links que quedaron sin comercio por borrar clientes ANTES del arreglo de
-- eliminarCliente (audit run-2, C2). Desde ese arreglo ya no se pueden
-- reclamar los que tienen etiqueta o destino, pero un link huérfano sin
-- etiqueta ni destino que alguna vez estuvo en la calle (tiene taps) sí
-- seguiría siendo reclamable por quien lo escanee.
--
-- Solo lectura: correr en el SQL Editor de Neon y revisar el resultado.
SELECT l.id, l.etiqueta, l.url_destino, l.tipo, l.lote, l.creado_en,
       (SELECT count(*) FROM taps t WHERE t.link_id = l.id) AS taps
FROM links_nfc l
WHERE l.comercio_id IS NULL
  AND l.autogestionado = FALSE
  AND (l.etiqueta <> '' OR l.url_destino IS NOT NULL
       OR EXISTS (SELECT 1 FROM taps t WHERE t.link_id = l.id))
ORDER BY l.creado_en;

-- Si la lista tiene carteles que ya no deberían existir, desactivarlos (no
-- borrar) uno por uno, revisando el id — NO correr en masa sin mirar:
--   UPDATE links_nfc SET activo = FALSE WHERE id = '<id>';
