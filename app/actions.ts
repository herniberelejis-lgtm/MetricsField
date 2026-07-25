"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { requireAdmin, emailAdminActual } from "@/lib/auth";
import { alertarResenaMala } from "@/lib/alertas";
import type {
  DestinoLink,
  EstadoCliente,
  EstadoResena,
  FormatoNFC,
  MetricaMensual,
  Plan,
  Rubro,
  TipoSoporte,
  Zona,
} from "@/lib/types";

// Server actions: reciben los formularios, validan lo mínimo indispensable
// y delegan en lib/db. Después de cada mutación se revalida todo el árbol
// para que el panel muestre los números nuevos.

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function num(fd: FormData, key: string): number {
  const v = Number(String(fd.get(key) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

/** Deja rastro en /admin/auditoria de quién hizo qué. Con login por Google
 * queda el email; con la contraseña compartida queda sin identificar. */
async function auditar(accion: string, detalle = ""): Promise<void> {
  const email = await emailAdminActual();
  await db.registrarAuditoria(email, accion, detalle);
}

export async function accionCrearCliente(fd: FormData): Promise<void> {
  await requireAdmin();
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
    tonoMarca: (str(fd, "tonoMarca") || "cercano") as "cercano" | "formal",
    googlePlaceId: str(fd, "googlePlaceId"),
  });
  await auditar("crear_cliente", `${cliente.nombre} (${cliente.id})`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${cliente.id}`);
}

export async function accionCrearSucursal(fd: FormData): Promise<void> {
  await requireAdmin();
  const cuentaId = str(fd, "cuentaId");
  const nombre = str(fd, "nombre");
  if (!nombre) throw new Error("El nombre del local es obligatorio.");
  const sucursal = await db.crearSucursal(cuentaId, {
    nombre,
    rubro: str(fd, "rubro") as Rubro,
    zona: str(fd, "zona") as Zona,
    googlePlaceId: str(fd, "googlePlaceId"),
    googleReviewUrl: str(fd, "googleReviewUrl"),
    busquedaClave: str(fd, "busquedaClave"),
  });
  await auditar("crear_sucursal", `${sucursal.nombre} (${sucursal.id}) de ${cuentaId}`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${cuentaId}`);
}

export async function accionActualizarCliente(fd: FormData): Promise<void> {
  await requireAdmin();
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
    tonoMarca: (str(fd, "tonoMarca") || "cercano") as "cercano" | "formal",
    googlePlaceId: str(fd, "googlePlaceId"),
    emailNotificaciones: str(fd, "emailNotificaciones"),
  });
  await auditar("editar_cliente", id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionEliminarCliente(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const nombreConfirmado = str(fd, "confirmarNombre");
  const cliente = await db.getCliente(id);
  if (!cliente) throw new Error("Cliente no encontrado.");
  if (nombreConfirmado.trim() !== cliente.nombre.trim()) {
    throw new Error("El nombre no coincide — no se borró nada.");
  }
  await db.eliminarCliente(id);
  await auditar("eliminar_cliente", `${cliente.nombre} (${id})`);
  revalidatePath("/", "layout");
  redirect("/admin/clientes");
}

export async function accionDesconectarGoogleComercio(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await db.desconectarGoogleComercio(id);
  await auditar("desconectar_google_cliente", id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionSincronizarGoogle(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const ok = await db.sincronizarGoogle(id);
  if (!ok) {
    throw new Error(
      "No se pudo sincronizar — revisá que el comercio tenga Google Place ID cargado y que GOOGLE_PLACES_API_KEY esté configurada en Vercel.",
    );
  }
  // Rendimiento (visitas/llamadas): best-effort — depende de que la cuenta
  // de Google esté conectada y administre esta ficha. Si falta algo, el
  // rating/reseñas ya quedaron actualizados igual.
  await db.sincronizarRendimiento(id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionGuardarMetrica(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const esPremium = str(fd, "esPremium") === "1";
  const metrica: MetricaMensual = {
    mes: str(fd, "mes"), // input type="month" → "2026-07"
    resenasNuevas: num(fd, "resenasNuevas"),
    resenasTotal: num(fd, "resenasTotal"),
    ratingPromedio: num(fd, "ratingPromedio"),
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
  await requireAdmin();
  const id = str(fd, "id");
  await db.eliminarMetrica(id, str(fd, "mes"));
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}/metricas`);
}

export async function accionRegistrarVentaNFC(fd: FormData): Promise<void> {
  await requireAdmin();
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
  await requireAdmin();
  const id = str(fd, "id");
  await db.regenerarCodigo(id);
  await auditar("regenerar_codigo_portal", id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

// ---------- Links NFC ----------

export async function accionCrearLink(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const destino = str(fd, "destino") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  if (destino !== "resena" && !urlDestino) {
    throw new Error("Este destino necesita una URL.");
  }
  await db.crearLink(comercioId, {
    etiqueta: str(fd, "etiqueta") || "Nuevo link",
    tipo: (str(fd, "tipo") || "nfc") as TipoSoporte,
    destino,
    urlDestino: destino === "resena" ? null : urlDestino,
    nombreEmpleado: str(fd, "nombreEmpleado"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

export async function accionActualizarLink(fd: FormData): Promise<void> {
  await requireAdmin();
  const linkId = str(fd, "linkId");
  const comercioId = str(fd, "comercioId");
  const destino = str(fd, "destino") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  await db.actualizarLink(linkId, {
    etiqueta: str(fd, "etiqueta"),
    tipo: (str(fd, "tipo") || "nfc") as TipoSoporte,
    destino,
    urlDestino: destino === "resena" ? null : urlDestino,
    activo: fd.get("activo") === "1",
    nombreEmpleado: str(fd, "nombreEmpleado"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

export async function accionEliminarLink(fd: FormData): Promise<void> {
  await requireAdmin();
  const linkId = str(fd, "linkId");
  const comercioId = str(fd, "comercioId");
  await db.eliminarLink(linkId);
  await auditar("eliminar_link", `${linkId} (${comercioId})`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/links`);
}

// ---------- Inventario de hardware (piezas en lote: QR + NFC) ----------

export async function accionGenerarLotePiezas(fd: FormData): Promise<void> {
  await requireAdmin();
  const cantidad = Math.max(1, Math.min(500, Math.round(num(fd, "cantidad"))));
  const tipo = (str(fd, "tipo") || "ambos") as TipoSoporte;
  const lote = str(fd, "lote");
  const piezas = await db.generarLotePiezas(cantidad, tipo, lote);
  await auditar("generar_lote_piezas", `${piezas.length} piezas · lote "${lote}" · ${tipo}`);
  revalidatePath("/admin/hardware");
  redirect("/admin/hardware");
}

export async function accionAsignarPieza(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const comercioId = str(fd, "comercioId");
  if (!comercioId) throw new Error("Elegí a qué cliente asignarla.");
  const destino = (str(fd, "destino") || "resena") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  if (destino !== "resena" && !urlDestino) {
    throw new Error("Este destino necesita una URL.");
  }
  await db.asignarPiezaACliente(id, comercioId, {
    etiqueta: str(fd, "etiqueta") || "Sin etiquetar",
    tipo: str(fd, "tipo") ? (str(fd, "tipo") as TipoSoporte) : undefined,
    destino,
    urlDestino: destino === "resena" ? null : urlDestino,
  });
  await auditar("asignar_pieza_hardware", `${id} → ${comercioId}`);
  revalidatePath("/", "layout");
  redirect("/admin/hardware");
}

// ---------- CRM: reseñas ----------

export async function accionCrearResena(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const fecha = str(fd, "fecha") || new Date().toISOString().slice(0, 10);
  const hora = str(fd, "hora"); // "HH:MM", opcional — vacío = no se sabe la hora exacta
  const estrellas = Number(fd.get("estrellas")) as 1 | 2 | 3 | 4 | 5;
  const autor = str(fd, "autor") || "Anónimo";
  const texto = str(fd, "texto");
  const resena = await db.crearResena(comercioId, {
    autor,
    estrellas,
    texto,
    plataforma: (str(fd, "plataforma") || "google") as "google" | "otra",
    fecha,
    // Offset explícito de Argentina: sin él, Postgres interpreta la hora
    // como UTC y una reseña anotada a las 15:30 se mostraba a las 12:30.
    creadoEn: hora ? `${fecha}T${hora}:00-03:00` : undefined,
  });
  if (estrellas <= 3) {
    const cliente = await db.getCliente(comercioId);
    if (cliente) await alertarResenaMala(cliente, { autor: resena.autor, estrellas: resena.estrellas, texto: resena.texto });
  }
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/crm`);
}

export async function accionActualizarResena(fd: FormData): Promise<void> {
  await requireAdmin();
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

// ---------- Competencia ----------

export async function accionCrearCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const competidor = await db.crearCompetidor(comercioId, {
    nombre: str(fd, "nombre"),
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
    googlePlaceId: str(fd, "googlePlaceId") || null,
  });
  // Si vino con place_id, traemos el rating/reseñas reales de una — así no
  // hay que esperar al cron de mañana para ver el primer dato automático.
  if (competidor.googlePlaceId) await db.sincronizarCompetidor(competidor.id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

export async function accionActualizarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.actualizarCompetidor(id, {
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
    googlePlaceId: str(fd, "googlePlaceId") || null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

export async function accionSincronizarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  const ok = await db.sincronizarCompetidor(id);
  if (!ok) {
    throw new Error(
      "No se pudo sincronizar — revisá que el competidor tenga Google Place ID cargado y que GOOGLE_PLACES_API_KEY esté configurada en Vercel.",
    );
  }
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

export async function accionEliminarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.eliminarCompetidor(id);
  await auditar("eliminar_competidor", `${id} (${comercioId})`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia`);
}

// ---------- Administradores (login por Google del equipo) ----------

export async function accionAgregarAdmin(fd: FormData): Promise<void> {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const nombre = str(fd, "nombre");
  if (!email.includes("@")) throw new Error("Email inválido.");
  await db.agregarAdmin(email, nombre);
  await auditar("agregar_admin", email);
  revalidatePath("/admin/administradores");
  redirect("/admin/administradores");
}

export async function accionEliminarAdmin(fd: FormData): Promise<void> {
  await requireAdmin();
  const email = str(fd, "email");
  await db.eliminarAdmin(email);
  await auditar("eliminar_admin", email);
  revalidatePath("/admin/administradores");
  redirect("/admin/administradores");
}

