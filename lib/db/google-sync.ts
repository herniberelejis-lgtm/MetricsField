import "server-only";
import { sql } from "../sql";
import { fetchGooglePlaceStats } from "../places";
import { rendimientoDelMes } from "../gbp";
import { listarResenasGoogle, responderResenaGoogle, resenasApiHabilitada } from "../google-reviews";
import { generarRespuestaSugerida } from "../respuestas";
import { cifrar } from "../crypto";
import { alertarResenaMala } from "../alertas";
import {
  accessTokenGBPComercio,
  resolverLocationGBP,
  sincronizarEnLotes,
} from "./_compartido";
import { getCliente } from "./clientes";
import { actualizarResena, crearResena } from "./resenas";

// ---------- Rendimiento (Business Profile Performance API) ----------
// Modelo por cliente: cada comercio autoriza con SU PROPIA cuenta de
// Google desde su portal (/portal/[codigo] → "Conectar tu Google Business
// Profile"), no con una cuenta de la agencia. Así el dato sigue llegando
// aunque la agencia no administre la ficha, y queda listo para funcionar
// sin fricción el día que la app esté verificada por Google.

/** Trae rating/reseñas actuales de Google Places API y los guarda — tanto
 * en el snapshot "en vivo" (comercios.rating_google/resenas_google) como
 * en la métrica del mes en curso, para que "Detalle mensual" y el gráfico
 * de evolución dejen de depender de una carga manual aparte. "Reseñas
 * nuevas" se calcula solo, comparando contra el total del mes anterior.
 * Visitas/llamadas no se tocan acá — eso lo hace sincronizarRendimiento. */
export async function sincronizarGoogle(id: string): Promise<boolean> {
  const rows = await sql`SELECT google_place_id FROM comercios WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id as string | undefined;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

  await sql`
    UPDATE comercios SET
      rating_google = ${stats.rating},
      resenas_google = ${stats.totalReseñas},
      google_sync_en = now()
    WHERE id = ${id}
  `;

  const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const anteriores = await sql`
    SELECT resenas_total FROM metricas_mensuales
    WHERE comercio_id = ${id} AND mes < ${mesActual}
    ORDER BY mes DESC LIMIT 1
  `;
  const totalAnterior = anteriores[0] ? Number(anteriores[0].resenas_total) : stats.totalReseñas;
  const resenasNuevas = Math.max(0, stats.totalReseñas - totalAnterior);

  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio)
    VALUES (${id}, ${mesActual}, ${resenasNuevas}, ${stats.totalReseñas}, ${stats.rating})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio
  `;

  return true;
}

/** Sincroniza todos los comercios que tengan un place_id cargado — usado
 * por el cron diario. Devuelve cuántos se actualizaron correctamente.
 * Ordenado por google_sync_en (los nunca sincronizados o más viejos primero):
 * si el cron corta por el timeout de maxDuration a mitad de la lista, al
 * día siguiente retoma por los que quedaron afuera en vez de repetir
 * siempre los mismos primeros comercios sin avanzar nunca sobre el resto. */
export async function sincronizarGoogleTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`
    SELECT id FROM comercios WHERE google_place_id != ''
    ORDER BY google_sync_en ASC NULLS FIRST
  `;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarGoogle);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

/** Guarda el refresh token que el cliente acaba de autorizar desde su
 * portal. Se llama desde el callback de /api/portal/google/oauth. Cifrado
 * en reposo (ver lib/crypto.ts) — con TOKEN_ENCRYPTION_KEY configurada. */
export async function guardarTokenGoogleComercio(id: string, refreshToken: string): Promise<void> {
  await sql`
    UPDATE comercios SET google_refresh_token = ${cifrar(refreshToken)}, google_conectado_en = now()
    WHERE id = ${id}
  `;
}

/** Desconecta la cuenta de Google de un comercio (a pedido del cliente o
 * del admin) — borra el refresh token y el vínculo de ficha ya resuelto. */
export async function desconectarGoogleComercio(id: string): Promise<void> {
  await sql`
    UPDATE comercios SET google_refresh_token = '', google_location = '', google_conectado_en = NULL
    WHERE id = ${id}
  `;
}

/** Trae visitas al perfil, llamadas y clics "cómo llegar" del mes en curso
 * y los guarda en metricas_mensuales, usando la cuenta de Google que ESE
 * comercio conectó. Vincula la ficha sola la primera vez, matcheando por
 * place_id contra las ubicaciones que administra esa cuenta. Devuelve false
 * (sin romper) si falta cualquier pieza: sin conectar, sin place_id, la
 * cuenta no administra esa ficha, o el refresh token venció (app en modo
 * Testing: hay que reconectar cada ~7 días hasta que Google verifique la app). */
export async function sincronizarRendimiento(id: string): Promise<boolean> {
  const token = await accessTokenGBPComercio(id);
  if (!token) return false;

  const location = await resolverLocationGBP(id, token);
  if (!location) return false;

  const hoy = new Date();
  const r = await rendimientoDelMes(token, location, hoy.getFullYear(), hoy.getMonth() + 1);
  if (!r) return false;

  const mes = hoy.toISOString().slice(0, 7);
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, visitas_perfil, llamadas, clics_como_llegar)
    VALUES (${id}, ${mes}, ${r.visitas}, ${r.llamadas}, ${r.comoLlegar})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar
  `;
  return true;
}

/** Rendimiento de todos los comercios que tengan su propia cuenta de Google
 * conectada — para el cron diario. */
export async function sincronizarRendimientoTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`SELECT id FROM comercios WHERE google_refresh_token != ''`;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarRendimiento);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

/** Trae reseñas nuevas desde la Reviews API de Google y las carga en el CRM
 * (`resenas`). Las positivas (según el umbral que eligió el cliente en su
 * portal) se responden solas con el mismo generador de respuestas que usa
 * la cola manual, y quedan marcadas `publicadaAutomaticamente`; el resto
 * entra tal cual a la cola manual existente. No hace nada (0 sincronizadas)
 * si falta cualquier pieza — sin conectar, sin ficha vinculada, o mientras
 * `GOOGLE_REVIEWS_API_ENABLED` no esté prendido, porque esa API todavía
 * necesita una aprobación de Google que hoy no tenemos. */
export async function sincronizarResenasGoogle(
  id: string,
): Promise<{ nuevas: number; autoRespondidas: number }> {
  if (!resenasApiHabilitada()) return { nuevas: 0, autoRespondidas: 0 };

  const token = await accessTokenGBPComercio(id);
  if (!token) return { nuevas: 0, autoRespondidas: 0 };
  const location = await resolverLocationGBP(id, token);
  if (!location) return { nuevas: 0, autoRespondidas: 0 };

  const cliente = await getCliente(id);
  if (!cliente) return { nuevas: 0, autoRespondidas: 0 };

  const resenasGoogle = await listarResenasGoogle(token, location);
  let nuevas = 0;
  let autoRespondidas = 0;

  for (const rg of resenasGoogle) {
    const existe = await sql`SELECT 1 FROM resenas WHERE origen_google_id = ${rg.name}`;
    if (existe.length > 0) continue;

    const creada = await crearResena(
      id,
      {
        autor: rg.autor,
        estrellas: rg.estrellas,
        texto: rg.texto,
        plataforma: "google",
        fecha: rg.fecha.slice(0, 10),
        creadoEn: rg.fecha,
      },
      rg.name,
    );
    nuevas += 1;

    const esPositivaSegunUmbral = rg.estrellas >= cliente.autoResponderUmbral;
    if (!rg.yaRespondida && cliente.autoResponderPositivas && esPositivaSegunUmbral) {
      const respuesta = generarRespuestaSugerida(rg.autor, rg.estrellas, rg.texto, cliente.tonoMarca, 0);
      const publicada = await responderResenaGoogle(token, rg.name, respuesta);
      if (publicada) {
        await actualizarResena(creada.id, {
          estado: "respondida",
          respuestaSugerida: respuesta,
          respuestaPublicada: true,
          publicadaAutomaticamente: true,
        });
        autoRespondidas += 1;
      }
    } else if (rg.estrellas <= 3) {
      // No se respondió sola (es mala, o la automatización está apagada) —
      // avisarle al dueño ya, no esperar a que abra el portal por las
      // suyas.
      await alertarResenaMala(cliente, { autor: rg.autor, estrellas: rg.estrellas, texto: rg.texto });
    }
  }

  await sql`UPDATE comercios SET resenas_sync_en = now() WHERE id = ${id}`;
  return { nuevas, autoRespondidas };
}

/** Reseñas de todos los comercios con Google conectado — para el cron diario. */
export async function sincronizarResenasGoogleTodos(): Promise<{
  total: number;
  nuevas: number;
  autoRespondidas: number;
}> {
  const rows = await sql`SELECT id FROM comercios WHERE google_refresh_token != ''`;
  const ids = rows.map((r) => r.id as string);
  const resultados = await sincronizarEnLotes(ids, sincronizarResenasGoogle);
  let nuevas = 0;
  let autoRespondidas = 0;
  for (const r of resultados) {
    nuevas += r.nuevas;
    autoRespondidas += r.autoRespondidas;
  }
  return { total: ids.length, nuevas, autoRespondidas };
}

/** Toggle de automatización que el cliente elige desde su portal. */
export async function actualizarAutomatizacionResenas(
  id: string,
  datos: { autoResponderPositivas: boolean; autoResponderUmbral: 4 | 5 },
): Promise<void> {
  await sql`
    UPDATE comercios SET
      auto_responder_positivas = ${datos.autoResponderPositivas},
      auto_responder_umbral = ${datos.autoResponderUmbral}
    WHERE id = ${id}
  `;
}
