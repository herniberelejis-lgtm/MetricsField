import crypto from "node:crypto";

// Mapa de la zona del portal: una imagen de Google Maps Static API con el
// comercio y sus competidores. La imagen la pide el navegador del cliente
// directo a Google (no pasa por nuestro servidor ni se guarda), y las
// ubicaciones salen de Google Places: así lo piden los términos de Google
// (datos de Places solo sobre un mapa de Google).
//
// Necesita GOOGLE_MAPS_STATIC_KEY: una clave aparte de la de Places, porque
// esta viaja en la URL de la imagen. En Google Cloud se restringe a la
// Maps Static API y al dominio app.metricsfield.com. Con
// GOOGLE_MAPS_STATIC_FIRMA (el "secreto de firma de URL" de la misma
// consola) cada URL va firmada y nadie puede reusar la clave para otros
// mapas. Sin la clave, el portal no muestra el mapa.

export interface PuntoMapa {
  lat: number;
  lng: number;
  /** Una letra o un número (lo que Google acepta como etiqueta). */
  etiqueta?: string;
  propio?: boolean;
}

const BASE = "https://maps.googleapis.com";
const RUTA = "/maps/api/staticmap";

function coord(n: number): string {
  // 6 decimales ≈ 10 cm: de sobra, y la URL queda corta.
  return n.toFixed(6);
}

/** Firma de URL de Google Maps Platform: HMAC-SHA1 de ruta + query con el
 * secreto (base64 "url-safe"), devuelta también en base64 url-safe. */
export function firmarUrl(rutaYQuery: string, secreto: string): string {
  const clave = Buffer.from(secreto.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const firma = crypto.createHmac("sha1", clave).update(rutaYQuery).digest("base64");
  return firma.replace(/\+/g, "-").replace(/\//g, "_");
}

/** URL de la imagen del mapa. Con un solo punto se centra en él; con más,
 * Google encuadra todos los marcadores solo. */
export function urlMapaEstatico(
  puntos: PuntoMapa[],
  opciones: { key: string; secreto?: string; ancho?: number; alto?: number },
): string {
  const p = new URLSearchParams();
  p.set("size", `${opciones.ancho ?? 640}x${opciones.alto ?? 320}`);
  p.set("scale", "2");
  p.set("maptype", "roadmap");
  p.set("language", "es");
  p.set("region", "AR");
  // Sin los negocios y paradas que Google dibuja por su cuenta: que se lean
  // solo los marcadores de la competencia.
  p.append("style", "feature:poi|visibility:off");
  p.append("style", "feature:transit|visibility:off");
  if (puntos.length === 1) {
    p.set("center", `${coord(puntos[0].lat)},${coord(puntos[0].lng)}`);
    p.set("zoom", "15");
  }
  for (const pt of puntos) {
    const partes = [`color:${pt.propio ? "0x9B86DB" : "0x6F9BCF"}`];
    if (pt.etiqueta && /^[A-Z0-9]$/.test(pt.etiqueta)) partes.push(`label:${pt.etiqueta}`);
    partes.push(`${coord(pt.lat)},${coord(pt.lng)}`);
    p.append("markers", partes.join("|"));
  }
  p.set("key", opciones.key);
  const rutaYQuery = `${RUTA}?${p.toString()}`;
  return opciones.secreto ? `${BASE}${rutaYQuery}&signature=${firmarUrl(rutaYQuery, opciones.secreto)}` : `${BASE}${rutaYQuery}`;
}
