import "server-only";

// Cliente de la Reviews API de Google Business Profile (API v4 "My
// Business" — Google todavía no migró listar/responder reseñas a las APIs
// nuevas que usa lib/gbp.ts). A diferencia de Performance, este endpoint en
// particular exige una aprobación de acceso aparte de Google
// (developers.google.com/my-business/content/prereqs) que hoy no tenemos.
//
// Por eso todo lo que llama a estas funciones (sincronizarResenasGoogle en
// lib/db.ts) chequea antes resenasApiHabilitada() — la única pieza que falta
// para que esto funcione de verdad es que, el día que llegue esa
// aprobación, alguien ponga GOOGLE_REVIEWS_API_ENABLED=true en las env vars.
// El código de acá abajo ya está escrito contra la forma real de la API.

/** true solo cuando alguien prendió el flag a mano — nunca se auto-activa,
 * porque la aprobación de Google no es algo que el código pueda detectar. */
export function resenasApiHabilitada(): boolean {
  return process.env.GOOGLE_REVIEWS_API_ENABLED === "true";
}

const RATING_A_NUMERO: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export interface ResenaGoogleAPI {
  /** resource name completo: "accounts/{a}/locations/{l}/reviews/{r}" */
  name: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  autor: string;
  texto: string;
  fecha: string; // ISO
  yaRespondida: boolean;
}

/** Trae todas las reseñas de una ficha, paginando. `location` es el mismo
 * resource name que ya usamos para Performance ("accounts/{a}/locations/{l}"). */
export async function listarResenasGoogle(
  accessToken: string,
  location: string,
): Promise<ResenaGoogleAPI[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const resenas: ResenaGoogleAPI[] = [];
  let pageToken = "";

  // cap defensivo: 10 páginas de 50 alcanza de sobra para un comercio local
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ pageSize: "50" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${location}/reviews?${params}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) {
      console.error(`Reviews API respondió ${res.status} para ${location}`);
      break;
    }
    const data = (await res.json()) as {
      reviews?: {
        name: string;
        starRating?: string;
        comment?: string;
        reviewer?: { displayName?: string };
        createTime?: string;
        reviewReply?: { comment: string };
      }[];
      nextPageToken?: string;
    };
    for (const r of data.reviews ?? []) {
      const estrellas = RATING_A_NUMERO[r.starRating ?? ""];
      if (!estrellas) continue; // rating sin especificar: no hay mucho que hacer con eso
      resenas.push({
        name: r.name,
        estrellas: estrellas as 1 | 2 | 3 | 4 | 5,
        autor: r.reviewer?.displayName ?? "Cliente de Google",
        texto: r.comment ?? "",
        fecha: r.createTime ?? new Date().toISOString(),
        yaRespondida: Boolean(r.reviewReply),
      });
    }
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return resenas;
}

/** Publica (o reemplaza) la respuesta pública a una reseña puntual. Devuelve
 * false sin tirar excepción si la API rechaza el pedido — quien la llama
 * decide qué hacer (típicamente: dejarla en la cola manual). */
export async function responderResenaGoogle(
  accessToken: string,
  reviewName: string,
  comentario: string,
): Promise<boolean> {
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: comentario }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`Reviews API (reply) respondió ${res.status} para ${reviewName}`);
    return false;
  }
  return true;
}
