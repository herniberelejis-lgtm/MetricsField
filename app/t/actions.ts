"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  activarAutogestion,
  editarAutogestion,
  getLink,
  guardarDatosActivacion,
  guardarLugarAutogestion,
} from "@/lib/db";
import { linkResenaDeLugar, placeIdValido, searchGooglePlace, type LugarParaResena } from "@/lib/places";
import { validarContacto } from "@/lib/activacion";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { pinValido } from "@/lib/pin";
import { urlSegura } from "@/lib/url";

// Autogestión de hardware (canal Mercado Libre): activar una pieza libre
// que su comprador escaneó por primera vez. Sin login — la defensa contra
// reclamar piezas ajenas es que el id lleva un sufijo aleatorio (no se
// puede enumerar, ver generarLotePiezas), que solo es reclamable inventario
// nunca usado (ver activarAutogestion) y el rate limit por IP.
/** Busca el negocio del comprador en Google para que lo elija de una lista
 * en vez de copiar y pegar el link de reseña. Solo para piezas que se
 * pueden activar o editar desde /t/<id> (no es un buscador abierto de
 * Places a costa nuestra), con límite por IP y por pieza. */
export async function buscarNegocio(
  slug: string,
  consulta: string,
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false; error: string }> {
  const q = String(consulta ?? "").trim().slice(0, 80);
  if (q.length < 3) return { ok: false, error: "Escribí al menos 3 letras del nombre." };

  const pieza = await getLink(String(slug ?? "").slice(0, 80));
  if (!pieza || pieza.comercioId || !pieza.activo) return { ok: false, error: "Esta pieza no se puede configurar desde acá." };

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (
    !(await permitir(`buscar-negocio:${ip}`, 20, 10 * 60_000)) ||
    !(await permitir(`buscar-negocio-pieza:${pieza.id}`, 60, 24 * 60 * 60_000))
  ) {
    return { ok: false, error: "Demasiadas búsquedas. Probá de nuevo en un rato." };
  }

  const r = await searchGooglePlace(q);
  if (!r.ok) return { ok: false, error: "No pudimos buscar en Google ahora. Pegá el link a mano (abajo te explicamos cómo)." };
  return { ok: true, lugares: r.resultados.slice(0, 5) };
}

/** El link de reseña sale del lugar elegido (lo da Google) o, si el
 * comprador lo pegó a mano, del texto pegado. */
async function resolverDestino(
  placeId: string | null | undefined,
  url: string | null | undefined,
): Promise<{ ok: true; url: string; placeId: string | null; nombreLugar: string } | { ok: false; error: string }> {
  if (placeId) {
    if (!placeIdValido(placeId)) return { ok: false, error: "Elegí tu negocio de nuevo." };
    const lugar = await linkResenaDeLugar(placeId);
    const link = lugar ? urlSegura(lugar.link) : null;
    if (!lugar || !link) return { ok: false, error: "No pudimos traer el link de Google. Probá de nuevo o pegalo a mano." };
    return { ok: true, url: link, placeId, nombreLugar: lugar.nombre };
  }
  // urlSegura (no un new URL() suelto): además de exigir http(s), guarda
  // la versión sin caracteres de control — misma validación que el portal.
  const link = urlSegura(String(url ?? ""));
  if (!link) return { ok: false, error: "Elegí tu negocio de la lista, o pegá el link completo de tu reseña de Google (empieza con https://)." };
  return { ok: true, url: link, placeId: null, nombreLugar: "" };
}

export async function activarCartel(
  slug: string,
  datos: {
    nombre?: string;
    placeId?: string | null;
    url?: string;
    pin: string;
    email?: string;
    whatsapp?: string;
    aceptaNovedades?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  if (!pinValido(String(datos.pin ?? ""))) {
    return { ok: false, error: "El PIN tiene que ser de 4 a 8 números." };
  }
  const contacto = validarContacto({ email: datos.email, whatsapp: datos.whatsapp, acepta: datos.aceptaNovedades });
  if (!contacto.ok) return { ok: false, error: contacto.error };

  // El límite va antes de pedirle nada a Google: cada consulta a Places cuesta.
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`activar-cartel:${ip}`, 8, 30 * 60_000))) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  const destino = await resolverDestino(datos.placeId, datos.url);
  if (!destino.ok) return { ok: false, error: destino.error };
  const nombre = (String(datos.nombre ?? "").trim() || destino.nombreLugar).slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  try {
    await activarAutogestion(slug, { nombreNegocio: nombre, urlDestino: destino.url, pin: String(datos.pin) });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo activar." };
  }
  // Lo extra (lugar y contacto) no frena la activación si falla: la pieza
  // ya anda, que es lo que importa para el comprador.
  await guardarDatosActivacion(slug, {
    googlePlaceId: destino.placeId,
    email: contacto.email,
    whatsapp: contacto.whatsapp,
    aceptaNovedades: contacto.acepta,
  });
  // Sin revalidatePath: refrescaría /t/<id> en el celular del dueño, que
  // ahora es una pieza activa y lo mandaría a la reseña de su propio
  // negocio (contándolo como un toque). La página es dinámica: no hay
  // caché que limpiar.
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
  datos: { nombre: string; placeId?: string | null; url?: string },
): Promise<{ ok: boolean; error?: string }> {
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

  const destino = await resolverDestino(datos.placeId, datos.url);
  if (!destino.ok) return { ok: false, error: destino.error };
  const nombre = (String(datos.nombre ?? "").trim() || destino.nombreLugar).slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  try {
    await editarAutogestion(slug, String(pin ?? ""), { nombreNegocio: nombre, urlDestino: destino.url });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
  if (destino.placeId) await guardarLugarAutogestion(slug, destino.placeId);
  revalidatePath(`/t/${slug}`);
  return { ok: true };
}
