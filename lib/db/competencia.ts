import "server-only";
import { sql } from "../sql";
import { fetchGooglePlaceStats } from "../places";
import type { BenchmarkMes, Competidor } from "../types";
import { sincronizarEnLotes } from "./_compartido";

// ---------- Competencia ----------

function mapCompetidor(r: Record<string, unknown>): Competidor {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    nombre: r.nombre as string,
    rating: r.rating === null ? null : Number(r.rating),
    totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    googlePlaceId: (r.google_place_id as string | null) ?? null,
    actualizadoEn: String(r.actualizado_en),
  };
}

export async function getCompetidores(comercioId: string): Promise<Competidor[]> {
  const rows = await sql`
    SELECT * FROM competidores WHERE comercio_id = ${comercioId} ORDER BY rating DESC NULLS LAST
  `;
  return rows.map(mapCompetidor);
}

export async function crearCompetidor(
  comercioId: string,
  datos: { nombre: string; rating?: number | null; totalResenas?: number | null; googlePlaceId?: string | null },
): Promise<Competidor> {
  const rows = await sql`
    INSERT INTO competidores (comercio_id, nombre, rating, total_resenas, google_place_id)
    VALUES (${comercioId}, ${datos.nombre}, ${datos.rating ?? null}, ${datos.totalResenas ?? null}, ${datos.googlePlaceId ?? null})
    RETURNING *
  `;
  return mapCompetidor(rows[0]);
}

export async function actualizarCompetidor(
  id: number,
  datos: Partial<{ nombre: string; rating: number | null; totalResenas: number | null; googlePlaceId: string | null }>,
): Promise<Competidor> {
  const rows = await sql`
    UPDATE competidores SET
      nombre = COALESCE(${datos.nombre ?? null}, nombre),
      rating = ${datos.rating === undefined ? sql`rating` : datos.rating},
      total_resenas = ${datos.totalResenas === undefined ? sql`total_resenas` : datos.totalResenas},
      google_place_id = ${datos.googlePlaceId === undefined ? sql`google_place_id` : datos.googlePlaceId},
      actualizado_en = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error(`Competidor no encontrado: ${id}`);
  return mapCompetidor(rows[0]);
}

export async function eliminarCompetidor(id: number): Promise<void> {
  await sql`DELETE FROM competidores WHERE id = ${id}`;
}

/** Trae rating/reseñas actuales de un competidor desde Google Places API —
 * mismo mecanismo que sincronizarGoogle() para el propio comercio, pero acá
 * no hace falta ningún permiso del dueño: el place_id de un negocio ajeno
 * es dato público. Si no tiene place_id cargado, no hace nada (el
 * competidor sigue siendo editable a mano). */
export async function sincronizarCompetidor(id: number): Promise<boolean> {
  const rows = await sql`SELECT google_place_id FROM competidores WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id as string | null | undefined;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

  await sql`
    UPDATE competidores SET
      rating = ${stats.rating},
      total_resenas = ${stats.totalReseñas},
      actualizado_en = now()
    WHERE id = ${id}
  `;
  return true;
}

/** Sincroniza todos los competidores con place_id cargado — corre en el
 * cron diario, antes de congelar la foto mensual (snapshotCompetenciaMensual),
 * así el benchmarking histórico se arma con datos frescos y no con lo
 * último que alguien tipeó a mano. */
export async function sincronizarCompetidoresTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`
    SELECT id FROM competidores WHERE google_place_id IS NOT NULL AND google_place_id != ''
  `;
  const ids = rows.map((r) => Number(r.id));
  const resultados = await sincronizarEnLotes(ids, sincronizarCompetidor);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

// ---------- Benchmarking histórico (fotos mensuales de competencia) ----------

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Guarda la foto del mes en curso de TODOS los competidores cargados: su
 * rating y total de reseñas actuales. Idempotente por (competidor, mes) —
 * correrla varias veces en el mismo mes solo actualiza la fila; al cambiar
 * de mes, la del mes anterior queda congelada. Pensada para el cron diario. */
export async function snapshotCompetenciaMensual(mes = mesActual()): Promise<number> {
  const rows = await sql`
    INSERT INTO competidores_snapshots (competidor_id, comercio_id, nombre, mes, rating, total_resenas)
    SELECT id, comercio_id, nombre, ${mes}, rating, total_resenas FROM competidores
    ON CONFLICT (competidor_id, mes) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      rating = EXCLUDED.rating,
      total_resenas = EXCLUDED.total_resenas,
      comercio_id = EXCLUDED.comercio_id,
      capturado_en = now()
    RETURNING competidor_id
  `;
  return rows.length;
}

/** Benchmarking mensual de un comercio: por cada mes con foto de competencia,
 * nuestras métricas de ese mes (del histórico propio) + la foto de cada
 * competidor. Orden descendente por mes (más reciente primero). */
export async function getBenchmarkMensual(comercioId: string): Promise<BenchmarkMes[]> {
  const [snaps, propias] = await Promise.all([
    sql`
      SELECT mes, nombre, rating, total_resenas
      FROM competidores_snapshots
      WHERE comercio_id = ${comercioId}
      ORDER BY mes DESC, nombre ASC
    `,
    sql`
      SELECT mes, resenas_total, rating_promedio
      FROM metricas_mensuales
      WHERE comercio_id = ${comercioId}
    `,
  ]);

  const propiaPorMes = new Map<string, { resenas: number; rating: number }>();
  for (const r of propias) {
    propiaPorMes.set(r.mes as string, {
      resenas: Number(r.resenas_total),
      rating: Number(r.rating_promedio),
    });
  }

  const porMes = new Map<string, BenchmarkMes>();
  for (const r of snaps) {
    const mes = r.mes as string;
    let fila = porMes.get(mes);
    if (!fila) {
      const propia = propiaPorMes.get(mes);
      fila = {
        mes,
        propioResenas: propia ? propia.resenas : null,
        propioRating: propia ? propia.rating : null,
        competidores: [],
      };
      porMes.set(mes, fila);
    }
    fila.competidores.push({
      nombre: r.nombre as string,
      rating: r.rating === null ? null : Number(r.rating),
      totalResenas: r.total_resenas === null ? null : Number(r.total_resenas),
    });
  }

  return [...porMes.values()];
}
