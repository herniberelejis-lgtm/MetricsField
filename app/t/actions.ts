"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { activarAutogestion, editarAutogestion } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { pinValido } from "@/lib/pin";
import { urlSegura } from "@/lib/url";

// Autogestión de hardware (canal Mercado Libre): activar una pieza libre
// que su comprador escaneó por primera vez. Sin login — la defensa contra
// reclamar piezas ajenas es que el id lleva un sufijo aleatorio (no se
// puede enumerar, ver generarLotePiezas), que solo es reclamable inventario
// nunca usado (ver activarAutogestion) y el rate limit por IP.
export async function activarCartel(
  slug: string,
  nombreNegocio: string,
  urlDestino: string,
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  const nombre = String(nombreNegocio ?? "").trim().slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  // urlSegura (no un new URL() suelto): además de exigir http(s), guarda
  // la versión sin caracteres de control — misma validación que el portal.
  const url = urlSegura(String(urlDestino ?? ""));
  if (!url) {
    return { ok: false, error: "Pegá el link completo de tu reseña de Google (empieza con https://)." };
  }

  if (!pinValido(String(pin ?? ""))) {
    return { ok: false, error: "El PIN tiene que ser de 4 a 8 números." };
  }

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`activar-cartel:${ip}`, 5, 30 * 60_000))) {
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
// activación. Un PIN de pocos dígitos solo es seguro si además está
// protegido contra fuerza bruta: límite por IP+pieza Y un tope por pieza
// que no depende de la IP (rotar IPs no da más intentos contra el mismo
// cartel). Con 30 intentos por día, 10⁴ PIN llevan casi un año.
export async function editarCartel(
  slug: string,
  pin: string,
  nombreNegocio: string,
  urlDestino: string,
): Promise<{ ok: boolean; error?: string }> {
  const nombre = String(nombreNegocio ?? "").trim().slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  // urlSegura (no un new URL() suelto): además de exigir http(s), guarda
  // la versión sin caracteres de control — misma validación que el portal.
  const url = urlSegura(String(urlDestino ?? ""));
  if (!url) {
    return { ok: false, error: "Pegá el link completo de tu reseña de Google (empieza con https://)." };
  }

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  const pieza = String(slug ?? "").slice(0, 80);
  if (
    !(await permitir(`editar-cartel:${ip}:${pieza}`, 5, 15 * 60_000)) ||
    !(await permitir(`editar-cartel-pieza:${pieza}`, 10, 60 * 60_000)) ||
    !(await permitir(`editar-cartel-pieza-dia:${pieza}`, 30, 24 * 60 * 60_000))
  ) {
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
