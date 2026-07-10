"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { requireAdmin, emailAdminActual } from "@/lib/auth";
import { alertarResenaMala } from "@/lib/alertas";
import type {
  DestinoLink,
  EstadoCliente,
  EstadoFeedback,
  EstadoProspecto,
  EstadoResena,
  FormatoNFC,
  MetricaMensual,
  Plan,
  PlataformaIA,
  Rubro,
  TipoSoporte,
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
    usarFiltro: fd.get("sinFiltro") !== "1",
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
    usarFiltro: fd.get("sinFiltro") !== "1",
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
    usarFiltro: fd.get("sinFiltro") !== "1",
  });
  await auditar("asignar_pieza_hardware", `${id} → ${comercioId}`);
  revalidatePath("/", "layout");
  redirect("/admin/hardware");
}

// ---------- CRM: feedback privado ----------

export async function accionActualizarFeedback(fd: FormData): Promise<void> {
  await requireAdmin();
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
    creadoEn: hora ? `${fecha}T${hora}:00` : undefined,
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

// ---------- Checklist SEO ----------

export async function accionToggleChecklist(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const itemKey = str(fd, "itemKey");
  const hecho = fd.get("hecho") === "1";
  await db.toggleChecklistItem(comercioId, itemKey, hecho);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/auditoria`);
}

// ---------- Audit GEO ----------

export async function accionRegistrarAudit(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  await db.crearAudit(comercioId, {
    pregunta: str(fd, "pregunta"),
    plataforma: str(fd, "plataforma") as PlataformaIA,
    aparece: fd.get("aparece") === "1",
    competidoresMencionados: str(fd, "competidoresMencionados"),
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/auditoria`);
}

// ---------- Competencia ----------

export async function accionCrearCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  await db.crearCompetidor(comercioId, {
    nombre: str(fd, "nombre"),
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/auditoria`);
}

export async function accionActualizarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.actualizarCompetidor(id, {
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
  });
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/auditoria`);
}

export async function accionEliminarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  await db.eliminarCompetidor(id);
  await auditar("eliminar_competidor", `${id} (${comercioId})`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/auditoria`);
}

// ---------- Prospectos ----------
// Locales a los que se les está vendiendo — todavía no son clientes. Cuando
// uno confirma, se marca "vendido" acá y se da de alta aparte en Clientes.

export async function accionCrearProspecto(): Promise<void> {
  await requireAdmin();
  await db.crearProspecto();
  revalidatePath("/admin/prospectos");
  redirect("/admin/prospectos");
}

export async function accionActualizarProspecto(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await db.actualizarProspecto(id, {
    local: str(fd, "local"),
    zona: str(fd, "zona"),
    contacto: str(fd, "contacto"),
    redes: str(fd, "redes"),
    web: str(fd, "web"),
    resenas: str(fd, "resenas"),
    producto: str(fd, "producto"),
    precio: str(fd, "precio"),
    estado: str(fd, "estado") as EstadoProspecto,
    segFecha: str(fd, "segFecha"),
    segTexto: str(fd, "segTexto"),
    notas: str(fd, "notas"),
  });
  revalidatePath("/admin/prospectos");
  redirect("/admin/prospectos");
}

export async function accionEliminarProspecto(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await db.eliminarProspecto(id);
  await auditar("eliminar_prospecto", id);
  revalidatePath("/admin/prospectos");
  redirect("/admin/prospectos");
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

const CAPTURA_MAX_BYTES = 4 * 1024 * 1024; // 4MB por imagen — suficiente para una captura de pantalla

/** El `type` que declara el navegador es el nombre que le puso el cliente,
 * no una garantía — cualquier archivo puede mentir ahí. Esto mira los
 * primeros bytes reales del archivo (firma de formato) y devuelve el MIME
 * correcto solo si coincide con uno de los formatos de imagen esperados. */
function mimeImagenReal(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("ascii"))) {
    return "image/gif";
  }
  return null;
}

export async function accionAgregarCapturas(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const archivos = fd.getAll("capturas").filter((f): f is File => f instanceof File && f.size > 0);
  const dataUrls: string[] = [];
  for (const archivo of archivos) {
    if (archivo.size > CAPTURA_MAX_BYTES) {
      throw new Error(`"${archivo.name}" pesa demasiado (máx 4MB).`);
    }
    const buf = Buffer.from(await archivo.arrayBuffer());
    // Se valida el contenido real (magic bytes), no el `type` que declaró
    // el navegador — así no entra un archivo disfrazado de imagen.
    const mime = mimeImagenReal(buf);
    if (!mime) {
      throw new Error(`"${archivo.name}" no es una imagen (PNG, JPEG, WebP o GIF).`);
    }
    dataUrls.push(`data:${mime};base64,${buf.toString("base64")}`);
  }
  if (dataUrls.length > 0) await db.agregarCapturas(id, dataUrls);
  revalidatePath("/admin/prospectos");
  redirect("/admin/prospectos");
}

export async function accionEliminarCaptura(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const index = Number(fd.get("index"));
  await db.eliminarCaptura(id, index);
  revalidatePath("/admin/prospectos");
  redirect("/admin/prospectos");
}
