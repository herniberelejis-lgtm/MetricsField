"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { requireAdmin, emailAdminActual } from "@/lib/auth";
import { alertarResenaMala, mailResumenSemanal } from "@/lib/alertas";
import { componerMiniaturaLogo } from "@/lib/imagenLogo";
import { businessProfileHabilitado } from "@/lib/gbp";
import * as loyaltyDb from "@/lib/db/loyalty";
import { urlSegura } from "@/lib/url";
import { desactivarTarjetasDeCuenta, liberarTelefonoYTarjetas, sincronizarClaseGoogle, walletGoogleConfigurado } from "@/lib/loyalty";
import { normalizarTelefono } from "@/lib/loyalty-firma";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import { probarEnvioEmail } from "@/lib/email";
import { pinValido } from "@/lib/pin";
import type {
  TipoMisionLoyalty,
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

/** Al cargar o cambiar el Place ID de un local, trae rating y reseñas de
 * Google en el momento — antes había que acordarse de tocar "Sincronizar
 * ahora" y, mientras tanto, el portal del cliente quedaba vacío. Nunca
 * corta el guardado: si Google falla (Place ID mal copiado, API key sin
 * configurar), devuelve false y la página avisa. */
async function sincronizarPlaceId(id: string): Promise<boolean> {
  try {
    return await db.sincronizarGoogle(id);
  } catch {
    return false;
  }
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
  const sincronizado = cliente.googlePlaceId ? await sincronizarPlaceId(cliente.id) : true;
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${cliente.id}${sincronizado ? "" : "?error=sync-google"}`);
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
  const sincronizado = sucursal.googlePlaceId ? await sincronizarPlaceId(sucursal.id) : true;
  revalidatePath("/", "layout");
  // Si falló, a la ficha del local nuevo: ahí está su Place ID para corregirlo.
  redirect(sincronizado ? `/admin/clientes/${cuentaId}` : `/admin/clientes/${sucursal.id}?error=sync-google`);
}

export async function accionActualizarCliente(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const antes = await db.getCliente(id);
  const placeIdNuevo = str(fd, "googlePlaceId");
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
  // Solo si el Place ID es nuevo o nunca se sincronizó: guardar otro campo
  // (el contacto, el plan) no gasta una llamada a Places.
  const hayQueSincronizar =
    Boolean(placeIdNuevo) && (placeIdNuevo !== antes?.googlePlaceId || !antes?.googleSyncEn);
  const sincronizado = hayQueSincronizar ? await sincronizarPlaceId(id) : true;
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}${sincronizado ? "" : "?error=sync-google"}`);
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
  await desactivarTarjetasDeCuenta(id);
  await db.eliminarCliente(id);
  await auditar("eliminar_cliente", `${cliente.nombre} (${id})`);
  revalidatePath("/", "layout");
  redirect("/admin/clientes");
}

const LOGO_TIPOS_ACEPTADOS = ["image/png", "image/jpeg", "image/webp"];
const LOGO_TAMANO_MAXIMO = 2 * 1024 * 1024; // 2 MB — de sobra para un isotipo

export async function accionSubirLogoComercio(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const archivo = fd.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/admin/clientes/${id}/editar?error=logo-vacio`);
  }
  if (!LOGO_TIPOS_ACEPTADOS.includes(archivo.type)) {
    redirect(`/admin/clientes/${id}/editar?error=logo-formato`);
  }
  if (archivo.size > LOGO_TAMANO_MAXIMO) {
    redirect(`/admin/clientes/${id}/editar?error=logo-tamano`);
  }
  const datos = Buffer.from(await archivo.arrayBuffer());
  // Se compone acá, una sola vez — nunca en cada visita del bot de preview
  // de WhatsApp (ver app/api/og-resena/[slug]). Si falla (formato raro,
  // satori atragantado con algo puntual), queda sin miniatura propia y esa
  // ruta sirve la genérica — el logo en sí se guarda igual.
  let miniatura: Buffer | null = null;
  try {
    miniatura = await componerMiniaturaLogo(datos, archivo.type);
  } catch {
    miniatura = null;
  }
  await db.guardarLogoComercio(id, datos, archivo.type, miniatura);
  await auditar("subir_logo_comercio", id);
  revalidatePath(`/admin/clientes/${id}/editar`);
  redirect(`/admin/clientes/${id}/editar`);
}

export async function accionEliminarLogoComercio(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await db.eliminarLogoComercio(id);
  await auditar("eliminar_logo_comercio", id);
  revalidatePath(`/admin/clientes/${id}/editar`);
  redirect(`/admin/clientes/${id}/editar`);
}

export async function accionDesconectarGoogleComercio(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await db.desconectarGoogleComercio(id);
  await auditar("desconectar_google_cliente", id);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

/** Manda el resumen del lunes de este cliente a la casilla que elija el
 * admin, como prueba: confirma que el SMTP de Vercel funciona y muestra el
 * mail real. Vuelve a la ficha con el resultado (o el motivo del error). */
export async function accionProbarResumenSemanal(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const para = str(fd, "para").trim();
  const volver = (q: string) => redirect(`/admin/clientes/${id}?${q}#resumen-lunes`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) volver("mail=error&detalle=" + encodeURIComponent("Ese mail no es válido."));
  const cliente = await db.getCliente(id);
  if (!cliente) volver("mail=error&detalle=" + encodeURIComponent("No existe el cliente."));
  const resumen = await db.getResumenSemanal(cliente!);
  const contenido = resumen
    ? await mailResumenSemanal(cliente!, resumen)
    : {
        asunto: "Prueba de mail — MetricsField",
        html: `<p>Prueba de mail de MetricsField. Este cliente no tiene nada que contar esta semana, así que el lunes no se le manda resumen.</p>`,
      };
  const r = await probarEnvioEmail({ to: para, asunto: `[Prueba] ${contenido.asunto}`, html: contenido.html });
  await auditar("probar_mail_resumen", `${id} → ${para}: ${r.ok ? "ok" : "error"}`);
  volver(
    r.ok
      ? `mail=ok&detalle=${encodeURIComponent(`Enviado a ${para} desde ${r.remitente}. Revisá también la carpeta de spam.`)}`
      : `mail=error&detalle=${encodeURIComponent(r.error)}`,
  );
}

export async function accionSincronizarGoogle(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  // Un Place ID inválido (o la API key sin configurar) no puede tirar abajo
  // la página: se avisa con un parámetro. Y no frena lo de Business Profile,
  // que no depende de Places (usa la cuenta que conectó el cliente).
  const ok = await db.sincronizarGoogle(id).catch(() => false);
  // Rendimiento y reseñas de Business Profile: el resultado de cada uno
  // (bien o mal, y por qué) queda guardado y se muestra en la ficha del
  // cliente — ver getEstadosSyncGoogle.
  if (businessProfileHabilitado()) {
    await db.sincronizarRendimiento(id).catch((e) => console.error("Sync rendimiento:", e));
  }
  if (resenasApiHabilitada()) {
    await db.sincronizarResenasGoogle(id).catch((e) => console.error("Sync reseñas:", e));
  }
  revalidatePath("/", "layout");
  redirect(
    ok
      ? `/admin/clientes/${id}`
      : `/admin/clientes/${id}?error=${process.env.GOOGLE_PLACES_API_KEY ? "sync-google" : "sync-google-sin-clave"}`,
  );
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

// ---------- Login con Google del portal (por comercio) ----------

export async function accionAgregarUsuarioPortal(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const email = str(fd, "email");
  const nombre = str(fd, "nombre");
  await db.agregarUsuarioPortal(id, email, nombre);
  await auditar("agregar_usuario_portal", `${id}: ${email}`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

export async function accionQuitarUsuarioPortal(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const email = str(fd, "email");
  await db.quitarUsuarioPortal(id, email);
  await auditar("quitar_usuario_portal", `${id}: ${email}`);
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${id}`);
}

// ---------- Links NFC ----------

export async function accionCrearLink(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const destino = str(fd, "destino") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  if (destino !== "resena" && destino !== "loyalty" && !urlDestino) {
    redirect(`/admin/clientes/${comercioId}/links?error=sin-url`);
  }
  await db.crearLink(comercioId, {
    etiqueta: str(fd, "etiqueta") || "Nuevo link",
    tipo: (str(fd, "tipo") || "nfc") as TipoSoporte,
    destino,
    urlDestino: urlDestino || null,
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
  if (destino !== "resena" && destino !== "loyalty" && !urlDestino) {
    redirect(`/admin/clientes/${comercioId}/links?error=sin-url`);
  }
  await db.actualizarLink(linkId, {
    etiqueta: str(fd, "etiqueta"),
    tipo: (str(fd, "tipo") || "nfc") as TipoSoporte,
    destino,
    urlDestino: urlDestino || null,
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
  if (!comercioId) redirect("/admin/hardware?error=sin-cliente");
  const destino = (str(fd, "destino") || "resena") as DestinoLink;
  const urlDestino = str(fd, "urlDestino");
  if (destino !== "resena" && destino !== "loyalty" && !urlDestino) {
    redirect("/admin/hardware?error=sin-url");
  }
  // Si otro la asignó en el medio (o se apretó dos veces), se avisa en la
  // misma página en vez de mostrar una pantalla de error.
  let asignada = true;
  try {
    await db.asignarPiezaACliente(id, comercioId, {
      etiqueta: str(fd, "etiqueta") || "Sin etiquetar",
      tipo: str(fd, "tipo") ? (str(fd, "tipo") as TipoSoporte) : undefined,
      destino,
      urlDestino: urlDestino || null,
    });
  } catch {
    asignada = false;
  }
  if (!asignada) redirect("/admin/hardware?error=no-libre");
  await auditar("asignar_pieza_hardware", `${id} → ${comercioId}`);
  revalidatePath("/", "layout");
  redirect("/admin/hardware");
}

/** Corrige una pieza ya asignada al comercio equivocado (ej. la imprenta
 * mezcló los números de un lote) — mueve el destino sin tocar el código
 * físico ya impreso. Ver reasignarPieza en lib/db/links.ts. */
export async function accionReasignarPieza(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const nuevoComercioId = str(fd, "comercioId");
  if (!nuevoComercioId) redirect("/admin/hardware?error=sin-cliente");
  await db.reasignarPieza(id, nuevoComercioId, {
    etiqueta: str(fd, "etiqueta") || "Sin etiquetar",
    // Vacío = a propósito: cae en la reseña de Google del cliente nuevo.
    // Si el campo trae algo (precargado con lo que la pieza ya tenía), se
    // conserva tal cual en vez de perderse al reasignar.
    urlDestino: str(fd, "urlDestino") || null,
    // Precargado con el destino actual de la pieza (campo oculto en el
    // form) — sin esto, reasignarPieza lo pisaba siempre a "resena" aunque
    // la URL preservada fuera de otro tipo (menú, Instagram, promo).
    destino: (str(fd, "destino") || "resena") as DestinoLink,
  });
  await auditar("reasignar_pieza_hardware", `${id} → ${nuevoComercioId}`);
  revalidatePath("/", "layout");
  redirect("/admin/hardware");
}

/** PIN nuevo para una pieza autogestionada cuyo dueño se olvidó el suyo
 * (lo pide por WhatsApp). Lo elige el equipo y se lo pasa; no viaja en la
 * URL ni queda en la auditoría. */
export async function accionNuevoPinPieza(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const pin = str(fd, "pin");
  if (!pinValido(pin)) redirect("/admin/hardware?error=pin-invalido");
  // Regla de soporte: un PIN nuevo le da la pieza a quien lo pidió. Sin
  // verificar que es el dueño, es la puerta para quedarse con piezas ajenas.
  if (str(fd, "verificado") !== "si") redirect("/admin/hardware?error=sin-verificar");
  const cambiado = await db.cambiarPinAutogestion(id, pin);
  if (!cambiado) redirect("/admin/hardware?error=no-autogestionada");
  // PIN nuevo = nadie más la maneja: tampoco una cuenta de Google donde
  // estaba guardada (puede ser justamente la de quien no debería tenerla).
  await db.desvincularPieza(id);
  await auditar("nuevo_pin_pieza", id);
  redirect(`/admin/hardware?ok=pin-${encodeURIComponent(id)}`);
}

/** Devolver una pieza autogestionada al inventario libre (ver
 * liberarPiezaAutogestionada). Pide confirmación en el formulario. */
export async function accionLiberarPieza(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  if (str(fd, "confirmo") !== "si") redirect("/admin/hardware?error=sin-confirmar");
  const liberada = await db.liberarPiezaAutogestionada(id);
  if (!liberada) redirect("/admin/hardware?error=no-autogestionada");
  await auditar("liberar_pieza_hardware", id);
  revalidatePath("/", "layout");
  redirect(`/admin/hardware?ok=liberada-${encodeURIComponent(id)}`);
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

/** Un Place ID que arranca con "_" o "-" está cortado: el doble clic para
 * copiarlo selecciona solo hasta el guión y deja afuera el "ChIJ…" del
 * principio (pasó con un competidor: Google respondía 400 y en el portal
 * quedaba una fila sin datos sin que nadie se enterara). */
function placeIdCortado(placeId: string): boolean {
  return /^[-_]/.test(placeId);
}

/** Sincroniza un competidor contra Places sin cortar el guardado si falla. */
async function sincronizarCompetidorSeguro(id: number): Promise<boolean> {
  try {
    return await db.sincronizarCompetidor(id);
  } catch {
    return false;
  }
}

export async function accionCrearCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const placeId = str(fd, "googlePlaceId");
  if (placeId && placeIdCortado(placeId)) {
    redirect(`/admin/clientes/${comercioId}/competencia?error=place-id-cortado`);
  }
  const competidor = await db.crearCompetidor(comercioId, {
    nombre: str(fd, "nombre"),
    rating: fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: fd.get("totalResenas") ? Math.round(num(fd, "totalResenas")) : null,
    googlePlaceId: placeId || null,
  });
  // Si vino con place_id, traemos el rating/reseñas reales de una — así no
  // hay que esperar al cron de mañana para ver el primer dato automático.
  // Si Google lo rechaza, se avisa en la página en vez de quedar escondido.
  const sincronizado = competidor.googlePlaceId ? await sincronizarCompetidorSeguro(competidor.id) : true;
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia${sincronizado ? "" : "?error=sync-competidor"}`);
}

export async function accionActualizarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  const placeId = str(fd, "googlePlaceId");
  if (placeId && placeIdCortado(placeId)) {
    redirect(`/admin/clientes/${comercioId}/competencia?error=place-id-cortado`);
  }
  const antes = (await db.getCompetidores(comercioId)).find((c) => c.id === id);
  // "Cambiar Place ID" no manda calificación ni reseñas: sin el campo en el
  // formulario se dejan como están (undefined), no se pisan con vacío.
  await db.actualizarCompetidor(id, {
    rating: !fd.has("rating") ? undefined : fd.get("rating") ? num(fd, "rating") : null,
    totalResenas: !fd.has("totalResenas")
      ? undefined
      : fd.get("totalResenas")
        ? Math.round(num(fd, "totalResenas"))
        : null,
    googlePlaceId: placeId || null,
  });
  // Place ID nuevo (o que nunca trajo datos): se sincroniza en el momento y,
  // si Google lo rechaza, la página lo dice.
  const hayQueSincronizar =
    Boolean(placeId) && (placeId !== antes?.googlePlaceId || (antes?.rating === null && antes?.totalResenas === null));
  const sincronizado = hayQueSincronizar ? await sincronizarCompetidorSeguro(id) : true;
  revalidatePath("/", "layout");
  redirect(`/admin/clientes/${comercioId}/competencia${sincronizado ? "" : "?error=sync-competidor"}`);
}

export async function accionSincronizarCompetidor(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const comercioId = str(fd, "comercioId");
  const ok = await db.sincronizarCompetidor(id);
  if (!ok) {
    redirect(`/admin/clientes/${comercioId}/competencia?error=sync-competidor`);
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
  if (!(await db.eliminarAdmin(email))) {
    redirect("/admin/administradores?error=ultimo");
  }
  await auditar("eliminar_admin", email);
  revalidatePath("/admin/administradores");
  redirect("/admin/administradores");
}


// ---------- Loyalty (club de beneficios) ----------
// El equipo configura el club de cada comercio desde
// /admin/clientes/<id>/loyalty: lo prende, fija los puntos y arma el
// catálogo de beneficios y misiones. Al guardar, la clase de Google Wallet
// del comercio se crea o se actualiza (nombre y logo) en el momento.

const TIPOS_MISION: TipoMisionLoyalty[] = ["resena_google", "seguir_redes", "referido"];

function enteroEntre(fd: FormData, key: string, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(num(fd, key))));
}

function rutaLoyalty(id: string, query = ""): string {
  return `/admin/clientes/${encodeURIComponent(id)}/loyalty${query}`;
}

export async function accionGuardarLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  if (!(await db.getCliente(id))) throw new Error("Cliente inexistente.");
  const tieneLoyalty = fd.get("tieneLoyalty") === "on";
  await loyaltyDb.setTieneLoyalty(id, tieneLoyalty);
  const programa = await loyaltyDb.guardarProgramaLoyalty(id, {
    puntosBienvenida: enteroEntre(fd, "puntosBienvenida", 0, 10_000),
    puntosPorVisita: enteroEntre(fd, "puntosPorVisita", 0, 10_000),
    activo: fd.get("activo") === "on",
  });
  await auditar("guardar_loyalty", `${id}: ${tieneLoyalty ? "activo" : "apagado"}, bienvenida ${programa.puntosBienvenida}, visita ${programa.puntosPorVisita}`);

  let query = "?ok=1";
  if (tieneLoyalty && walletGoogleConfigurado()) {
    try {
      const comercio = await loyaltyDb.getComercioLoyalty(id);
      if (comercio) await sincronizarClaseGoogle(comercio);
    } catch (e) {
      console.error("Loyalty: no se pudo sincronizar la clase de Google:", e instanceof Error ? e.message : e);
      query = "?error=google";
    }
  }
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id, query));
}

export async function accionCrearBeneficioLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const nombre = str(fd, "nombre").slice(0, 80);
  const costo = enteroEntre(fd, "costoPuntos", 1, 100_000);
  if (!nombre) redirect(rutaLoyalty(id, "?error=beneficio"));
  if (!(await db.getCliente(id))) throw new Error("Cliente inexistente.");
  await loyaltyDb.crearBeneficio(id, nombre, costo);
  await auditar("crear_beneficio_loyalty", `${id}: ${nombre} (${costo})`);
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id));
}

export async function accionToggleBeneficioLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await loyaltyDb.setBeneficioActivo(id, str(fd, "beneficioId"), fd.get("activo") === "1");
  await auditar("editar_beneficio_loyalty", `${id}: ${str(fd, "beneficioId")}`);
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id));
}

export async function accionCrearMisionLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const tipo = str(fd, "tipo") as TipoMisionLoyalty;
  const url = str(fd, "url");
  if (!TIPOS_MISION.includes(tipo)) redirect(rutaLoyalty(id, "?error=mision"));
  if (tipo === "seguir_redes" && !urlSegura(url)) redirect(rutaLoyalty(id, "?error=mision-url"));
  if (!(await db.getCliente(id))) throw new Error("Cliente inexistente.");
  await loyaltyDb.crearMision(id, {
    tipo,
    puntos: enteroEntre(fd, "puntos", 1, 10_000),
    url: tipo === "seguir_redes" ? url : "",
  });
  await auditar("crear_mision_loyalty", `${id}: ${tipo}`);
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id));
}

export async function accionToggleMisionLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await loyaltyDb.setMisionActiva(id, str(fd, "misionId"), fd.get("activa") === "1");
  await auditar("editar_mision_loyalty", `${id}: ${str(fd, "misionId")}`);
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id));
}

/** Un cliente final avisa que "su" teléfono ya tenía tarjeta (alguien lo
 * registró antes sin ser suyo): el equipo lo libera y la persona se puede
 * registrar. Dos pasos: el primero solo busca y muestra de quién es la
 * tarjeta (nombre, locales, puntos); el segundo, con la confirmación
 * tildada, la borra en TODOS los comercios. La auditoría se escribe antes
 * del borrado, con lo que había. */
export async function accionLiberarTelefonoLoyalty(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const telefono = normalizarTelefono(str(fd, "telefono"));
  if (!telefono) redirect(rutaLoyalty(id, "?error=telefono"));
  const resumen = await loyaltyDb.getResumenTelefono(telefono);
  if (!resumen) redirect(rutaLoyalty(id, "?error=telefono-libre"));
  if (fd.get("confirmar") !== "on") {
    redirect(rutaLoyalty(id, `?liberar=${encodeURIComponent(telefono)}`));
  }
  // La confirmación vale para la persona que se mostró, no para el número.
  if (str(fd, "persona") !== resumen.id) redirect(rutaLoyalty(id, `?liberar=${encodeURIComponent(telefono)}`));
  const locales = resumen.locales.map((l) => `${l.comercio} (${l.saldo} pts)`).join(", ") || "sin locales";
  await auditar("liberar_telefono_loyalty", `${telefono} — ${resumen.nombre}; ${locales} (desde ${id})`);
  const liberado = await liberarTelefonoYTarjetas(telefono, resumen.id);
  revalidatePath(rutaLoyalty(id));
  redirect(rutaLoyalty(id, liberado ? "?ok=telefono" : "?error=telefono-libre"));
}
