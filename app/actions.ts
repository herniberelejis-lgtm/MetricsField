"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import type {
  DestinoLink,
  EstadoCliente,
  EstadoFeedback,
  EstadoResena,
  FormatoNFC,
  MetricaMensual,
  Plan,
  PlataformaIA,
  Rubro,
  Zona,
} from "@/lib/types";

// Server actions: reciben los formularios, validan lo mínimo indispensable
// y delegan en lib/db. Después de cada mutación se revalida todo el árbol
// para que panel, analytics y reportes muestren los números nuevos.

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function num(fd: FormData, key: string): number {
  const v = Number(String(fd.get(key) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export async function accionCrearCliente(fd: FormData): Promise<void> {
  const nombre = str(fd, "nombre");
  if (!nombre) throw new Error("El nombre del negocio es obligatorio.");
  const cliente = await db.crearCliente({
    nombre,
    rubro: str(fd, "rubro") as Rubro,
    zona: str(fd, "zona") as Zona,
    plan: str(fd, "plan") as Plan,
    estado: str(fd, "estado") as EstadoCliente,
    contacto: str(fd, "contacto"),
    fechaAlta: str(fd, "fechaAlta") || new Date().toISOString().slice(0, 10),
    googleReviewUrl: str(fd, "googleReviewUrl"),
    busquedaClave: str(fd, "busquedaClave"),
    fee: num(fd, "fee"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${cliente.id}`);
}

export async function accionActualizarCliente(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  await db.actualizarCliente(id, {
    nombre: str(fd, "nombre"),
    rubro: str(fd, "rubro") as Rubro,
    zona: str(fd, "zona") as Zona,
    plan: str(fd, "plan") as Plan,
    estado: str(fd, "estado") as EstadoCliente,
    contacto: str(fd, "contacto"),
    googleReviewUrl: str(fd, "googleReviewUrl"),
    busquedaClave: str(fd, "busquedaClave"),
    fee: num(fd, "fee"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionGuardarMetrica(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const esPremium = str(fd, "esPremium") === "1";
  const metrica: MetricaMensual = {
    mes: str(fd, "mes"), // input type="month" → "2026-07"
    resenasNuevas: num(fd, "resenasNuevas"),
    resenasTotal: num(fd, "resenasTotal"),
    ratingPromedio: num(fd, "ratingPromedio"),
    posicionMaps: num(fd, "posicionMaps"),
    visitasPerfil: num(fd, "visitasPerfil"),
    llamadas: num(fd, "llamadas"),
    clicsComoLlegar: num(fd, "clicsComoLlegar"),
  };
  if (!metrica.mes) throw new Error("Indicá el mes de la métrica.");
  if (esPremium) {
    metrica.citasChatGPT = num(fd, "citasChatGPT");
    metrica.citasCopilot = num(fd, "citasCopilot");
    metrica.citasPerplexity = num(fd, "citasPerplexity");
  }
  await db.guardarMetrica(id, metrica);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionEliminarMetrica(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  await db.eliminarMetrica(id, str(fd, "mes"));
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}/metricas`);
}

export async function accionRegistrarVentaNFC(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  await db.registrarVentaNFC(id, {
    formato: str(fd, "formato") as FormatoNFC,
    cantidad: Math.max(1, Math.round(num(fd, "cantidad"))),
    precioUnitario: num(fd, "precioUnitario"),
    fecha: str(fd, "fecha") || new Date().toISOString().slice(0, 10),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionRegenerarCodigo(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  await db.regenerarCodigo(id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

// ---------- Links NFC ----------

export async function accionCrearLink(fd: FormData): Promise<void> {
  const comercioId = str(fd, "comercioId");
  const destino = str(fd, "destino") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  if (destino !== "resena" && !urlDestino) {
    throw new Error("Este destino necesita una URL.");
  }
  await db.crearLink(comercioId, {
    etiqueta: str(fd, "etiqueta") || "Nuevo link",
    destino,
    urlDestino: destino === "resena" ? null : urlDestino,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

export async function accionActualizarLink(fd: FormData): Promise<void> {
  const linkId = str(fd, "linkId");
  const comercioId = str(fd, "comercioId");
  const destino = str(fd, "destino") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  await db.actualizarLink(linkId, {
    etiqueta: str(fd, "etiqueta"),
    destino,
    urlDestino: destino === "resena" ? null : urlDestino,
    activo: fd.get("activo") === "1",
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

export async function accionEliminarLink(fd: FormData): Promise<void> {
  const linkId = str(fd, "linkId");
  const comercioId = str(fd, "comercioId");
  await db.eliminarLink(linkId);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

// ---------- CRM: feedback privado ----------

export async function accionActualizarFeedback(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.actualizarFeedback(id, {
    estado: str(fd, "estado") as EstadoFeedback,
    notasInternas: str(fd, "notasInternas"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/crm`);
}

// ---------- CRM: reseñas ----------

export async function accionCrearResena(fd: FormData): Promise<void> {
  const comercioId = str(fd, "comercioId");
  await db.crearResena(comercioId, {
    autor: str(fd, "autor") || "Anónimo",
    estrellas: Number(fd.get("estrellas")) as 1 | 2 | 3 | 4 | 5,
    texto: str(fd, "texto"),
    plataforma: (str(fd, "plataforma") || "google") as "google" | "otra",
    fecha: str(fd, "fecha") || new Date().toISOString().slice(0, 10),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/crm`);
}

export async function accionActualizarResena(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.actualizarResena(id, {
    estado: str(fd, "estado") as EstadoResena,
    respuestaSugerida: str(fd, "respuestaSugerida"),
    respuestaPublicada: fd.get("respuestaPublicada") === "1",
    responsable: str(fd, "responsable"),
    notas: str(fd, "notas"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/crm`);
}

// ---------- Checklist SEO ----------

export async function accionToggleChecklist(fd: FormData): Promise<void> {
  const comercioId = str(fd, "comercioId");
  const itemKey = str(fd, "itemKey");
  const hecho = fd.get("hecho") === "1";
  await db.toggleChecklistItem(comercioId, itemKey, hecho);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/seo`);
}

// ---------- Audit GEO ----------

export async function accionRegistrarAudit(fd: FormData): Promise<void> {
  const comercioId = str(fd, "comercioId");
  await db.crearAudit(comercioId, {
    pregunta: str(fd, "pregunta"),
    plataforma: str(fd, "plataforma") as PlataformaIA,
    aparece: fd.get("aparece") === "1",
    competidoresMencionados: str(fd, "competidoresMencionados"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/geo`);
}

// ---------- Competencia ----------

export async function accionCrearCompetidor(fd: FormData): Promise<void> {
  const comercioId = str(fd, "comercioId");
  await db.crearCompetidor(comercioId, {
    nombre: str(fd, "nombre"),
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

export async function accionActualizarCompetidor(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.actualizarCompetidor(id, {
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

export async function accionEliminarCompetidor(fd: FormData): Promise<void> {
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.eliminarCompetidor(id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}
