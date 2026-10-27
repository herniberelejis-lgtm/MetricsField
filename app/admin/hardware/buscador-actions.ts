"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin, emailAdminActual } from "@/lib/auth";
import { getCliente, getLink, asignarPiezaACliente, registrarAuditoria } from "@/lib/db";
import { linkResenaDeLugar, placeIdValido } from "@/lib/places";
import { permitirConsultaPaga } from "@/lib/places-seguridad";
import { ipDelRequest } from "@/lib/ratelimit";
import { urlResenaGoogle } from "@/lib/url";

export async function obtenerEnlaceAdmin(placeId: string): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (typeof placeId !== "string" || !placeIdValido(placeId)) return { ok: false, error: "Elegí un negocio válido." };
  const actor = (await emailAdminActual()) || ipDelRequest(await headers());
  if (!(await permitirConsultaPaga(`admin-detalle:${actor}`, 30, 3600_000))) return { ok: false, error: "Consultas pausadas o límite alcanzado. Intentá más tarde." };
  const lugar = await linkResenaDeLugar(placeId);
  const link = lugar && urlResenaGoogle(lugar.link);
  return link ? { ok: true, link } : { ok: false, error: "No pudimos obtener el enlace. Revisá la conexión y el cupo de Google." };
}

/** Guarda sin consultar nuevamente Google: el NFC/QR conserva su URL /t/id. */
export async function configurarPiezaAdmin(datos: { pieza: string; cliente: string; url: string }): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!datos || typeof datos.pieza !== "string" || datos.pieza.length > 80 || typeof datos.cliente !== "string" || datos.cliente.length > 100 || typeof datos.url !== "string" || datos.url.length > 2048) return { ok: false, error: "Datos inválidos." };
  const url = urlResenaGoogle(datos.url);
  if (!url) return { ok: false, error: "El destino debe ser un enlace de Google." };
  const [pieza, cliente] = await Promise.all([getLink(datos.pieza), getCliente(datos.cliente)]);
  if (!pieza || !pieza.activo || pieza.comercioId || pieza.autogestionado || !cliente) return { ok: false, error: "Elegí un cliente y una pieza libre disponible." };
  try {
    await asignarPiezaACliente(pieza.id, cliente.id, { etiqueta: `Reseñas · ${cliente.nombre}`.slice(0, 80), destino: "resena", urlDestino: url });
  } catch {
    return { ok: false, error: "No se pudo asignar. Actualizá la página: otra persona pudo haber usado esa pieza." };
  }
  await registrarAuditoria(await emailAdminActual(), "configurar_pieza_buscador", `${pieza.id} → ${cliente.id}`);
  revalidatePath("/admin/hardware");
  revalidatePath(`/t/${pieza.id}`);
  return { ok: true };
}
