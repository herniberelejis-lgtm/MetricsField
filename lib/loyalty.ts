import "server-only";
import { headers } from "next/headers";
import { origenCanonico } from "./google-oauth";
import { claveLoyalty, crearTokenTarjeta } from "./loyalty-firma";
import {
  getComercioLoyalty,
  getProgramaLoyalty,
  marcarEstadoGoogle,
  setGoogleClassId,
  type ComercioLoyalty,
  type Membresia,
} from "./db/loyalty";
import { actualizarPuntos, crearClase, crearOActualizarObjeto, urlLogoTarjeta } from "./wallet/google";
import type { ProgramaLoyalty } from "./types";

// Orquestación de Loyalty: une la base (fuente de verdad) con Google Wallet
// (una proyección). Regla de §11 del doc: si Google falla, NUNCA se pierde
// un punto — el movimiento ya quedó en la base; la tarjeta se marca con
// error y se reintenta la próxima vez que el cliente abre su página.

/** Versión del texto legal que acepta el cliente al registrarse. Si cambia
 * el texto de la sección Loyalty de /privacidad, subir esto. */
export const VERSION_CONSENTIMIENTO = "2026-10";

/** Loyalty prendido de verdad: el flag global y la clave para firmar las
 * credenciales del cliente final (sin clave, fallar cerrado). */
export function loyaltyHabilitado(): boolean {
  return process.env.LOYALTY_ENABLED === "true" && claveLoyalty() !== null;
}

export function walletGoogleConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY,
  );
}

/** Comercio con Loyalty activo y su programa, o null (la landing da 404). */
export async function comercioConLoyalty(
  comercioId: string,
): Promise<{ comercio: ComercioLoyalty; programa: ProgramaLoyalty } | null> {
  if (!loyaltyHabilitado()) return null;
  const comercio = await getComercioLoyalty(comercioId);
  if (!comercio || !comercio.tieneLoyalty || comercio.estado === "baja") return null;
  const programa = await getProgramaLoyalty(comercioId);
  if (!programa || !programa.activo) return null;
  return { comercio, programa };
}

/** Origen para los links absolutos que viajan dentro de la tarjeta: el
 * dominio canónico en producción, el host del request en previews y local. */
export async function origenLoyalty(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return origenCanonico(`${proto}://${host}`);
}

export function linkTarjeta(origen: string, comercioId: string, membresiaId: string): string {
  return `${origen}/l/${encodeURIComponent(comercioId)}/entrar?tarjeta=${encodeURIComponent(crearTokenTarjeta(membresiaId))}`;
}

/** Crea (o actualiza) la LoyaltyClass del comercio en Google y guarda su id.
 * Se llama al guardar el programa en el panel y, por las dudas, antes de
 * emitir la primera tarjeta. */
export async function sincronizarClaseGoogle(comercio: ComercioLoyalty): Promise<string> {
  const classId = await crearClase({
    id: comercio.id,
    nombre: comercio.nombre,
    logoUrl: urlLogoTarjeta(comercio.id, comercio.tieneLogo),
  });
  await setGoogleClassId(comercio.id, classId);
  return classId;
}

/** Emite (o re-emite) la tarjeta de Google de una membresía con su saldo
 * actual. Nunca tira: si Google falla, deja la membresía en 'error' y
 * devuelve null — el cliente igual tiene su tarjeta web con los puntos. */
export async function emitirTarjetaGoogle(datos: {
  comercio: ComercioLoyalty;
  programa: ProgramaLoyalty;
  membresia: Membresia;
  nombreCliente: string;
  saldo: number;
  origen: string;
}): Promise<{ classId: string; objectId: string } | null> {
  if (!walletGoogleConfigurado()) return null;
  try {
    const classId = datos.programa.googleClassId || (await sincronizarClaseGoogle(datos.comercio));
    const objectId = await crearOActualizarObjeto({
      classId,
      membresiaId: datos.membresia.id,
      nombreCliente: datos.nombreCliente,
      saldo: datos.saldo,
      linkTarjeta: linkTarjeta(datos.origen, datos.comercio.id, datos.membresia.id),
    });
    await marcarEstadoGoogle(datos.membresia.id, "emitido", objectId);
    return { classId, objectId };
  } catch (e) {
    console.error("Loyalty: no se pudo emitir la tarjeta de Google:", e instanceof Error ? e.message : e);
    await marcarEstadoGoogle(datos.membresia.id, "error").catch(() => {});
    return null;
  }
}

/** Refleja el saldo nuevo en la tarjeta que el cliente ya tiene en su
 * Wallet. Si falla, la marca para re-emitir (la base ya tiene los puntos). */
export async function reflejarSaldoEnWallet(membresia: Membresia, saldo: number): Promise<void> {
  if (!walletGoogleConfigurado() || membresia.estadoGoogle !== "emitido" || !membresia.googleObjectId) return;
  try {
    await actualizarPuntos(membresia.googleObjectId, saldo);
  } catch (e) {
    console.error("Loyalty: no se pudo actualizar el saldo en Google:", e instanceof Error ? e.message : e);
    await marcarEstadoGoogle(membresia.id, "error").catch(() => {});
  }
}
