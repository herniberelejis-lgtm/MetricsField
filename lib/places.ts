import "server-only";
import { fetchPlacesSeguro } from "./places-seguridad";
import { unstable_cache } from "next/cache";

// Cliente mínimo de Google Places API (New) — solo pide rating y cantidad
// de reseñas, el único dato que se puede automatizar sin que el dueño del
// negocio autorice nada (a diferencia de "visitas al perfil" o "llamadas",
// que viven en la Business Profile Performance API y sí requieren OAuth
// del dueño). Necesita GOOGLE_PLACES_API_KEY configurada — si falta, la
// sincronización se salta en silencio en vez de romper el resto del panel.

/** Host de Places API. Solo para pruebas y demos locales se puede apuntar a
 * un Google simulado con PLACES_API_BASE; en Vercel se ignora siempre, para
 * que la clave nunca viaje a otro lado por una variable mal cargada. */
function basePlaces(): string {
  const local = process.env.PLACES_API_BASE;
  return local && !process.env.VERCEL ? local.replace(/\/+$/, "") : "https://places.googleapis.com";
}

export interface GooglePlaceStats {
  rating: number;
  totalReseñas: number;
  /** Ubicación del lugar (para el mapa de la zona). Google deja guardarla
   * hasta 30 días: ver lib/db/ubicaciones.ts. */
  ubicacion: { lat: number; lng: number } | null;
}

export async function fetchGooglePlaceStats(
  placeId: string,
  opciones: { cacheSegundos?: number } = {},
): Promise<GooglePlaceStats | null> {
  if (opciones.cacheSegundos) {
    return unstable_cache(() => fetchGooglePlaceStats(placeId), ["places-stats-v1", placeId], { revalidate: opciones.cacheSegundos })();
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeIdValido(placeId)) return null;

  const res = await fetchPlacesSeguro(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      // `location` es un campo Essentials: no cambia el precio del pedido,
      // que lo define rating/userRatingCount.
      "X-Goog-FieldMask": "rating,userRatingCount,location",
    },
    // El caché de resultados está por encima del control de cupo: un hit
    // no reserva una consulta que nunca llega a Google.
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Places API respondió ${res.status} para place_id ${placeId}`);
    return null;
  }

  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    location?: { latitude?: number; longitude?: number };
  };
  if (typeof data.rating !== "number") return null;

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  return {
    rating: data.rating,
    totalReseñas: data.userRatingCount ?? 0,
    ubicacion: typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
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
/** Centro de Córdoba capital: el buscador del portal prioriza resultados de
 * acá (es un sesgo, no un filtro — "Nemo Café, Rosario" igual aparece). */
export const SESGO_CORDOBA = { lat: -31.4167, lng: -64.1833, radioMetros: 40_000 };

export async function searchGooglePlace(
  query: string,
  sesgo?: { lat: number; lng: number; radioMetros: number },
): Promise<SearchGooglePlaceResultado> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (typeof query !== "string" || query.trim().length < 3 || query.length > 120) return { ok: true, resultados: [] };
  if (!apiKey) return { ok: false, motivo: "sin-key" };

  const res = await fetchPlacesSeguro(`${basePlaces()}/v1/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 8,
      regionCode: "AR",
      languageCode: "es",
      ...(sesgo && {
        locationBias: {
          circle: { center: { latitude: sesgo.lat, longitude: sesgo.lng }, radius: sesgo.radioMetros },
        },
      }),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Places API (searchText) respondió ${res.status}: ${await motivoGoogle(res)}`);
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

// ---------- Reseñas públicas (las que Google muestra en la ficha) ----------
// Hasta que Google apruebe la API de reseñas de Business Profile (que trae
// TODAS, con fecha exacta y permite responder), la única fuente automática
// son las que expone Places: hasta 5 por ficha, elegidas por Google ("más
// relevantes", no siempre las más nuevas).
//
// Términos de Google Maps Platform: este contenido NO se guarda en la base —
// se pide en vivo (con caché HTTP de 1 hora, que además ahorra costo: el
// campo `reviews` es de la SKU más cara de Places) y se muestra con el
// nombre/link de cada autor y la atribución a Google.

export interface ResenaGooglePublica {
  autor: string;
  autorUrl: string | null;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  /** "hace 2 días", tal cual lo da Google. */
  haceCuanto: string;
  /** ISO; para ordenar de la más nueva a la más vieja. */
  fecha: string | null;
  /** Link a esa reseña en Google Maps (para responderla desde ahí). */
  urlResena: string | null;
}

export interface ResenasGooglePublicas {
  resenas: ResenaGooglePublica[];
  /** Ficha en Google Maps — "ver todas tus reseñas". */
  urlFicha: string | null;
}

function soloHttps(url: string | undefined): string | null {
  return url && url.startsWith("https://") ? url : null;
}

export async function fetchResenasGooglePublicas(
  placeId: string,
): Promise<ResenasGooglePublicas | null> {
  return unstable_cache(() => traerResenasGooglePublicas(placeId), ["places-resenas-v1", placeId], { revalidate: 3600 })();
}

async function traerResenasGooglePublicas(placeId: string): Promise<ResenasGooglePublicas | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeIdValido(placeId)) return null;

  const res = await fetchPlacesSeguro(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "reviews,googleMapsUri",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Places API (reseñas) respondió ${res.status} para place_id ${placeId}`);
    return null;
  }

  const data = (await res.json()) as {
    googleMapsUri?: string;
    reviews?: {
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      googleMapsUri?: string;
      authorAttribution?: { displayName?: string; uri?: string };
    }[];
  };

  const resenas: ResenaGooglePublica[] = [];
  for (const r of data.reviews ?? []) {
    const estrellas = Math.round(r.rating ?? 0);
    if (estrellas < 1 || estrellas > 5) continue;
    resenas.push({
      autor: r.authorAttribution?.displayName || "Cliente de Google",
      autorUrl: soloHttps(r.authorAttribution?.uri),
      estrellas: estrellas as 1 | 2 | 3 | 4 | 5,
      // El texto original (en el idioma en que la escribieron), no la
      // traducción automática de Google.
      texto: r.originalText?.text ?? r.text?.text ?? "",
      haceCuanto: r.relativePublishTimeDescription ?? "",
      fecha: r.publishTime ?? null,
      urlResena: soloHttps(r.googleMapsUri),
    });
  }
  resenas.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  return { resenas, urlFicha: soloHttps(data.googleMapsUri) };
}

// ---------- Link de reseña para la activación de piezas (canal Mercado Libre) ----------
// En vez de pedirle al comprador que encuentre y copie el link de reseña de
// su ficha (lo más difícil de la activación), elige su negocio de una lista
// y el link lo da Google: `googleMapsLinks.writeAReviewUri` de Places API
// (New), el link oficial que abre "escribir una reseña" de ese lugar.

export interface LugarParaResena {
  placeId: string;
  nombre: string;
  direccion: string;
}

/** Solo el código de error: el texto libre del proveedor puede contener
 * identificadores o información de credenciales y no se registra. */
async function motivoGoogle(res: Response): Promise<string> {
  try {
    const cuerpo = (await res.json()) as { error?: { status?: string } };
    return (cuerpo.error?.status ?? "").replace(/[^A-Z_]/g, "").slice(0, 60);
  } catch {
    return "(sin detalle)";
  }
}

/** Token de sesión de Autocomplete: lo genera el navegador (un UUID) y
 * agrupa las sugerencias de una búsqueda con el detalle del lugar elegido,
 * que Google cobra como una sola sesión. */
export function tokenSesionValido(token: string): boolean {
  return /^[A-Za-z0-9-]{8,64}$/.test(token);
}

/** Sugerencias mientras se escribe, como el buscador de Google Maps:
 * negocios de Argentina, priorizando la zona de `sesgo` (Córdoba por
 * defecto, porque el servidor corre fuera del país y sin sesgo Google no
 * sabe dónde está quien busca). Busca por nombre, por calle o por las dos. */
export async function autocompletarLugar(
  texto: string,
  opciones: { sesionToken?: string; sesgo?: { lat: number; lng: number; radioMetros: number } } = {},
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false }> {
  if (typeof texto !== "string" || texto.trim().length < 3 || texto.length > 120) return { ok: false };
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Places API (autocomplete): falta GOOGLE_PLACES_API_KEY");
    return { ok: false };
  }
  const sesgo = opciones.sesgo ?? SESGO_CORDOBA;
  const res = await fetchPlacesSeguro(`${basePlaces()}/v1/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: texto,
      includedRegionCodes: ["ar"],
      regionCode: "ar",
      languageCode: "es",
      locationBias: {
        circle: { center: { latitude: sesgo.lat, longitude: sesgo.lng }, radius: sesgo.radioMetros },
      },
      ...(opciones.sesionToken && { sessionToken: opciones.sesionToken }),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Places API (autocomplete) respondió ${res.status}: ${await motivoGoogle(res)}`);
    return { ok: false };
  }
  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }[];
  };
  const lugares: LugarParaResena[] = [];
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId || !placeIdValido(p.placeId)) continue;
    lugares.push({
      placeId: p.placeId,
      nombre: p.structuredFormat?.mainText?.text ?? "(sin nombre)",
      direccion: p.structuredFormat?.secondaryText?.text ?? "",
    });
  }
  return { ok: true, lugares };
}

/** place_id de Google: letras, números, guiones y guiones bajos. */
export function placeIdValido(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,300}$/.test(id);
}

/** Link "escribir una reseña" y nombre de un lugar; null si Places no lo da. */
export async function linkResenaDeLugar(
  placeId: string,
  sesionToken?: string,
): Promise<{ nombre: string; link: string } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeIdValido(placeId)) return null;
  const sesion = sesionToken && tokenSesionValido(sesionToken) ? `&sessionToken=${encodeURIComponent(sesionToken)}` : "";
  const res = await fetchPlacesSeguro(`${basePlaces()}/v1/places/${encodeURIComponent(placeId)}?languageCode=es${sesion}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "id,displayName,googleMapsLinks" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Places API (detalle para reseña) respondió ${res.status}: ${await motivoGoogle(res)}`);
    return null;
  }
  const data = (await res.json()) as { displayName?: { text?: string }; googleMapsLinks?: { writeAReviewUri?: string } };
  // Sin writeAReviewUri (la función todavía está en "preview" en Google),
  // el formato clásico por place_id, que es el que usan las herramientas
  // de Google para pedir reseñas.
  const link =
    data.googleMapsLinks?.writeAReviewUri ||
    `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  return { nombre: data.displayName?.text ?? "", link };
}
