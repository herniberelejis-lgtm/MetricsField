import "server-only";
import { sql } from "../sql";

// Piezas compradas por Mercado Libre (autogestionadas): lo que se guarda en
// la activación además de lo básico (nombre, link y PIN, que guarda
// activarAutogestion en ./links) y el aviso semanal gratis para quien lo
// pidió. Todo usa columnas de la migración 019: mientras no se corra en
// Neon, guardar devuelve false y leer devuelve vacío, sin romper la
// activación (un comprador real no puede quedarse con la pieza sin andar
// por una migración pendiente).

/** Datos opcionales de la activación. El contacto solo se guarda si el
 * comprador aceptó que le escribamos (casilla en la activación). */
export async function guardarDatosActivacion(
  slug: string,
  d: { googlePlaceId: string | null; email: string; whatsapp: string; aceptaNovedades: boolean },
): Promise<boolean> {
  const email = d.aceptaNovedades ? d.email : "";
  const whatsapp = d.aceptaNovedades ? d.whatsapp : "";
  try {
    await sql`
      UPDATE links_nfc SET
        google_place_id = ${d.googlePlaceId},
        contacto_email = ${email},
        contacto_whatsapp = ${whatsapp},
        novedades_aceptadas_en = ${d.aceptaNovedades && (email || whatsapp) ? sql`now()` : null},
        novedades_baja_en = NULL,
        activado_en = COALESCE(activado_en, now())
      WHERE id = ${slug} AND autogestionado = TRUE
    `;
    return true;
  } catch (e) {
    console.error("Activación: no se guardaron los datos extra (¿falta la migración 019?)", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Cambio del lugar de Google desde la edición con PIN (el contacto no se toca). */
export async function guardarLugarAutogestion(slug: string, googlePlaceId: string | null): Promise<void> {
  try {
    await sql`UPDATE links_nfc SET google_place_id = ${googlePlaceId} WHERE id = ${slug} AND autogestionado = TRUE`;
  } catch (e) {
    console.error("Edición: no se guardó el lugar (¿falta la migración 019?)", e instanceof Error ? e.message : e);
  }
}

/** Al entregar la pieza a otro dueño: el contacto del anterior (mail y
 * WhatsApp del aviso semanal) no viaja con ella. */
export async function borrarContactoPieza(slug: string): Promise<void> {
  try {
    await sql`
      UPDATE links_nfc SET contacto_email = '', contacto_whatsapp = '', novedades_aceptadas_en = NULL
      WHERE id = ${slug} AND autogestionado = TRUE AND comercio_id IS NULL
    `;
  } catch (e) {
    console.error("Entrega: no se borró el contacto (¿falta la migración 019?)", e instanceof Error ? e.message : e);
  }
}

/** Baja del aviso semanal para todas las piezas con ese mail. */
export async function darDeBajaNovedades(email: string): Promise<number> {
  try {
    const rows = await sql`
      UPDATE links_nfc SET novedades_baja_en = now()
      WHERE lower(contacto_email) = lower(${email}) AND novedades_baja_en IS NULL
      RETURNING id
    `;
    return rows.length;
  } catch (e) {
    console.error("Baja de novedades:", e instanceof Error ? e.message : e);
    return 0;
  }
}

export interface PiezaSuscripta {
  id: string;
  nombreNegocio: string;
  email: string;
  tipo: string;
  toquesSemana: number;
  toquesSemanaAnterior: number;
  toquesTotal: number;
}

/** Piezas cuyo comprador pidió el aviso semanal y no se dio de baja. */
export async function getPiezasSuscriptas(): Promise<PiezaSuscripta[]> {
  try {
    const rows = await sql`
      SELECT l.id, l.nombre_negocio, l.contacto_email, l.tipo,
        COUNT(t.id) FILTER (WHERE t.creado_en > now() - interval '7 days')::int AS semana,
        COUNT(t.id) FILTER (WHERE t.creado_en <= now() - interval '7 days' AND t.creado_en > now() - interval '14 days')::int AS anterior,
        COUNT(t.id)::int AS total
      FROM links_nfc l
      LEFT JOIN taps t ON t.link_id = l.id
      WHERE l.autogestionado = TRUE AND l.comercio_id IS NULL
        AND l.contacto_email != '' AND l.novedades_aceptadas_en IS NOT NULL AND l.novedades_baja_en IS NULL
      GROUP BY l.id
      ORDER BY l.contacto_email, l.id
    `;
    return rows.map((r) => ({
      id: r.id as string,
      nombreNegocio: (r.nombre_negocio as string) || "Tu negocio",
      email: r.contacto_email as string,
      tipo: r.tipo as string,
      toquesSemana: Number(r.semana),
      toquesSemanaAnterior: Number(r.anterior),
      toquesTotal: Number(r.total),
    }));
  } catch (e) {
    console.error("Aviso semanal de piezas:", e instanceof Error ? e.message : e);
    return [];
  }
}

// ---------- Cuenta de Google que maneja la pieza (migración 020) ----------
// Mientras la migración no se corra, todo esto devuelve vacío/false y la
// app sigue con el llavero del celular solamente.

/** Guarda en la cuenta las piezas que ya maneja este navegador (el que
 * llama verificó el llavero antes). Solo autogestionadas sin cliente. */
export async function vincularPiezasACuenta(codigos: string[], email: string): Promise<boolean> {
  if (codigos.length === 0 || !email) return true;
  try {
    await sql`
      UPDATE links_nfc SET duenio_email = ${email.toLowerCase()}
      WHERE id = ANY(${codigos}) AND autogestionado = TRUE AND comercio_id IS NULL
    `;
    return true;
  } catch (e) {
    console.error("Cuenta de piezas: no se vincularon (¿falta la migración 020?)", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Códigos de las piezas guardadas en esa cuenta. */
export async function codigosDeCuenta(email: string): Promise<string[] | null> {
  try {
    const rows = await sql`
      SELECT id FROM links_nfc
      WHERE lower(duenio_email) = ${email.toLowerCase()} AND autogestionado = TRUE AND comercio_id IS NULL
      ORDER BY activado_en DESC NULLS LAST, id
      LIMIT 500
    `;
    return rows.map((r) => r.id as string);
  } catch {
    return null; // sin la migración 020
  }
}

export async function piezaEsDeCuenta(slug: string, email: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT 1 FROM links_nfc
      WHERE id = ${slug} AND lower(duenio_email) = ${email.toLowerCase()} AND autogestionado = TRUE AND comercio_id IS NULL
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Al entregar la pieza: deja de estar en la cuenta de quien la entregó. */
export async function desvincularPieza(slug: string): Promise<void> {
  try {
    await sql`UPDATE links_nfc SET duenio_email = '' WHERE id = ${slug} AND autogestionado = TRUE AND comercio_id IS NULL`;
  } catch {
    // sin la migración 020 no hay nada que desvincular
  }
}

/** ¿Está corrida la migración 020? (para mostrar o no el botón de Google) */
export async function cuentasDePiezasDisponibles(): Promise<boolean> {
  try {
    await sql`SELECT duenio_email FROM links_nfc LIMIT 0`;
    return true;
  } catch {
    return false;
  }
}
