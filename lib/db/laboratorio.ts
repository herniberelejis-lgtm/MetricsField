import "server-only";
import { sql } from "../sql";
import type { EntradaLab } from "../laboratorio";
import { faltaTabla, fechaHoyCordoba } from "./google-sync";

// Carga de una sola vez todo lo que cruza el laboratorio (lib/laboratorio.ts)
// para todos los comercios que no están de baja: las métricas de Google día
// por día, las reseñas de Google, los toques al cartel y las búsquedas. Son
// pocos miles de filas por comercio; el laboratorio lo abre solo el equipo.

const ZONA_HORARIA = "America/Argentina/Cordoba";

export async function cargarEntradasLaboratorio(): Promise<EntradaLab[]> {
  const sinTabla = (e: unknown) => {
    // Sin la migración 017 no hay métricas diarias ni búsquedas.
    if (faltaTabla(e)) return [];
    throw e;
  };
  const [comercios, diarias, resenas, toques, busquedas] = await Promise.all([
    sql`SELECT id, nombre FROM comercios WHERE estado <> 'baja' ORDER BY nombre`,
    sql`
      SELECT comercio_id, to_char(fecha, 'YYYY-MM-DD') AS fecha,
        impresiones_maps + impresiones_busqueda AS visitas, como_llegar, llamadas
      FROM metricas_diarias ORDER BY comercio_id, fecha
    `.catch(sinTabla),
    sql`
      SELECT id, comercio_id,
        to_char(COALESCE((creado_en AT TIME ZONE ${ZONA_HORARIA})::date, fecha), 'YYYY-MM-DD') AS fecha,
        creado_en
      FROM resenas WHERE origen_google_id IS NOT NULL
    `,
    sql`
      SELECT l.comercio_id, to_char((t.creado_en AT TIME ZONE ${ZONA_HORARIA})::date, 'YYYY-MM-DD') AS fecha, t.creado_en
      FROM taps t JOIN links_nfc l ON l.id = t.link_id
      WHERE l.comercio_id IS NOT NULL
    `,
    sql`SELECT comercio_id, mes, palabra, impresiones FROM busquedas_mensuales`.catch(sinTabla),
  ]);

  const hoy = fechaHoyCordoba();
  const porId = new Map<string, EntradaLab>(
    comercios.map((c) => [
      c.id as string,
      { id: c.id as string, nombre: c.nombre as string, diarias: [], resenas: [], toques: [], busquedas: [], hoy },
    ]),
  );
  for (const r of diarias) {
    porId.get(r.comercio_id as string)?.diarias.push({
      fecha: r.fecha as string,
      visitas: Number(r.visitas),
      comoLlegar: Number(r.como_llegar),
      llamadas: Number(r.llamadas),
    });
  }
  for (const r of resenas) {
    porId.get(r.comercio_id as string)?.resenas.push({
      id: Number(r.id),
      fecha: r.fecha as string,
      creadoEn: r.creado_en ? new Date(r.creado_en as string | Date).toISOString() : null,
    });
  }
  for (const r of toques) {
    porId.get(r.comercio_id as string)?.toques.push({
      fecha: r.fecha as string,
      creadoEn: new Date(r.creado_en as string | Date).toISOString(),
    });
  }
  for (const r of busquedas) {
    porId.get(r.comercio_id as string)?.busquedas.push({
      mes: r.mes as string,
      palabra: r.palabra as string,
      impresiones: r.impresiones === null ? null : Number(r.impresiones),
    });
  }
  return [...porId.values()];
}
