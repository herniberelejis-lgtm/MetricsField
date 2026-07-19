"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { activarAutogestion, editarAutogestion } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { pinValido } from "@/lib/pin";

function urlDeResenaValida(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// Autogestión de hardware (canal Mercado Libre): activar una pieza libre
// que su comprador escaneó por primera vez. Sin login — el rate limit por
// IP es la única defensa contra reclamar piezas en masa por fuerza bruta
// sobre los códigos (son secuenciales); alcanza para el volumen de este
// canal, no para un ataque dedicado con muchas IPs.
export async function activarCartel(
  slug: string,
  nombreNegocio: string,
  urlDestino: string,
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  const nombre = String(nombreNegocio ?? "").trim().slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  const url = String(urlDestino ?? "").trim();
  if (!urlDeResenaValida(url)) {
    return { ok: false, error: "Pegá el link completo de tu reseña de Google (empieza con https://)." };
  }

  if (!pinValido(String(pin ?? ""))) {
    return { ok: false, error: "El PIN tiene que ser de 4 a 8 números." };
  }

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!permitir(`activar-cartel:${ip}`, 5, 30 * 60_000)) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  try {
    await activarAutogestion(slug, { nombreNegocio: nombre, urlDestino: url, pin: String(pin) });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo activar." };
  }
  revalidatePath(`/t/${slug}`);
  return { ok: true };
}

// Editar una pieza ya autogestionada — pide el PIN elegido en la
// activación. Rate limit por IP+pieza: un PIN de pocos dígitos solo es
// seguro si además está protegido contra fuerza bruta.
export async function editarCartel(
  slug: string,
  pin: string,
  nombreNegocio: string,
  urlDestino: string,
): Promise<{ ok: boolean; error?: string }> {
  const nombre = String(nombreNegocio ?? "").trim().slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  const url = String(urlDestino ?? "").trim();
  if (!urlDeResenaValida(url)) {
    return { ok: false, error: "Pegá el link completo de tu reseña de Google (empieza con https://)." };
  }

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!permitir(`editar-cartel:${ip}:${slug}`, 5, 15 * 60_000)) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  try {
    await editarAutogestion(slug, String(pin ?? ""), { nombreNegocio: nombre, urlDestino: url });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
  revalidatePath(`/t/${slug}`);
  return { ok: true };
}
