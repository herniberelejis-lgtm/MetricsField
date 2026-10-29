"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  activarAutogestion,
  borrarContactoPieza,
  editarAutogestion,
  editarAutogestionAutorizada,
  getLink,
  guardarDatosActivacion,
  guardarLugarAutogestion,
  rotarPinAutogestion,
  salPinAutogestion,
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
import {
  empezarModoSumar,
  guardarEnLlavero,
  modoSumarActivo,
  piezaAutorizada,
  quitarDelLlavero,
  terminarModoSumar,
  ticketParaSumar,
} from "@/lib/llavero";
import crypto from "node:crypto";

// Autogestión de hardware (canal Mercado Libre): activar una pieza libre
// que su comprador escaneó por primera vez. Sin login — la defensa contra
// reclamar piezas ajenas es que el id lleva un sufijo aleatorio (no se
// puede enumerar, ver generarLotePiezas), que solo es reclamable inventario
// nunca usado (ver activarAutogestion) y el rate limit por IP.
/** La pieza se puede configurar desde /t/<id> (libre o autogestionada):
 * los buscadores no son un Places abierto a costa nuestra. */
async function piezaConfigurable(slug: string): Promise<string | null> {
  const pieza = await getLink(String(slug ?? "").slice(0, 80));
  return pieza && !pieza.comercioId && pieza.activo ? pieza.id : null;
}

/** ¿Este navegador maneja la pieza (llavero válido con el PIN actual)? */
async function autorizadaAhora(slug: string): Promise<string | null> {
  const sal = await salPinAutogestion(slug);
  return sal && (await piezaAutorizada(slug, sal)) ? sal : null;
}

/** Los mismos tres límites que el cambio con PIN: cualquier camino que
 * reciba un PIN comparte el cupo, así no se suman intentos de adivinarlo. */
async function cupoPin(slug: string): Promise<boolean> {
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  return (
    (await permitir(`editar-cartel:${ip}:${slug}`, 5, 15 * 60_000)) &&
    (await permitir(`editar-cartel-pieza:${slug}`, 10, 60 * 60_000)) &&
    (await permitir(`editar-cartel-pieza-dia:${slug}`, 30, 24 * 60 * 60_000))
  );
}

/** Busca el negocio del comprador en Google para que lo elija de una lista
 * en vez de copiar y pegar el link de reseña. Solo para piezas que se
 * pueden activar o editar desde /t/<id>, con límite por IP y por pieza. */
export async function buscarNegocio(
  slug: string,
  consulta: string,
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false; error: string }> {
  const q = String(consulta ?? "").trim().slice(0, 80);
  if (q.length < 3) return { ok: false, error: "Escribí al menos 3 letras del nombre." };

  const pieza = await piezaConfigurable(slug);
  if (!pieza) return { ok: false, error: "Esta pieza no se puede configurar desde acá." };

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  // Quien ya maneja la pieza (llavero) la cambia muchas veces para mostrarla
  // en cada local: límite por pieza más alto, pero finito (cada búsqueda la
  // paga Google).
  const tope = (await autorizadaAhora(pieza)) ? 300 : 60;
  if (
    !(await permitir(`buscar-negocio:${ip}`, 20, 10 * 60_000)) ||
    !(await permitir(`buscar-negocio-pieza:${pieza}`, tope, 24 * 60 * 60_000))
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
): Promise<{ ok: true; lugares: LugarParaResena[] } | { ok: false; error: string }> {
  const q = String(texto ?? "").trim().slice(0, 80);
  if (q.length < 3) return { ok: true, lugares: [] };

  const pieza = await piezaConfigurable(slug);
  if (!pieza) return { ok: false, error: "Esta pieza no se puede configurar desde acá." };

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  const tope = (await autorizadaAhora(pieza)) ? 1500 : 400;
  if (
    !(await permitir(`sugerir-negocio:${ip}`, 150, 10 * 60_000)) ||
    !(await permitir(`sugerir-negocio-pieza:${pieza}`, tope, 24 * 60 * 60_000))
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
): Promise<{ ok: boolean; error?: string; ticket?: string }> {
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
  // Quien la activó la puede cambiar desde este celular sin PIN (Mis piezas).
  // No se pone la cookie acá: redibujaría la página y taparía el "¡Listo!"
  // con el PIN. El navegador canjea este ticket en /t/llavero.
  const ticket = ticketParaSumar(slug, await salPinAutogestion(slug));
  // Sin revalidatePath: refrescaría /t/<id> en el celular del dueño, que
  // ahora es una pieza activa y lo mandaría a la reseña de su propio
  // negocio (contándolo como un toque). La página es dinámica: no hay
  // caché que limpiar.
  return { ok: true, ticket: ticket ?? undefined };
}

// Cambiar una pieza autogestionada. Dos caminos:
// - Desde un navegador que ya la maneja (llavero, ver lib/llavero.ts): sin
//   PIN. El límite es alto porque no hay nada que adivinar: el revendedor la
//   cambia en cada local donde la muestra.
// - Con el PIN: un PIN de pocos dígitos solo es seguro si además está
//   protegido contra fuerza bruta: límite por IP+pieza Y un tope por pieza
//   que no depende de la IP (rotar IPs no da más intentos contra el mismo
//   cartel). Con 30 intentos por día, 10⁴ PIN llevan casi un año.
export async function editarCartel(
  slug: string,
  pin: string,
  datos: { nombre: string; placeId?: string | null; url?: string; sesionToken?: string; pinNuevo?: string },
): Promise<{ ok: boolean; error?: string; nombre?: string }> {
  const pinNuevo = String(datos.pinNuevo ?? "");
  if (pinNuevo && !pinValido(pinNuevo)) return { ok: false, error: "El PIN nuevo tiene que ser de 4 a 8 números." };
  const pieza = String(slug ?? "").slice(0, 80);
  const sal = await autorizadaAhora(pieza);

  limpiarVencidos();
  if (sal) {
    if (!(await permitir(`editar-llavero-pieza:${pieza}`, 200, 24 * 60 * 60_000))) {
      return { ok: false, error: "Demasiados cambios por hoy en esta pieza. Probá mañana." };
    }
  } else if (!(await cupoPin(pieza))) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  const destino = await resolverDestino(datos.placeId, datos.url, datos.sesionToken);
  if (!destino.ok) return { ok: false, error: destino.error };
  const nombre = nombreLimpio(datos.nombre, destino.nombreLugar);
  if (!nombre) return { ok: false, error: "Contanos el nombre de tu negocio." };

  try {
    if (sal) {
      await editarAutogestionAutorizada(pieza, sal, {
        nombreNegocio: nombre,
        urlDestino: destino.url,
        pinNuevo: pinNuevo || undefined,
      });
    } else {
      await editarAutogestion(pieza, String(pin ?? ""), {
        nombreNegocio: nombre,
        urlDestino: destino.url,
        pinNuevo: pinNuevo || undefined,
      });
    }
  } catch (e) {
    return { ok: false, error: errorParaMostrar(e, "No se pudo guardar. Probá de nuevo en un rato.") };
  }
  if (destino.placeId) await guardarLugarAutogestion(pieza, destino.placeId);
  // Con el PIN puesto (o recién cambiado) este navegador queda autorizado;
  // si cambió el PIN, con la sal nueva — si no, se perdería a sí mismo.
  await guardarEnLlavero(pieza, await salPinAutogestion(pieza));
  revalidatePath(`/t/${pieza}`);
  return { ok: true, nombre };
}

/** Sumar una pieza a este navegador con su PIN, sin cambiar nada más: el
 * celular nuevo, el navegador equivocado o una pieza activada antes del
 * llavero. Comparte el cupo de intentos con el cambio con PIN. */
export async function sumarPieza(slug: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  const pieza = String(slug ?? "").slice(0, 80);
  if (!pinValido(String(pin ?? ""))) return { ok: false, error: "El PIN tiene que ser de 4 a 8 números." };
  if (!(await cupoPin(pieza))) return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  const sal = await verificarPinAutogestion(pieza, String(pin));
  if (!sal) return { ok: false, error: "PIN incorrecto." };
  await guardarEnLlavero(pieza, sal);
  if (await modoSumarActivo()) await empezarModoSumar();
  return { ok: true };
}

/** Entregar la pieza a otro negocio: PIN nuevo (lo elige quien entrega o
 * sale uno al azar), se borra el contacto del aviso semanal del dueño
 * anterior y sale de este navegador. Como cambia el PIN, ningún otro
 * celular que la manejaba la sigue controlando. Solo desde un navegador que
 * ya la maneja. */
export async function entregarPieza(
  slug: string,
  pinElegido?: string,
): Promise<{ ok: true; pin: string; nombre: string } | { ok: false; error: string }> {
  const pieza = String(slug ?? "").slice(0, 80);
  const elegido = String(pinElegido ?? "");
  if (elegido && !pinValido(elegido)) return { ok: false, error: "El PIN tiene que ser de 4 a 8 números." };
  const sal = await autorizadaAhora(pieza);
  if (!sal) return { ok: false, error: "Este celular ya no maneja esta pieza. Sumala de nuevo con su PIN." };
  limpiarVencidos();
  if (!(await permitir(`entregar-pieza:${pieza}`, 20, 24 * 60 * 60_000))) {
    return { ok: false, error: "Demasiados intentos por hoy. Probá mañana." };
  }
  const pin = elegido || String(crypto.randomInt(1000, 10000));
  if (!(await rotarPinAutogestion(pieza, sal, pin))) {
    return { ok: false, error: "Esta pieza ya no se puede entregar desde este celular." };
  }
  await borrarContactoPieza(pieza);
  // Sacarla del llavero lo hace el navegador en /t/llavero: una cookie
  // puesta desde acá redibujaría la página y taparía el PIN nuevo.
  const link = await getLink(pieza);
  return { ok: true, pin, nombre: link?.nombreNegocio ?? "" };
}

/** Sacar una pieza de este navegador (no cambia nada en la pieza). */
export async function olvidarPieza(slug: string): Promise<{ ok: true }> {
  await quitarDelLlavero(String(slug ?? "").slice(0, 80));
  return { ok: true };
}

/** "Sumar una pieza": durante unos minutos, escanear una pieza con este
 * navegador la suma (con su PIN) en vez de mandar a Google. */
export async function empezarASumar(): Promise<{ ok: boolean }> {
  return { ok: await empezarModoSumar() };
}

export async function dejarDeSumar(): Promise<{ ok: true }> {
  await terminarModoSumar();
  return { ok: true };
}
