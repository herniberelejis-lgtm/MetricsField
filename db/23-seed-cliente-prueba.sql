-- Cliente modelo "Cliente Prueba" — cuenta demo con 3 sucursales, 5 meses de
-- evolución (feb-jun 2026), 5 mozos con distinta cantidad de taps cada uno,
-- reseñas con respuesta automática y pendientes, checklist SEO, benchmark
-- de competencia y auditorías GEO — para mostrar el panel del cliente
-- completo, con todas las funcionalidades, una vez que todo esté conectado.
--
-- No se auto-aplica: correr a mano —
--   psql "<DATABASE_URL>" -f db/23-seed-cliente-prueba.sql
--
-- Portal: /portal/demo2026 — plan Premium (desbloquea citaciones en IA y
-- el resto de las funciones de pago).
--
-- Idempotente: todos los INSERT de comercios/metricas/checklist llevan
-- ON CONFLICT DO NOTHING — correrlo dos veces no duplica esas filas. Las
-- tablas sin clave natural (resenas, links_nfc→taps, competidores,
-- audits_geo, ventas_nfc) no tienen ese resguardo: si lo corrés dos veces
-- se duplican. Para volver a cargar de cero, borrar antes con el bloque
-- comentado al final del archivo.

-- ============================================================
-- 1. Cuenta + 2 sucursales
-- ============================================================

INSERT INTO comercios (
  id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto,
  google_review_url, busqueda_clave, fee, tono_marca, fecha_alta,
  auto_responder_positivas, auto_responder_umbral
) VALUES (
  'cliente-prueba', 'demo2026', 'Cliente Prueba', 'Restaurante / Bar', 'Nueva Córdoba',
  'Premium', 'activo', '+54 351 555 9001',
  'https://g.page/r/cliente-prueba-demo/review', 'restaurante en Nueva Córdoba',
  180000, 'cercano', '2026-02-01', TRUE, 4
) ON CONFLICT (id) DO NOTHING;

INSERT INTO comercios (
  id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto,
  google_review_url, busqueda_clave, fee, fecha_alta, comercio_padre_id
) VALUES (
  'cliente-prueba-guemes', 'demo2026-g', 'Cliente Prueba — Güemes', 'Restaurante / Bar', 'Güemes',
  'Premium', 'activo', '+54 351 555 9002',
  'https://g.page/r/cliente-prueba-guemes/review', 'restaurante en Güemes',
  0, '2026-02-01', 'cliente-prueba'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO comercios (
  id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto,
  google_review_url, busqueda_clave, fee, fecha_alta, comercio_padre_id
) VALUES (
  'cliente-prueba-cerro', 'demo2026-c', 'Cliente Prueba — Cerro de las Rosas', 'Restaurante / Bar', 'Cerro de las Rosas',
  'Premium', 'activo', '+54 351 555 9003',
  'https://g.page/r/cliente-prueba-cerro/review', 'restaurante en Cerro de las Rosas',
  0, '2026-02-01', 'cliente-prueba'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Evolución mensual — 5 meses, creciendo, las 3 sucursales
-- ============================================================

-- Cuenta (Nueva Córdoba) — la más grande y madura de las tres.
INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity) VALUES
  ('cliente-prueba', '2026-02',  8,  34, 4.1,  410, 22,  58,  1, 0, 0),
  ('cliente-prueba', '2026-03', 15,  49, 4.3,  560, 31,  79,  2, 1, 1),
  ('cliente-prueba', '2026-04', 22,  71, 4.5,  720, 44, 103,  4, 3, 2),
  ('cliente-prueba', '2026-05', 31, 102, 4.6,  910, 57, 132,  7, 5, 4),
  ('cliente-prueba', '2026-06', 38, 140, 4.8, 1180, 74, 168, 11, 8, 6)
ON CONFLICT (comercio_id, mes) DO NOTHING;

-- Sucursal Güemes — media, arrancó un escalón atrás de la principal.
INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity) VALUES
  ('cliente-prueba-guemes', '2026-02',  3, 14, 3.9, 180,  9, 21, 0, 0, 0),
  ('cliente-prueba-guemes', '2026-03',  6, 20, 4.1, 240, 14, 33, 0, 0, 0),
  ('cliente-prueba-guemes', '2026-04',  9, 29, 4.2, 310, 19, 46, 1, 0, 0),
  ('cliente-prueba-guemes', '2026-05', 13, 42, 4.4, 390, 25, 61, 2, 1, 0),
  ('cliente-prueba-guemes', '2026-06', 17, 59, 4.5, 490, 33, 78, 3, 2, 1)
ON CONFLICT (comercio_id, mes) DO NOTHING;

-- Sucursal Cerro de las Rosas — la más nueva y chica, pero la que más rápido crece en %.
INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity) VALUES
  ('cliente-prueba-cerro', '2026-02',  1,  5, 3.8,  90,  4, 10, 0, 0, 0),
  ('cliente-prueba-cerro', '2026-03',  3,  8, 4.0, 130,  7, 17, 0, 0, 0),
  ('cliente-prueba-cerro', '2026-04',  5, 13, 4.2, 190, 11, 27, 0, 0, 0),
  ('cliente-prueba-cerro', '2026-05',  8, 21, 4.3, 260, 16, 39, 1, 0, 0),
  ('cliente-prueba-cerro', '2026-06', 12, 33, 4.5, 350, 22, 54, 2, 1, 0)
ON CONFLICT (comercio_id, mes) DO NOTHING;

-- Rating/reseñas "en vivo" — solo como piso de respaldo si algún día falta
-- el snapshot mensual; el panel siempre va a mostrar el de arriba primero.
UPDATE comercios SET rating_google = 4.8, resenas_google = 140, google_sync_en = now() WHERE id = 'cliente-prueba';
UPDATE comercios SET rating_google = 4.5, resenas_google = 59  WHERE id = 'cliente-prueba-guemes';
UPDATE comercios SET rating_google = 4.5, resenas_google = 33  WHERE id = 'cliente-prueba-cerro';

-- ============================================================
-- 3. Dispositivos NFC: 5 mozos (en la cuenta principal) + mostrador en cada local
-- ============================================================

INSERT INTO ventas_nfc (comercio_id, formato, cantidad, precio_unitario, fecha) VALUES
  ('cliente-prueba', 'Pack completo', 6, 38000, '2026-02-01'),
  ('cliente-prueba-guemes', 'Standee', 1, 22000, '2026-02-01'),
  ('cliente-prueba-cerro', 'Standee', 1, 22000, '2026-02-01');

INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, destino, nombre_empleado) VALUES
  ('cliente-prueba-mostrador', 'cliente-prueba', 'Mostrador', 'ambos', 'resena', ''),
  ('cliente-prueba-mozo-nicolas', 'cliente-prueba', 'Nicolás Ferreyra', 'nfc', 'resena', 'Nicolás Ferreyra'),
  ('cliente-prueba-mozo-camila', 'cliente-prueba', 'Camila Suárez', 'nfc', 'resena', 'Camila Suárez'),
  ('cliente-prueba-mozo-bruno', 'cliente-prueba', 'Bruno Aguirre', 'nfc', 'resena', 'Bruno Aguirre'),
  ('cliente-prueba-mozo-valentina', 'cliente-prueba', 'Valentina Rossi', 'nfc', 'resena', 'Valentina Rossi'),
  ('cliente-prueba-mozo-tomas', 'cliente-prueba', 'Tomás Ledesma', 'nfc', 'resena', 'Tomás Ledesma'),
  ('cliente-prueba-guemes-mostrador', 'cliente-prueba-guemes', 'Mostrador', 'nfc', 'resena', ''),
  ('cliente-prueba-cerro-mostrador', 'cliente-prueba-cerro', 'Mostrador', 'nfc', 'resena', '')
ON CONFLICT (id) DO NOTHING;

-- Taps: distribuidos en los últimos 150 días (cubre los 5 meses de
-- evolución) pero con más densidad reciente, así el gráfico de "Escaneos"
-- (últimos 14 días) también muestra actividad real, no solo el total.
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mostrador', now() - (random() * interval '150 days')
FROM generate_series(1, 520);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mozo-nicolas', now() - (random() * interval '150 days')
FROM generate_series(1, 340);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mozo-camila', now() - (random() * interval '150 days')
FROM generate_series(1, 275);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mozo-bruno', now() - (random() * interval '150 days')
FROM generate_series(1, 190);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mozo-valentina', now() - (random() * interval '150 days')
FROM generate_series(1, 130);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-mozo-tomas', now() - (random() * interval '150 days')
FROM generate_series(1, 75);
-- Un empujón de taps de los últimos 14 días específicamente, para que el
-- gráfico de barras de Escaneos se vea con actividad día a día real.
INSERT INTO taps (link_id, creado_en)
SELECT l.id, now() - (random() * interval '14 days')
FROM links_nfc l, generate_series(1, 6)
WHERE l.comercio_id = 'cliente-prueba';

INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-guemes-mostrador', now() - (random() * interval '150 days')
FROM generate_series(1, 210);
INSERT INTO taps (link_id, creado_en)
SELECT 'cliente-prueba-cerro-mostrador', now() - (random() * interval '150 days')
FROM generate_series(1, 95);

-- ============================================================
-- 4. Reseñas — mezcla de positivas ya respondidas solas y pendientes,
--    algunas nombrando a un mozo puntual (para el detector de menciones)
-- ============================================================

INSERT INTO resenas (comercio_id, autor, estrellas, texto, estado, respuesta_sugerida, respuesta_publicada, publicada_automaticamente, fecha, creado_en) VALUES
  ('cliente-prueba', 'María Belén Torres', 5, 'Nicolás nos atendió increíble, súper atento con los chicos. Volvemos seguro.', 'respondida', '¡Gracias María Belén! Nos alegra mucho que Nicolás haya hecho que la pasen bien en familia. Los esperamos pronto.', TRUE, TRUE, '2026-02-15', '2026-02-15 20:10:00-03'),
  ('cliente-prueba', 'Diego Farías', 4, 'Buena comida, tardaron un poco en tomar el pedido pero Camila se disculpó y nos invitó un postre.', 'respondida', '¡Gracias Diego! Qué bueno que Camila haya podido dar vuelta la situación. Seguimos trabajando para que la espera sea menor.', TRUE, TRUE, '2026-03-02', '2026-03-02 21:40:00-03'),
  ('cliente-prueba', 'Rocío Aguilar', 2, 'La carne llegó fría y tuvimos que esperar el cambio casi 20 minutos.', 'nueva', 'Hola Rocío, lamentamos mucho la espera y que el plato no haya llegado como corresponde — nos importa mucho tu comentario. ¿Nos escribís por privado para poder compensarte como corresponde?', FALSE, FALSE, '2026-03-20', '2026-03-20 22:05:00-03'),
  ('cliente-prueba', 'Lucas Bianchi', 5, 'Bruno un capo, nos recomendó el vino perfecto para acompañar. 10 puntos.', 'respondida', '¡Gracias Lucas! Le vamos a pasar el mensaje a Bruno, seguro le encanta leerlo.', TRUE, TRUE, '2026-04-05', '2026-04-05 21:15:00-03'),
  ('cliente-prueba', 'Ana Sofía Molina', 5, 'Volvimos por tercera vez, siempre atendidos por Valentina, un amor. La pizza espectacular.', 'respondida', '¡Qué lindo leer esto, Ana Sofía! Valentina va a estar feliz. Gracias por elegirnos de nuevo.', TRUE, TRUE, '2026-04-22', '2026-04-22 20:50:00-03'),
  ('cliente-prueba', 'Martín Coria', 3, 'Rico pero un poco caro para la porción. El lugar lindo eso sí.', 'nueva', 'Gracias por tu comentario, Martín. Tomamos nota sobre la relación precio-porción para seguir mejorando.', FALSE, FALSE, '2026-05-03', '2026-05-03 19:30:00-03'),
  ('cliente-prueba', 'Julieta Herrera', 5, 'Tomás siempre con una sonrisa, se nota que les gusta el laburo. Excelente ambiente.', 'respondida', '¡Gracias Julieta! Ese comentario vale oro para Tomás y para todo el equipo.', TRUE, TRUE, '2026-05-18', '2026-05-18 21:00:00-03'),
  ('cliente-prueba', 'Facundo Ríos', 5, 'El mejor asado de la zona, sin dudas. Nicolás nos hizo sentir como en casa.', 'respondida', '¡Gracias Facundo! Nos encanta que te hayas sentido como en casa. Te esperamos pronto.', TRUE, TRUE, '2026-06-01', '2026-06-01 21:20:00-03'),
  ('cliente-prueba', 'Camila Ontiveros', 4, 'Muy buena atención de Camila, la comida un poco lenta en salir pero valió la pena.', 'respondida', '¡Gracias por tu paciencia y por el comentario! Seguimos ajustando los tiempos de cocina.', TRUE, TRUE, '2026-06-14', '2026-06-14 20:40:00-03'),
  ('cliente-prueba', 'Gonzalo Peralta', 5, 'Excelente para ir en familia, Valentina siempre atenta a todo.', 'respondida', '¡Gracias Gonzalo! Nos encanta ser el lugar elegido para la familia.', TRUE, TRUE, '2026-06-25', '2026-06-25 20:15:00-03'),
  ('cliente-prueba', 'Sofía Aranda', 5, 'Comimos ayer y todo excelente, Bruno atento en todo momento.', 'respondida', '¡Gracias Sofía! Le contamos a Bruno, seguro se pone contento.', TRUE, TRUE, '2026-07-26', '2026-07-26 21:00:00-03'),
  ('cliente-prueba', 'Nahuel Ibarra', 4, 'Buena onda del personal, en especial Tomás. La carta podría tener más opciones veggie.', 'nueva', 'Gracias Nahuel, tomamos nota sobre las opciones veggie para sumar a la carta.', FALSE, FALSE, '2026-07-27', '2026-07-27 13:30:00-03');

INSERT INTO resenas (comercio_id, autor, estrellas, texto, estado, respuesta_sugerida, respuesta_publicada, publicada_automaticamente, fecha, creado_en) VALUES
  ('cliente-prueba-guemes', 'Pablo Núñez', 5, 'Buenísima la parrillada, atención rápida.', 'respondida', '¡Gracias Pablo! Te esperamos pronto de nuevo.', TRUE, TRUE, '2026-03-05', '2026-03-05 21:00:00-03'),
  ('cliente-prueba-guemes', 'Milagros Duarte', 4, 'Rico todo, un poco de espera para conseguir mesa.', 'respondida', '¡Gracias Milagros! Estamos trabajando para mejorar los tiempos de espera.', TRUE, TRUE, '2026-04-10', '2026-04-10 20:30:00-03'),
  ('cliente-prueba-guemes', 'Ezequiel Sosa', 2, 'El mozo tardó mucho en traer la cuenta, casi perdemos el show que íbamos a ver después.', 'nueva', 'Hola Ezequiel, mil disculpas por la demora — no es lo que buscamos. Gracias por avisarnos, lo charlamos con el equipo.', FALSE, FALSE, '2026-05-08', '2026-05-08 22:15:00-03'),
  ('cliente-prueba-guemes', 'Brisa Villalba', 5, 'Excelente para ir con amigos después del laburo, buena onda del lugar.', 'respondida', '¡Gracias Brisa! Nos encanta ser el after work del grupo.', TRUE, TRUE, '2026-06-02', '2026-06-02 21:45:00-03'),
  ('cliente-prueba-guemes', 'Ramiro Cabrera', 5, 'Volvimos por la buena atención, todo riquísimo.', 'respondida', '¡Gracias Ramiro! Nos vemos pronto.', TRUE, TRUE, '2026-06-28', '2026-06-28 20:50:00-03');

INSERT INTO resenas (comercio_id, autor, estrellas, texto, estado, respuesta_sugerida, respuesta_publicada, publicada_automaticamente, fecha, creado_en) VALUES
  ('cliente-prueba-cerro', 'Agustina Prieto', 4, 'Lugar lindo, tranqui para ir a tomar algo.', 'respondida', '¡Gracias Agustina! Te esperamos de nuevo.', TRUE, TRUE, '2026-04-15', '2026-04-15 20:00:00-03'),
  ('cliente-prueba-cerro', 'Franco Salinas', 5, 'Recién abrieron y ya se nota la buena onda del equipo.', 'respondida', '¡Gracias Franco! Todavía estamos afinando detalles, tu comentario nos da mucho ánimo.', TRUE, TRUE, '2026-05-01', '2026-05-01 21:10:00-03'),
  ('cliente-prueba-cerro', 'Lucía Ferrero', 3, 'Todavía les falta rodaje pero se come bien.', 'nueva', 'Gracias Lucía por la sinceridad, estamos afinando el servicio — esperamos verte pronto de nuevo.', FALSE, FALSE, '2026-05-20', '2026-05-20 20:20:00-03'),
  ('cliente-prueba-cerro', 'Ignacio Molina', 5, 'Excelente para la previa, buena música y buena atención.', 'respondida', '¡Gracias Ignacio! Nos alegra que se sumen a la previa acá.', TRUE, TRUE, '2026-06-20', '2026-06-20 22:00:00-03');

-- ============================================================
-- 5. Checklist SEO — casi completo en las 3, para mostrar trabajo real hecho
-- ============================================================

INSERT INTO checklist_seo (comercio_id, item_key, hecho) VALUES
  ('cliente-prueba', 'categoria', TRUE),
  ('cliente-prueba', 'fotos', TRUE),
  ('cliente-prueba', 'horarios', TRUE),
  ('cliente-prueba', 'atributos', TRUE),
  ('cliente-prueba', 'descripcion', TRUE),
  ('cliente-prueba', 'qa', TRUE),
  ('cliente-prueba', 'schema', FALSE)
ON CONFLICT (comercio_id, item_key) DO NOTHING;

INSERT INTO checklist_seo (comercio_id, item_key, hecho) VALUES
  ('cliente-prueba-guemes', 'categoria', TRUE),
  ('cliente-prueba-guemes', 'fotos', TRUE),
  ('cliente-prueba-guemes', 'horarios', TRUE),
  ('cliente-prueba-guemes', 'atributos', TRUE),
  ('cliente-prueba-guemes', 'descripcion', TRUE),
  ('cliente-prueba-guemes', 'qa', FALSE),
  ('cliente-prueba-guemes', 'schema', FALSE)
ON CONFLICT (comercio_id, item_key) DO NOTHING;

INSERT INTO checklist_seo (comercio_id, item_key, hecho) VALUES
  ('cliente-prueba-cerro', 'categoria', TRUE),
  ('cliente-prueba-cerro', 'fotos', FALSE),
  ('cliente-prueba-cerro', 'horarios', TRUE),
  ('cliente-prueba-cerro', 'atributos', TRUE),
  ('cliente-prueba-cerro', 'descripcion', TRUE),
  ('cliente-prueba-cerro', 'qa', FALSE),
  ('cliente-prueba-cerro', 'schema', FALSE)
ON CONFLICT (comercio_id, item_key) DO NOTHING;

-- ============================================================
-- 6. Competidores + benchmark mensual (solo en la cuenta principal)
-- ============================================================

INSERT INTO competidores (comercio_id, nombre, rating, total_resenas, actualizado_en) VALUES
  ('cliente-prueba', 'Parrilla Don Ricardo', 4.3, 260, now()),
  ('cliente-prueba', 'La Cuadra Resto Bar', 4.2, 310, now()),
  ('cliente-prueba', 'Bodegón El Fortín', 4.0, 175, now());

INSERT INTO competidores_snapshots (competidor_id, comercio_id, nombre, mes, rating, total_resenas)
SELECT id, comercio_id, nombre, m.mes, r.rating, r.total_resenas
FROM competidores c
JOIN (VALUES
  ('2026-02', 4.2, 235), ('2026-03', 4.2, 244), ('2026-04', 4.3, 249), ('2026-05', 4.3, 255), ('2026-06', 4.3, 260)
) AS m(mes, rating, total_resenas) ON TRUE,
LATERAL (SELECT m.rating::numeric AS rating, m.total_resenas::int AS total_resenas) r
WHERE c.comercio_id = 'cliente-prueba' AND c.nombre = 'Parrilla Don Ricardo'
ON CONFLICT (competidor_id, mes) DO NOTHING;

INSERT INTO competidores_snapshots (competidor_id, comercio_id, nombre, mes, rating, total_resenas)
SELECT id, comercio_id, nombre, m.mes, m.rating::numeric, m.total_resenas::int
FROM competidores c
JOIN (VALUES
  ('2026-02', 4.1, 280), ('2026-03', 4.1, 288), ('2026-04', 4.2, 295), ('2026-05', 4.2, 302), ('2026-06', 4.2, 310)
) AS m(mes, rating, total_resenas) ON TRUE
WHERE c.comercio_id = 'cliente-prueba' AND c.nombre = 'La Cuadra Resto Bar'
ON CONFLICT (competidor_id, mes) DO NOTHING;

INSERT INTO competidores_snapshots (competidor_id, comercio_id, nombre, mes, rating, total_resenas)
SELECT id, comercio_id, nombre, m.mes, m.rating::numeric, m.total_resenas::int
FROM competidores c
JOIN (VALUES
  ('2026-02', 3.9, 150), ('2026-03', 3.9, 156), ('2026-04', 4.0, 162), ('2026-05', 4.0, 169), ('2026-06', 4.0, 175)
) AS m(mes, rating, total_resenas) ON TRUE
WHERE c.comercio_id = 'cliente-prueba' AND c.nombre = 'Bodegón El Fortín'
ON CONFLICT (competidor_id, mes) DO NOTHING;

-- ============================================================
-- 7. Audit GEO — de no aparecer a aparecer en las respuestas de IA
-- ============================================================

INSERT INTO audits_geo (comercio_id, fecha, pregunta, plataforma, aparece, competidores_mencionados) VALUES
  ('cliente-prueba', '2026-02-10', 'mejor restaurante para comer en Nueva Córdoba', 'ChatGPT', FALSE, 'Parrilla Don Ricardo, La Cuadra Resto Bar'),
  ('cliente-prueba', '2026-04-12', 'dónde comer bien en Nueva Córdoba', 'ChatGPT', TRUE, 'La Cuadra Resto Bar'),
  ('cliente-prueba', '2026-05-22', 'restaurante recomendado Nueva Córdoba Capital', 'Perplexity', TRUE, 'Parrilla Don Ricardo'),
  ('cliente-prueba', '2026-06-15', 'mejor restaurante Nueva Córdoba', 'Perplexity', TRUE, '');

-- ============================================================
-- Para volver a cargar de cero (opcional, no se ejecuta solo — descomentar
-- a mano si hace falta):
-- DELETE FROM audits_geo WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM competidores_snapshots WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM competidores WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM checklist_seo WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM resenas WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM taps WHERE link_id LIKE 'cliente-prueba%';
-- DELETE FROM links_nfc WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM ventas_nfc WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM metricas_mensuales WHERE comercio_id LIKE 'cliente-prueba%';
-- DELETE FROM comercios WHERE id LIKE 'cliente-prueba%';
-- ============================================================
