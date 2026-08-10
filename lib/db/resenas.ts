import "server-only";
import { sql } from "../sql";
import type { EstadoResena, ResenaCRM } from "../types";
import { fechaISO } from "./_compartido";

// ---------- CRM de reseñas ----------

function mapResena(r: Record<string, unknown>): ResenaCRM {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    autor: r.autor as string,
    estrellas: Number(r.estrellas) as 1 | 2 | 3 | 4 | 5,
    texto: r.texto as string,
    plataforma: r.plataforma as "google" | "otra",
    estado: r.estado as EstadoResena,
    respuestaSugerida: (r.respuesta_sugerida as string | null) ?? null,
    respuestaPublicada: Boolean(r.respuesta_publicada),
    responsable: (r.responsable as string | null) ?? null,
    notas: r.notas as string,
    fecha: fechaISO(r.fecha),
    origenGoogleId: (r.origen_google_id as string | null) ?? null,
    publicadaAutomaticamente: Boolean(r.publicada_automaticamente),
    creadoEn: r.creado_en ? new Date(r.creado_en as string).toISOString() : null,
  };
}

export async function getResenas(comercioId: string): Promise<ResenaCRM[]> {
  const rows = await sql`
    SELECT * FROM resenas WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapResena);
}

export async function crearResena(
  comercioId: string,
  datos: {
    autor: string;
    estrellas: 1 | 2 | 3 | 4 | 5;
    texto: string;
    plataforma: "google" | "otra";
    fecha: string;
    /** Hora exacta si se conoce — default ahora mismo (carga manual sin
     * hora propia) o el createTime real de Google si viene del sync. */
    creadoEn?: string;
  },
  origenGoogleId: string | null = null,
): Promise<ResenaCRM> {
  const rows = await sql`
    INSERT INTO resenas (comercio_id, autor, estrellas, texto, plataforma, fecha, origen_google_id, creado_en)
    VALUES (${comercioId}, ${datos.autor}, ${datos.estrellas}, ${datos.texto}, ${datos.plataforma}, ${datos.fecha}, ${origenGoogleId}, ${datos.creadoEn ?? new Date().toISOString()})
    RETURNING *
  `;
  return mapResena(rows[0]);
}

export async function actualizarResena(
  id: number,
  datos: Partial<{
    estado: EstadoResena;
    respuestaSugerida: string;
    respuestaPublicada: boolean;
    responsable: string;
    notas: string;
    publicadaAutomaticamente: boolean;
  }>,
): Promise<ResenaCRM> {
  const rows = await sql`
    UPDATE resenas SET
      estado = COALESCE(${datos.estado ?? null}, estado),
      respuesta_sugerida = COALESCE(${datos.respuestaSugerida ?? null}, respuesta_sugerida),
      respuesta_publicada = COALESCE(${datos.respuestaPublicada ?? null}, respuesta_publicada),
      responsable = COALESCE(${datos.responsable ?? null}, responsable),
      notas = COALESCE(${datos.notas ?? null}, notas),
      publicada_automaticamente = COALESCE(${datos.publicadaAutomaticamente ?? null}, publicada_automaticamente)
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) throw new Error(`Reseña no encontrada: ${id}`);
  return mapResena(rows[0]);
}

export interface ResenasResumenPeriodo {
  total: number;
  negativas: number; // ≤ 3★
  porEstrellas: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Reseñas de toda la cartera (solo comercios activos, cuenta o sucursal)
 * en un rango de fechas — para el panel unificado de admin. */
export async function getResenasResumenPortfolio(desde: string, hasta: string): Promise<ResenasResumenPeriodo> {
  const rows = await sql`
    SELECT r.estrellas, COUNT(*)::int AS n
    FROM resenas r
    JOIN comercios c ON c.id = r.comercio_id
    WHERE c.estado = 'activo' AND r.fecha BETWEEN ${desde}::date AND ${hasta}::date
    GROUP BY r.estrellas
  `;
  const porEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let total = 0;
  let negativas = 0;
  for (const r of rows) {
    const estrellas = Number(r.estrellas) as 1 | 2 | 3 | 4 | 5;
    const n = Number(r.n);
    porEstrellas[estrellas] = n;
    total += n;
    if (estrellas <= 3) negativas += n;
  }
  return { total, negativas, porEstrellas };
}
