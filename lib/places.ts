import "server-only";

// Cliente mínimo de Google Places API (New) — solo pide rating y cantidad
// de reseñas, el único dato que se puede automatizar sin que el dueño del
// negocio autorice nada (a diferencia de "visitas al perfil" o "llamadas",
// que viven en la Business Profile Performance API y sí requieren OAuth
// del dueño). Necesita GOOGLE_PLACES_API_KEY configurada — si falta, la
// sincronización se salta en silencio en vez de romper el resto del panel.

export interface GooglePlaceStats {
  rating: number;
  totalReseñas: number;
}

export async function fetchGooglePlaceStats(
  placeId: string,
): Promise<GooglePlaceStats | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount",
    },
    // Nunca cachear: siempre queremos el dato más nuevo cuando se pide.
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Places API respondió ${res.status} para place_id ${placeId}`);
    return null;
  }

  const data = (await res.json()) as { rating?: number; userRatingCount?: number };
  if (typeof data.rating !== "number") return null;

  return {
    rating: data.rating,
    totalReseñas: data.userRatingCount ?? 0,
  };
}

export interface GooglePlaceResultado {
  placeId: string;
  nombre: string;
  direccion: string;
}

/** Por qué no hay resultados — antes esto era un `null` que tapaba dos
 * causas completamente distintas (la env var no está cargada vs. Google
 * rechazó la key) bajo el mismo mensaje "Falta configurar
 * GOOGLE_PLACES_API_KEY", que llevó a un rato perdido buscando la variable
 * cuando el problema real era una key con "Places API (New)" sin habilitar.
 * "rechazada" incluye el status HTTP para poder distinguir 403 (permiso/
 * facturación/restricción) de otros códigos. */
export type SearchGooglePlaceResultado =
  | { ok: true; resultados: GooglePlaceResultado[] }
  | { ok: false; motivo: "sin-key" }
  | { ok: false; motivo: "rechazada"; status: number };

/** Busca lugares por texto libre (nombre + zona) — para que el equipo
 * encuentre el place_id de un cliente sin salir del panel ni pelearse con
 * la herramienta de Google (que Google bloquea si se intenta automatizar
 * desde afuera). Google no deja usar esto desde el navegador del cliente
 * final por CORS, así que corre server-side y el panel lo consume por
 * /api/places-search. */
export async function searchGooglePlace(query: string): Promise<SearchGooglePlaceResultado> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!query.trim()) return { ok: true, resultados: [] };
  if (!apiKey) return { ok: false, motivo: "sin-key" };

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, regionCode: "AR", languageCode: "es" }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Places API (searchText) respondió ${res.status}`);
    return { ok: false, motivo: "rechazada", status: res.status };
  }

  const data = (await res.json()) as {
    places?: { id: string; displayName?: { text: string }; formattedAddress?: string }[];
  };

  return {
    ok: true,
    resultados: (data.places ?? []).map((p) => ({
      placeId: p.id,
      nombre: p.displayName?.text ?? "(sin nombre)",
      direccion: p.formattedAddress ?? "",
    })),
  };
}
