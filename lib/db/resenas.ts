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

// Mismo huso que el resto de los mapas de calor del portal (ver
// lib/db/links.ts) — sin esto, una reseña de las 21-23:59 locales cae en el
// día siguiente del gráfico (los timestamps se guardan en UTC).
const TZ_COMERCIO = "America/Argentina/Cordoba";

export interface CeldaResenaHora {
  /** Promedio de estrellas (redondeado a entero) de las reseñas de Google
   * publicadas esa hora — null si no hubo ninguna. Si cae más de una en la
   * misma hora (raro, pero posible) se promedia en vez de quedarse con la
   * última, para no esconder una mala en el medio de varias buenas. */
  rating: 1 | 2 | 3 | 4 | 5 | null;
  cantidad: number;
}

export interface ResenasPorHoraDia {
  fecha: string; // YYYY-MM-DD, hora local del comercio
  horas: CeldaResenaHora[]; // 24 celdas (hora 0..23)
}

/** Grilla día×hora de CUÁNDO llegan las reseñas de Google (últimos `dias`),
 * coloreada por calificación en vez de por cantidad — mismo mapa de calor
 * que "a qué hora te tocan el cartel" (getTapsPorHoraSemana), pero acá el
 * dato que importa no es el volumen sino si lo que entra es bueno o malo.
 * Solo reseñas con `plataforma = 'google'` y hora real conocida
 * (`creado_en`, que solo trae el sync automático) — una carga manual en el
 * CRM sin hora no tiene un "cuándo" real que mostrar acá. */
export async function getResenasPorHoraSemana(comercioId: string, dias = 7): Promise<ResenasPorHoraDia[]> {
  const rows = await sql`
    WITH dias AS (
      SELECT (now() AT TIME ZONE ${TZ_COMERCIO})::date - offset_dias AS fecha
      FROM generate_series(0, ${dias - 1}) AS offset_dias
    ),
    horas AS (
      SELECT generate_series(0, 23) AS hora
    ),
    conteo AS (
      SELECT
        (creado_en AT TIME ZONE ${TZ_COMERCIO})::date AS fecha,
        EXTRACT(HOUR FROM creado_en AT TIME ZONE ${TZ_COMERCIO})::int AS hora,
        COUNT(*)::int AS cantidad,
        ROUND(AVG(estrellas))::int AS rating
      FROM resenas
      WHERE comercio_id = ${comercioId}
        AND plataforma = 'google'
        AND creado_en IS NOT NULL
        AND creado_en >= now() - (${dias}::text || ' days')::interval
      GROUP BY 1, 2
    )
    SELECT
      to_char(d.fecha, 'YYYY-MM-DD') AS fecha,
      h.hora,
      COALESCE(c.cantidad, 0)::int AS cantidad,
      c.rating
    FROM dias d
    CROSS JOIN horas h
    LEFT JOIN conteo c ON c.fecha = d.fecha AND c.hora = h.hora
    ORDER BY d.fecha ASC, h.hora ASC
  `;

  const porFecha = new Map<string, CeldaResenaHora[]>();
  for (const r of rows) {
    const fecha = r.fecha as string;
    if (!porFecha.has(fecha)) {
      porFecha.set(fecha, Array.from({ length: 24 }, () => ({ rating: null, cantidad: 0 })));
    }
    const rating = r.rating === null ? null : (Number(r.rating) as 1 | 2 | 3 | 4 | 5);
    porFecha.get(fecha)![Number(r.hora)] = { rating, cantidad: Number(r.cantidad) };
  }
  return Array.from(porFecha.entries()).map(([fecha, horas]) => ({ fecha, horas }));
}
