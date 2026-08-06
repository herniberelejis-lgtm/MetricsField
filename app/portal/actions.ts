"use server";

import { revalidatePath } from "next/cache";
import {
  getClientePorCodigo,
  getCliente,
  getResenas,
  actualizarResena,
  actualizarAutomatizacionResenas,
  getTapsPorHora,
  desconectarGoogleComercio,
  getLink,
  actualizarLink,
  type TapsPorHora,
} from "@/lib/db";
import type { Cliente } from "@/lib/types";
import { urlSegura } from "@/lib/url";

// Server actions públicas del portal: no hay sesión de admin, el código de
// acceso privado ES la credencial — pero esa credencial vive en la CUENTA
// (fila raíz), y multi-sucursal permite operar sobre cualquiera de sus
// locales. Toda acción resuelve primero la cuenta por el código y después
// confirma que `comercioId` es la cuenta misma o una sucursal que cuelga de
// ella — nunca confiar en un comercioId suelto que manda el formulario.

async function comercioAutorizado(codigo: string, comercioId: string): Promise<Cliente> {
  const cuenta = await getClientePorCodigo(codigo);
  if (!cuenta) throw new Error("Portal inválido.");
  if (comercioId === cuenta.id) return cuenta;
  const sucursal = await getCliente(comercioId);
  if (!sucursal || sucursal.comercioPadreId !== cuenta.id) {
    throw new Error("Ese local no pertenece a este portal.");
  }
  return sucursal;
}

async function reseñaDelComercio(codigo: string, comercioId: string, resenaId: number) {
  const comercio = await comercioAutorizado(codigo, comercioId);
  const resenas = await getResenas(comercio.id);
  const resena = resenas.find((r) => r.id === resenaId);
  if (!resena) throw new Error("Esa reseña no pertenece a este local.");
  return { comercio, resena };
}

export async function accionAprobarResenaPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const id = Number(fd.get("id"));
  const respuesta = String(fd.get("respuesta") ?? "").trim().slice(0, 2000);
  await reseñaDelComercio(codigo, comercioId, id);
  if (!respuesta) throw new Error("La respuesta no puede quedar vacía.");

  await actualizarResena(id, {
    respuestaSugerida: respuesta,
    respuestaPublicada: true,
    estado: "respondida",
  });
  revalidatePath(`/portal/${codigo}`);
}

export async function accionDescartarResenaPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const id = Number(fd.get("id"));
  await reseñaDelComercio(codigo, comercioId, id);

  await actualizarResena(id, { estado: "escalada" });
  revalidatePath(`/portal/${codigo}`);
}

export async function accionActualizarAutomatizacionResenasPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const comercio = await comercioAutorizado(codigo, comercioId);

  const autoResponderPositivas = fd.get("autoResponderPositivas") === "on";
  const umbral = Number(fd.get("autoResponderUmbral"));
  const autoResponderUmbral = umbral === 5 ? 5 : 4;

  await actualizarAutomatizacionResenas(comercio.id, { autoResponderPositivas, autoResponderUmbral });
  revalidatePath(`/portal/${codigo}`);
}

/** El propio comercio revoca la conexión de Google desde su portal — sin
 * esto, la única forma de desconectar era que el equipo lo hiciera desde
 * /admin, lo cual no coincidía con lo que dice /privacidad ("o desde el
 * botón de desconexión de su propio portal"). */
export async function accionDesconectarGoogleComercioPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const comercio = await comercioAutorizado(codigo, comercioId);
  await desconectarGoogleComercio(comercio.id);
  revalidatePath(`/portal/${codigo}`);
}

/** Autogestión del enlace de un dispositivo desde el portal: el dueño
 * cambia a dónde manda su cartel/tarjeta sin depender del equipo interno.
 * Solo toca `urlDestino` (el QR/NFC impreso no cambia — ver arquitectura en
 * app/t/[slug]/page.tsx: "urlDestino" manda siempre si está cargada). No
 * usa throw+redirect para el error de URL inválida porque esta acción se
 * llama directo desde un componente cliente (no un <form action=>) y un
 * throw sin capturar tumbaría el panel entero — se devuelve un resultado
 * explícito en cambio. */
export async function accionActualizarUrlLinkPortal(
  fd: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const linkId = String(fd.get("linkId") ?? "");
  const nuevaUrl = String(fd.get("urlDestino") ?? "").trim();

  const comercio = await comercioAutorizado(codigo, comercioId);
  const link = await getLink(linkId);
  if (!link || link.comercioId !== comercio.id) {
    throw new Error("Ese dispositivo no pertenece a este portal.");
  }

  if (!nuevaUrl) {
    await actualizarLink(linkId, { urlDestino: null });
    revalidatePath(`/portal/${codigo}`);
    return { ok: true };
  }

  const limpia = urlSegura(nuevaUrl);
  if (!limpia) {
    return { ok: false, error: "Esa URL no parece válida — revisala e intentá de nuevo." };
  }

  await actualizarLink(linkId, { urlDestino: limpia });
  revalidatePath(`/portal/${codigo}`);
  return { ok: true };
}

/** Desglose hora a hora de un día — para expandir el gráfico de "Taps por
 * día". Se llama directo desde el cliente (no un <form>), así que valida el
 * formato de la fecha a mano en vez de confiar en el tipo del parámetro. */
export async function accionObtenerTapsPorHora(codigo: string, comercioId: string, fecha: string): Promise<TapsPorHora[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  const comercio = await comercioAutorizado(codigo, comercioId).catch(() => null);
  if (!comercio) return [];
  return getTapsPorHora(comercio.id, fecha);
}
