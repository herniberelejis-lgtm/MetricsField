"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  activarAutogestion,
  editarAutogestion,
  getLink,
  guardarDatosActivacion,
  guardarLugarAutogestion,
  verificarPinAutogestion,
} from "@/lib/db";
import {
  autocompletarLugar,
  linkResenaDeLugar,
  placeIdValido,
  searchGooglePlace,
  SESGO_CORDOBA,
  tokenSesionValido,
  type LugarParaResena,
} from "@/lib/places";
import { validarContacto } from "@/lib/activacion";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { pinValido } from "@/lib/pin";
import { urlResenaGoogle } from "@/lib/url";
import { permitirConsultaPaga } from "@/lib/places-seguridad";

// Autogestión de hardware (canal Mercado Libre): activar una pieza libre
// que su comprador escaneó por primera vez. Sin login — la defensa contra
// reclamar piezas ajenas es que el id lleva un sufijo aleatorio (no se
// puede enumerar, ver generarLotePiezas), que solo es reclamable inventario
// nunca usado (ver activarAutogestion) y el rate limit por IP.
/** La pieza se puede configurar desde /t/<id> (libre o autogestionada):
 * los buscadores no son un Places abierto a costa nuestra. */
async function piezaConfigurable(slug: string, pin?: string): Promise<string | null> {
  if (typeof slug !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(slug)) return null;
  const ip = ipDelRequest(await headers());
  if (!(await permitirConsultaPaga(`pieza-ip:${ip}`, 60, 600_000)) ||
      !(await permitirConsultaPaga(`pieza:${slug}`, 60, 86400_000))) return null;
  const pieza = await getLink(slug);
  if (!pieza || pieza.comercioId || !pieza.activo) return null;
  if (pieza.autogestionado) {
    if (!pinValido(pin ?? "") || !(await verificarPinAutogestion(slug, pin!))) return null;
    return pieza.id;
  }
  // Solo inventario nunca usado. Las piezas devueltas no se pueden reclamar.
  return pieza.etiqueta === "" && pieza.urlDestino === null ? pieza.id : null;
}

/** Busca el negocio del comprador en Google para que lo elija de una lista
 * en vez de copiar y pegar el link de reseña. Solo para piezas que se
 * pueden activar o editar desde /t/<id>, con límite por IP y por pieza. */
export async function buscarNegocio(
  slug: string,
  consulta: string,
  pin?: string,
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false; error: string }> {
  const q = String(consulta ?? "").trim().slice(0, 80);
  if (q.length < 3) return { ok: false, error: "Escribí al menos 3 letras del nombre." };

  const pieza = await piezaConfigurable(slug, pin);
  if (!pieza) return { ok: false, error: "Búsqueda no disponible. Revisá la pieza, tu PIN o intentá más tarde. También podés pegar el enlace manualmente." };

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (
    !(await permitir(`buscar-negocio:${ip}`, 20, 10 * 60_000)) ||
    !(await permitir(`buscar-negocio-pieza:${pieza}`, 60, 24 * 60 * 60_000))
  ) {
    return { ok: false, error: "Demasiadas búsquedas. Probá de nuevo en un rato." };
  }

  // Con sesgo a Córdoba: el servidor corre fuera del país y, sin él, Google
  // prioriza negocios de cualquier lado con un nombre parecido.
  const r = await searchGooglePlace(q, SESGO_CORDOBA);
  if (!r.ok) {
    console.error("Activación: la búsqueda en Google falló", r);
    return { ok: false, error: "No pudimos buscar en Google ahora. Pegá el link a mano (abajo te explicamos cómo)." };
  }
  return { ok: true, lugares: r.resultados.slice(0, 8) };
}

/** Sugerencias mientras el comprador escribe (como Google Maps). Es más
 * barata que la búsqueda completa pero se llama por cada pausa al tipear,
 * por eso tiene su propio límite, más alto. Si falla, devuelve vacío y el
 * botón Buscar sigue andando. */
export async function sugerirNegocio(
  slug: string,
  texto: string,
  sesionToken: string,
  pin?: string,
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false; error: string }> {
  const q = String(texto ?? "").trim().slice(0, 80);
  if (q.length < 3) return { ok: true, lugares: [] };

  const pieza = await piezaConfigurable(slug, pin);
  if (!pieza) return { ok: false, error: "Búsqueda no disponible. Revisá tu PIN o pegá el enlace manualmente." };

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (
    !(await permitir(`sugerir-negocio:${ip}`, 150, 10 * 60_000)) ||
    !(await permitir(`sugerir-negocio-pieza:${pieza}`, 400, 24 * 60 * 60_000))
  ) {
    return { ok: false, error: "Demasiadas búsquedas. Probá de nuevo en un rato." };
  }

  const token = String(sesionToken ?? "");
  const r = await autocompletarLugar(q, { sesionToken: tokenSesionValido(token) ? token : undefined });
  return r.ok ? { ok: true, lugares: r.lugares.slice(0, 6) } : { ok: true, lugares: [] };
}

/** El link de reseña sale del lugar elegido (lo da Google) o, si el
 * comprador lo pegó a mano, del texto pegado. */
async function resolverDestino(
  placeId: string | null | undefined,
  url: string | null | undefined,
  sesionToken?: string,
): Promise<{ ok: true; url: string; placeId: string | null; nombreLugar: string } | { ok: false; error: string }> {
  if (placeId) {
    if (!placeIdValido(placeId)) return { ok: false, error: "Elegí tu negocio de nuevo." };
    const lugar = await linkResenaDeLugar(placeId, sesionToken);
    const link = lugar ? urlResenaGoogle(lugar.link) : null;
    if (!lugar || !link) return { ok: false, error: "No pudimos traer el link de Google. Probá de nuevo o pegalo a mano." };
    return { ok: true, url: link, placeId, nombreLugar: lugar.nombre };
  }
  // Solo links de Google (ver urlResenaGoogle): quien activa es anónimo y
  // otro destino convertiría /t/<id> en un redireccionador con nuestro
  // dominio adelante.
  const link = urlResenaGoogle(String(url ?? ""));
  if (!link) {
    return {
      ok: false,
      error: "Ese link no es de Google. Elegí tu negocio de la lista, o pegá el link de reseña que copiaste de tu perfil (empieza con https://g.page/r/).",
    };
  }
  return { ok: true, url: link, placeId: null, nombreLugar: "" };
}

// Mensajes que las funciones de la base tiran a propósito para el
// comprador. Cualquier otro error (conexión, columna, etc.) puede traer
// detalles internos: se registra y se muestra uno genérico.
const ERRORES_VISIBLES = new Set([
  "Esta pieza ya fue activada, o no está disponible para autogestión.",
  "Pieza no encontrada o todavía no fue activada.",
  "PIN incorrecto.",
]);

function errorParaMostrar(e: unknown, generico: string): string {
  const mensaje = e instanceof Error ? e.message : "";
  if (ERRORES_VISIBLES.has(mensaje)) return mensaje;
  console.error("Autogestión de pieza:", mensaje || e);
  return generico;
}

/** El nombre del negocio va a la base, al panel y al asunto de los mails:
 * sin caracteres de control (saltos de línea incluidos) y acotado. */
function nombreLimpio(nombre: string | undefined, delLugar: string): string {
  return (String(nombre ?? "").replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim() || delLugar).slice(0, 80);
}

export async function activarCartel(
  slug: string,
  datos: {
    nombre?: string;
    placeId?: string | null;
    url?: string;
    sesionToken?: string;
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

  // Incluso una activación repetida debe rechazarse ANTES de facturar Google.
  // El modo manual sigue disponible cuando las consultas pagas están apagadas.
  const piezaActivar = await getLink(String(slug ?? "").slice(0, 80));
  if (!piezaActivar || piezaActivar.comercioId || piezaActivar.autogestionado || !piezaActivar.activo || piezaActivar.etiqueta !== "" || piezaActivar.urlDestino !== null) {
    return { ok: false, error: "Esta pieza ya fue activada, o no está disponible para autogestión." };
  }
  if (datos.placeId && !(await piezaConfigurable(slug))) return { ok: false, error: "No podemos consultar Google ahora. Pegá el enlace manualmente o intentá más tarde." };
  const destino = await resolverDestino(datos.placeId, datos.url, datos.sesionToken);
  if (!destino.ok) return { ok: false, error: destino.error };
  const nombre = nombreLimpio(datos.nombre, destino.nombreLugar);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  try {
    await activarAutogestion(slug, { nombreNegocio: nombre, urlDestino: destino.url, pin: String(datos.pin) });
  } catch (e) {
    return { ok: false, error: errorParaMostrar(e, "No se pudo activar. Probá de nuevo en un rato.") };
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
  datos: { nombre: string; placeId?: string | null; url?: string; sesionToken?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!pinValido(pin)) return { ok: false, error: "PIN incorrecto." };
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

  // Verificar titularidad antes de cualquier llamada facturable, no al guardar.
  if (!(await verificarPinAutogestion(pieza, pin))) return { ok: false, error: "PIN incorrecto." };
  if (datos.placeId && !(await piezaConfigurable(slug, pin))) return { ok: false, error: "No podemos consultar Google ahora. Pegá el enlace manualmente o intentá más tarde." };
  const destino = await resolverDestino(datos.placeId, datos.url, datos.sesionToken);
  if (!destino.ok) return { ok: false, error: destino.error };
  const nombre = nombreLimpio(datos.nombre, destino.nombreLugar);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  try {
    await editarAutogestion(slug, String(pin ?? ""), { nombreNegocio: nombre, urlDestino: destino.url });
  } catch (e) {
    return { ok: false, error: errorParaMostrar(e, "No se pudo guardar. Probá de nuevo en un rato.") };
  }
  if (destino.placeId) await guardarLugarAutogestion(slug, destino.placeId);
  revalidatePath(`/t/${slug}`);
  return { ok: true };
}
