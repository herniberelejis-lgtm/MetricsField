"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";
import { hashearIp } from "@/lib/loyalty-antifraude";
import {
  COOKIE_CLIENTE_FINAL,
  crearCookieClienteFinal,
  leerCookieClienteFinal,
  normalizarTelefono,
} from "@/lib/loyalty-firma";
import {
  VERSION_CONSENTIMIENTO,
  comercioConLoyalty,
  emitirTarjetaGoogle,
  origenLoyalty,
  reflejarSaldoEnWallet,
  walletGoogleConfigurado,
} from "@/lib/loyalty";
import {
  acreditarMision,
  acreditarReferido,
  calcularSaldo,
  crearCanje,
  crearClienteFinal,
  eliminarMembresiaYDatos,
  getBeneficio,
  getClienteFinal,
  getMembresia,
  getMembresiaPorId,
  getMisiones,
  obtenerOCrearMembresia,
  registrarConsentimiento,
  registrarEventoLoyalty,
  type Membresia,
} from "@/lib/db/loyalty";
import { desactivarObjeto } from "@/lib/wallet/google";

// Escrituras del cliente final (4to sistema de acceso). Cada action repite
// los chequeos de la página — una server action se puede invocar directo:
// rate limit por IP, Loyalty activo para ESE comercio, y la sesión firmada
// del cliente (cookie) para todo lo que toca una membresía. El comercioId
// del formulario solo sirve para buscar; la membresía siempre se resuelve
// desde la sesión, nunca desde un id que manda el navegador.

export type EstadoFormulario = { error: string } | null;

/** Error pensado para mostrarle al cliente. Cualquier otro (base, Google,
 * bug) se loguea y el cliente ve un mensaje genérico: nunca detalles internos. */
class ErrorLoyalty extends Error {}

function mensajeDeError(e: unknown, generico: string): string {
  if (e instanceof ErrorLoyalty) return e.message;
  console.error("Loyalty:", e instanceof Error ? e.message : e);
  return generico;
}

const COOKIE_OPCIONES = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 365 * 24 * 60 * 60,
  path: "/",
};

async function limitarIp(clave: string, maximo: number): Promise<string> {
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`loyalty-${clave}:${ip}`, maximo, 10 * 60_000))) {
    throw new ErrorLoyalty("Demasiados intentos. Probá de nuevo en unos minutos.");
  }
  return ip;
}

async function contexto(comercioId: string) {
  const ctx = await comercioConLoyalty(comercioId);
  if (!ctx) throw new ErrorLoyalty("Este club de beneficios no está disponible.");
  return ctx;
}

async function clienteDeLaSesion(): Promise<string | null> {
  return leerCookieClienteFinal((await cookies()).get(COOKIE_CLIENTE_FINAL)?.value);
}

/** La membresía de quien tiene la sesión, en este comercio. */
async function membresiaDeLaSesion(comercioId: string): Promise<Membresia> {
  const clienteFinalId = await clienteDeLaSesion();
  if (!clienteFinalId) throw new ErrorLoyalty("Tu sesión venció. Abrí tu tarjeta desde Google Wallet.");
  const membresia = await getMembresia(clienteFinalId, comercioId);
  if (!membresia) throw new ErrorLoyalty("Todavía no tenés tarjeta en este local.");
  return membresia;
}

function texto(fd: FormData, campo: string, max: number): string {
  // Sin caracteres de control (NUL rompe Postgres; el resto no tiene uso en un nombre).
  return String(fd.get(campo) ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

/** Alta completa: identidad + consentimiento + membresía con los puntos de
 * bienvenida + tarjeta de Google. Llega desde el formulario de la landing. */
async function darDeAlta(datos: {
  comercioId: string;
  clienteFinalId: string;
  nombre: string;
  marketing: boolean;
  esPersonaNueva: boolean;
  ref: string;
  ip: string;
}) {
  const { comercio, programa } = await contexto(datos.comercioId);
  await registrarConsentimiento({
    clienteFinalId: datos.clienteFinalId,
    comercioId: comercio.id,
    version: VERSION_CONSENTIMIENTO,
    datos: true,
    wallet: true,
    marketing: datos.marketing,
  });
  const membresia = await obtenerOCrearMembresia(datos.clienteFinalId, comercio.id);
  if (membresia.nueva) {
    await registrarEventoLoyalty({
      comercioId: comercio.id,
      clienteFinalId: datos.clienteFinalId,
      tipo: "registro",
      ipHash: hashearIp(datos.ip),
    });
  }

  // Referido: solo si quien se registra es una persona nueva de verdad
  // (teléfono que nunca existió) y quien lo invitó es socio de este mismo
  // comercio. Se acredita solo — no depende de la palabra de nadie.
  if (membresia.nueva && datos.esPersonaNueva && datos.ref) {
    const referidor = await getMembresiaPorId(datos.ref);
    const mision = (await getMisiones(comercio.id, true)).find((m) => m.tipo === "referido");
    if (referidor && mision && referidor.comercioId === comercio.id && referidor.id !== membresia.id) {
      const r = await acreditarReferido(referidor.id, membresia.id, mision);
      if (r.aplicado) {
        await registrarEventoLoyalty({
          comercioId: comercio.id,
          clienteFinalId: referidor.clienteFinalId,
          tipo: "mision_completada",
          detalle: `referido:${mision.id}`,
        });
        await reflejarSaldoEnWallet(referidor, r.saldo);
      }
    }
  }

  await emitirTarjetaGoogle({
    comercio,
    programa,
    membresia,
    nombreCliente: datos.nombre,
    saldo: await calcularSaldo(membresia.id),
    origen: await origenLoyalty(),
  });
}

export async function accionRegistrarse(_previo: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const comercioId = texto(fd, "comercioId", 120);
  try {
    const ip = await limitarIp("registro", 8);
    await contexto(comercioId);
    const nombre = texto(fd, "nombre", 80);
    const telefono = normalizarTelefono(texto(fd, "telefono", 40));
    const email = texto(fd, "email", 120).toLowerCase();
    if (nombre.length < 2) return { error: "Escribí tu nombre." };
    if (!telefono) return { error: "Revisá el teléfono: con característica, por ejemplo 351 555 1234." };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisá el email (o dejalo vacío)." };
    if (fd.get("acepta") !== "on") {
      return { error: "Para tener tu tarjeta tenés que aceptar el uso de tus datos." };
    }

    const persona = await crearClienteFinal({ telefono, nombre, email });
    if (persona.existente) {
      // Sin verificar el número no podemos dar la sesión de otra persona.
      return {
        error:
          "No pudimos crear una tarjeta con ese teléfono. Si ya tenés una, abrila desde tu Google Wallet (\"Ver mis puntos y beneficios\"); si no, pedile ayuda al local.",
      };
    }
    // La sesión va antes del alta: si algo falla en el medio, al reintentar
    // ya es "su" teléfono y entra por accionUnirse en vez de quedar
    // bloqueado con "ese teléfono ya tiene una tarjeta".
    (await cookies()).set(COOKIE_CLIENTE_FINAL, crearCookieClienteFinal(persona.id), COOKIE_OPCIONES);
    await darDeAlta({
      comercioId,
      clienteFinalId: persona.id,
      nombre,
      marketing: fd.get("marketing") === "on",
      esPersonaNueva: true,
      ref: texto(fd, "ref", 80),
      ip,
    });
  } catch (e) {
    return { error: mensajeDeError(e, "No pudimos crear tu tarjeta. Probá de nuevo.") };
  }
  redirect(`/l/${encodeURIComponent(comercioId)}?bienvenida=1`);
}

/** Alguien que ya es socio de otro comercio (tiene sesión) se suma a este:
 * no vuelve a cargar sus datos, solo acepta el consentimiento de este local. */
export async function accionUnirse(_previo: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const comercioId = texto(fd, "comercioId", 120);
  try {
    const ip = await limitarIp("registro", 8);
    const clienteFinalId = await clienteDeLaSesion();
    if (!clienteFinalId) return { error: "Tu sesión venció. Recargá la página." };
    const persona = await getClienteFinal(clienteFinalId);
    if (!persona) return { error: "Tu sesión venció. Recargá la página." };
    if (fd.get("acepta") !== "on") {
      return { error: "Para tener tu tarjeta tenés que aceptar el uso de tus datos." };
    }
    await darDeAlta({
      comercioId,
      clienteFinalId,
      nombre: persona.nombre,
      marketing: fd.get("marketing") === "on",
      esPersonaNueva: false,
      ref: "",
      ip,
    });
  } catch (e) {
    return { error: mensajeDeError(e, "No pudimos crear tu tarjeta. Probá de nuevo.") };
  }
  redirect(`/l/${encodeURIComponent(comercioId)}?bienvenida=1`);
}

/** Misión autodeclarada (reseña, redes): se le cree, una vez por misión.
 * La de reseña premia OPINAR, nunca la calificación — la página manda al
 * mismo link público de Google que usa todo el mundo. */
export async function accionReclamarMision(fd: FormData): Promise<{ ok: boolean; mensaje: string }> {
  const comercioId = texto(fd, "comercioId", 120);
  try {
    await limitarIp("accion", 60);
    const { comercio } = await contexto(comercioId);
    const membresia = await membresiaDeLaSesion(comercio.id);
    const mision = (await getMisiones(comercio.id, true)).find((m) => m.id === texto(fd, "misionId", 80));
    if (!mision || mision.tipo === "referido") return { ok: false, mensaje: "Esa misión no está disponible." };
    const r = await acreditarMision(membresia.id, mision);
    if (r.aplicado) {
      await registrarEventoLoyalty({
        comercioId: comercio.id,
        clienteFinalId: membresia.clienteFinalId,
        tipo: "mision_completada",
        detalle: `${mision.tipo}:${mision.id}`,
      });
      await reflejarSaldoEnWallet(membresia, r.saldo);
    }
    revalidatePath(`/l/${comercio.id}`);
    return { ok: true, mensaje: r.aplicado ? `¡Sumaste ${mision.puntos} puntos!` : "Esta misión ya la cumpliste." };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e, "No se pudo sumar la misión.") };
  }
}

export async function accionPedirCanje(_previo: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const comercioId = texto(fd, "comercioId", 120);
  try {
    await limitarIp("canje", 20);
    const { comercio } = await contexto(comercioId);
    const membresia = await membresiaDeLaSesion(comercio.id);
    const beneficio = await getBeneficio(comercio.id, texto(fd, "beneficioId", 80));
    if (!beneficio || !beneficio.activo) return { error: "Ese beneficio ya no está disponible." };
    const r = await crearCanje(membresia.id, comercio.id, beneficio);
    if (!r.ok) return { error: r.error };
    await registrarEventoLoyalty({
      comercioId: comercio.id,
      clienteFinalId: membresia.clienteFinalId,
      tipo: "canje_solicitado",
      detalle: beneficio.id,
    });
  } catch (e) {
    return { error: mensajeDeError(e, "No se pudo generar el código.") };
  }
  revalidatePath(`/l/${comercioId}`);
  return null;
}

/** Derecho de supresión: el cliente borra su tarjeta y sus datos de este
 * local con un botón, sin tener que pedírselo a nadie. Funciona aunque el
 * comercio haya apagado Loyalty o esté pausado: borrarse no depende de eso. */
export async function accionDarseDeBaja(fd: FormData): Promise<void> {
  const comercioId = texto(fd, "comercioId", 120);
  await limitarIp("accion", 60);
  const membresia = await membresiaDeLaSesion(comercioId);
  const comercio = { id: membresia.comercioId };
  if (walletGoogleConfigurado() && membresia.googleObjectId) {
    await desactivarObjeto(membresia.googleObjectId).catch((e) =>
      console.error("Loyalty: no se pudo desactivar la tarjeta en Google:", e instanceof Error ? e.message : e),
    );
  }
  await eliminarMembresiaYDatos(membresia.clienteFinalId, membresia.id);
  await registrarEventoLoyalty({ comercioId: comercio.id, tipo: "baja" });
  // Si todavía es socio de otro comercio, la sesión le sigue sirviendo allá.
  if (!(await getClienteFinal(membresia.clienteFinalId))) {
    (await cookies()).delete(COOKIE_CLIENTE_FINAL);
  }
  redirect(`/l/${encodeURIComponent(comercio.id)}?baja=1`);
}
