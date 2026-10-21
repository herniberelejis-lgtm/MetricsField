import "server-only";
import { sql } from "../sql";

// Ubicación (lat/lng) del comercio y de sus competidores, para el mapa de la
// zona del portal (lib/mapa.ts). Sale de Google Places, cuyos términos dejan
// guardar las coordenadas hasta 30 días: el sync diario las renueva, el
// portal solo usa las de menos de 30 días y el cron borra las vencidas.
//
// Las columnas llegan con la migración 018. Hasta que se corra en Neon,
// todo esto no hace nada (ni rompe el sync ni el portal).

export const DIAS_VIGENCIA_UBICACION = 30;

export interface Punto {
  lat: number;
  lng: number;
}

export interface UbicacionesZona {
  propio: Punto | null;
  competidores: (Punto & { id: number; nombre: string })[];
}

/** Columna inexistente (42703): la migración 018 todavía no se corrió. */
function faltaColumna(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "42703";
}

export async function guardarUbicacion(
  tipo: "comercio" | "competidor",
  id: string | number,
  punto: Punto | null,
): Promise<void> {
  if (!punto) return;
  try {
    if (tipo === "comercio") {
      await sql`UPDATE comercios SET lat = ${punto.lat}, lng = ${punto.lng}, ubicacion_en = now() WHERE id = ${String(id)}`;
    } else {
      await sql`UPDATE competidores SET lat = ${punto.lat}, lng = ${punto.lng}, ubicacion_en = now() WHERE id = ${Number(id)}`;
    }
  } catch (e) {
    if (!faltaColumna(e)) throw e;
  }
}

/** Ubicaciones vigentes (menos de 30 días) del comercio y su competencia. */
export async function getUbicacionesZona(comercioId: string): Promise<UbicacionesZona> {
  try {
    const [propio, competidores] = await Promise.all([
      sql`
        SELECT lat, lng FROM comercios
        WHERE id = ${comercioId} AND lat IS NOT NULL
          AND ubicacion_en > now() - (${DIAS_VIGENCIA_UBICACION}::text || ' days')::interval
      `,
      sql`
        SELECT id, nombre, lat, lng FROM competidores
        WHERE comercio_id = ${comercioId} AND lat IS NOT NULL
          AND ubicacion_en > now() - (${DIAS_VIGENCIA_UBICACION}::text || ' days')::interval
        ORDER BY id
      `,
    ]);
    return {
      propio: propio[0] ? { lat: Number(propio[0].lat), lng: Number(propio[0].lng) } : null,
      competidores: competidores.map((r) => ({
        id: Number(r.id),
        nombre: r.nombre as string,
        lat: Number(r.lat),
        lng: Number(r.lng),
      })),
    };
  } catch (e) {
    if (faltaColumna(e)) return { propio: null, competidores: [] };
    throw e;
  }
}

/** Borra las coordenadas de más de 30 días (las que el sync no pudo
 * renovar): así lo piden los términos de Google Places. Corre en el cron. */
export async function borrarUbicacionesVencidas(): Promise<number> {
  try {
    const a = await sql`
      UPDATE comercios SET lat = NULL, lng = NULL, ubicacion_en = NULL
      WHERE lat IS NOT NULL AND ubicacion_en < now() - (${DIAS_VIGENCIA_UBICACION}::text || ' days')::interval
    `;
    const b = await sql`
      UPDATE competidores SET lat = NULL, lng = NULL, ubicacion_en = NULL
      WHERE lat IS NOT NULL AND ubicacion_en < now() - (${DIAS_VIGENCIA_UBICACION}::text || ' days')::interval
    `;
    return a.count + b.count;
  } catch (e) {
    if (faltaColumna(e)) return 0;
    throw e;
  }
}
