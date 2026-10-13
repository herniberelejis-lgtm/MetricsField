"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getClientePorCodigo,
  getCliente,
  getResenas,
  actualizarResena,
  actualizarAutomatizacionResenas,
  responderResenaEnGoogle,
  getTapsPorHora,
  desconectarGoogleComercio,
  getLink,
  actualizarLink,
  getCompetidores,
  crearCompetidorConTope,
  sincronizarCompetidor,
  eliminarCompetidor,
  type TapsPorHora,
} from "@/lib/db";
import { searchGooglePlace, SESGO_CORDOBA } from "@/lib/places";
import { MAX_COMPETIDORES_PORTAL } from "@/lib/competencia-portal";
import type { Cliente } from "@/lib/types";
import { urlSegura } from "@/lib/url";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { portalRequiereLoginGoogle, tieneAccesoPortal } from "@/lib/portal-auth";
import { comercioConLoyalty, reflejarSaldoEnWallet } from "@/lib/loyalty";
import { MENSAJE_SOLO_LECTURA, portalSoloLectura } from "@/lib/portal-demo";
import { getMembresiaPorId, registrarEventoLoyalty, validarCanje } from "@/lib/db/loyalty";

// Server actions públicas del portal: no hay sesión de admin, el código de
// acceso privado ES la credencial — pero esa credencial vive en la CUENTA
// (fila raíz), y multi-sucursal permite operar sobre cualquiera de sus
// locales. Toda acción resuelve primero la cuenta por el código y después
// confirma que `comercioId` es la cuenta misma o una sucursal que cuelga de
// ella — nunca confiar en un comercioId suelto que manda el formulario.
//
// Además repite los chequeos que hace la página del portal antes de
// mostrar nada — una server action se puede invocar directo, sin pasar por
// la página, así que si no los repite acá no existen:
// - rate limit por IP antes de tocar la base (frena enumerar códigos);
// - cuenta dada de baja = portal inexistente;
// - cuenta demo con código publicado = solo lectura (lib/portal-demo.ts);
// - gate de Google: si el comercio cargó emails en portal_usuarios, el
//   código ya no alcanza solo (ej. un ex empleado que se quedó con el link
//   no puede cambiar el destino de los carteles ni desconectar Google).

async function comercioAutorizado(
  codigo: string,
  comercioId: string,
  modo: "escritura" | "lectura" = "escritura",
): Promise<Cliente> {
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`portal-accion:${ip}`, 60, 10 * 60_000))) {
    throw new Error("Demasiados intentos. Probá de nuevo en un rato.");
  }
  const cuenta = await getClientePorCodigo(codigo);
  if (!cuenta || cuenta.estado === "baja") throw new Error("Portal inválido.");
  // Cuentas demo/seed con código publicado: se miran, no se tocan.
  if (modo === "escritura" && portalSoloLectura(codigo)) throw new Error(MENSAJE_SOLO_LECTURA);
  if ((await portalRequiereLoginGoogle(cuenta.id)) && !(await tieneAccesoPortal(cuenta.id))) {
    throw new Error("Iniciá sesión con Google para hacer cambios en este portal.");
  }
  if (comercioId === cuenta.id) return cuenta;
  const sucursal = await getCliente(comercioId);
  if (!sucursal || sucursal.comercioPadreId !== cuenta.id || sucursal.estado === "baja") {
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

export async function accionAprobarResenaPortal(fd: FormData): Promise<{ publicada: boolean }> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const id = Number(fd.get("id"));
  const respuesta = String(fd.get("respuesta") ?? "").trim().slice(0, 2000);
  const { resena } = await reseñaDelComercio(codigo, comercioId, id);
  if (!respuesta) throw new Error("La respuesta no puede quedar vacía.");

  // Si la reseña vino sincronizada de Google y ya tenemos acceso a la
  // Reviews API, "aprobar" la publica de una en la ficha real — antes
  // quedaba SIEMPRE en modo copiar y pegar, incluso el día que Google
  // apruebe el acceso. Sin esas dos condiciones (o si Google la rechaza),
  // cae al comportamiento de siempre; el llamador (portal) le muestra al
  // dueño cuál de los dos pasó.
  const publicada = resena.origenGoogleId
    ? await responderResenaEnGoogle(comercioId, resena.origenGoogleId, respuesta)
    : false;

  await actualizarResena(id, {
    respuestaSugerida: respuesta,
    respuestaPublicada: publicada,
    estado: "respondida",
  });
  revalidatePath(`/portal/${codigo}`);
  return { publicada };
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

/** Autogestión de un dispositivo desde el portal: el dueño cambia su nombre
 * (para poder identificarlo por mozo, caja, mesa, lo que sea) y/o a dónde
 * manda, sin depender del equipo interno. El QR/NFC impreso nunca cambia —
 * ver arquitectura en app/t/[slug]/page.tsx: "urlDestino" manda siempre si
 * está cargada. `etiqueta` es independiente de `nombreEmpleado`: esta acción
 * solo toca la primera (el rótulo visible del dispositivo) — el campo de
 * empleado sigue siendo cosa del equipo interno, porque además dispara la
 * búsqueda de menciones en el texto de las reseñas (ver lib/empleados.ts) y
 * cambiarlo sin avisar rompería esa correlación en silencio.
 *
 * No usa throw+redirect para los errores porque esta acción se llama directo
 * desde un componente cliente (no un <form action=>) y un throw sin capturar
 * tumbaría el panel entero — se devuelve un resultado explícito en cambio. */
export async function accionActualizarUrlLinkPortal(
  fd: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const codigo = String(fd.get("codigo") ?? "");
  const comercioId = String(fd.get("comercioId") ?? "");
  const linkId = String(fd.get("linkId") ?? "");
  const nuevaUrl = String(fd.get("urlDestino") ?? "").trim();
  const nuevaEtiqueta = String(fd.get("etiqueta") ?? "").trim().slice(0, 60);

  let comercio: Cliente;
  try {
    comercio = await comercioAutorizado(codigo, comercioId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }
  const link = await getLink(linkId);
  if (!link || link.comercioId !== comercio.id) {
    throw new Error("Ese dispositivo no pertenece a este portal.");
  }

  if (!nuevaEtiqueta) {
    return { ok: false, error: "El nombre no puede quedar vacío." };
  }

  if (!nuevaUrl) {
    await actualizarLink(linkId, { etiqueta: nuevaEtiqueta, urlDestino: null });
    revalidatePath(`/portal/${codigo}`);
    return { ok: true };
  }

  const limpia = urlSegura(nuevaUrl);
  if (!limpia) {
    return { ok: false, error: "Esa URL no parece válida — revisala e intentá de nuevo." };
  }

  await actualizarLink(linkId, { etiqueta: nuevaEtiqueta, urlDestino: limpia });
  revalidatePath(`/portal/${codigo}`);
  return { ok: true };
}

/** Desglose hora a hora de un día — para expandir el gráfico de "Taps por
 * día". Se llama directo desde el cliente (no un <form>), así que valida el
 * formato de la fecha a mano en vez de confiar en el tipo del parámetro. */
export async function accionObtenerTapsPorHora(codigo: string, comercioId: string, fecha: string): Promise<TapsPorHora[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return [];
  const comercio = await comercioAutorizado(String(codigo), String(comercioId), "lectura").catch(() => null);
  if (!comercio) return [];
  return getTapsPorHora(comercio.id, fecha);
}

// ---------- Competidores: el cliente arma su propia lista ----------
// Antes solo el equipo podía cargar competidores (con el Place ID a mano o
// el buscador del admin). Ahora el dueño los busca por nombre, como en
// Google Maps, y los agrega con un toque. Cada competidor cuesta cuota paga
// de Places (sync diario + al abrir el portal), y cada búsqueda también:
// por eso hay tope de competidores por local y límite de búsquedas.

export interface LugarEncontrado {
  placeId: string;
  nombre: string;
  direccion: string;
  /** Ya está en la lista o es el propio local: se muestra sin botón. */
  estado: "disponible" | "agregado" | "propio";
}

type ResultadoBusqueda = { ok: true; lugares: LugarEncontrado[] } | { ok: false; error: string };

// Un Place ID de Google: letras, números, "-" y "_". Si empieza con "-" o
// "_", es uno que se copió cortado (doble clic corta en el guion).
function placeIdValido(placeId: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{9,299}$/.test(placeId);
}

export async function accionBuscarLugarPortal(
  codigo: string,
  comercioId: string,
  texto: string,
): Promise<ResultadoBusqueda> {
  const consulta = String(texto ?? "").trim().slice(0, 120);
  if (consulta.length < 3) return { ok: true, lugares: [] };

  let comercio: Cliente;
  try {
    comercio = await comercioAutorizado(String(codigo), String(comercioId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }
  // Cada búsqueda se paga: límite por IP y, aparte, por local (para que
  // rotar IPs no sirva para gastar la cuota de un cliente).
  const ip = ipDelRequest(await headers());
  if (
    !(await permitir(`portal-buscar-lugar:${ip}`, 40, 10 * 60_000)) ||
    !(await permitir(`portal-buscar-lugar-local:${comercio.id}`, 120, 60 * 60_000))
  ) {
    return { ok: false, error: "Hiciste muchas búsquedas seguidas. Esperá unos minutos y probá de nuevo." };
  }

  const r = await searchGooglePlace(consulta, SESGO_CORDOBA);
  if (!r.ok) {
    return { ok: false, error: "El buscador de Google no está disponible ahora. Probá de nuevo en un rato." };
  }
  const yaAgregados = new Set(
    (await getCompetidores(comercio.id)).map((c) => c.googlePlaceId).filter(Boolean),
  );
  return {
    ok: true,
    lugares: r.resultados.slice(0, 8).map((l) => ({
      placeId: l.placeId,
      nombre: l.nombre,
      direccion: l.direccion,
      estado:
        l.placeId === comercio.googlePlaceId ? "propio" : yaAgregados.has(l.placeId) ? "agregado" : "disponible",
    })),
  };
}

export async function accionAgregarCompetidorPortal(
  codigo: string,
  comercioId: string,
  placeId: string,
  nombre: string,
): Promise<{ ok: true; nombre: string } | { ok: false; error: string }> {
  const id = String(placeId ?? "").trim();
  // El nombre viene del resultado de la búsqueda; solo lo ve este mismo
  // local, pero igual se limpia y se acota.
  const nombreLimpio = String(nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || "Competidor";
  if (!placeIdValido(id)) return { ok: false, error: "Ese lugar no es válido. Buscalo de nuevo." };

  let comercio: Cliente;
  try {
    comercio = await comercioAutorizado(String(codigo), String(comercioId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }
  const ip = ipDelRequest(await headers());
  // Por IP y por local: cada alta paga una llamada a Places, y el gasto es
  // del local (muchas IPs contra el mismo local también se cortan).
  if (
    !(await permitir(`portal-agregar-competidor:${ip}`, 20, 10 * 60_000)) ||
    !(await permitir(`portal-agregar-competidor-local:${comercio.id}`, 30, 60 * 60_000))
  ) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  if (id === comercio.googlePlaceId) return { ok: false, error: "Ese es tu propio local." };
  const alta = await crearCompetidorConTope(
    comercio.id,
    { nombre: nombreLimpio, googlePlaceId: id },
    MAX_COMPETIDORES_PORTAL,
  );
  if (!alta.ok) {
    return {
      ok: false,
      error:
        alta.motivo === "duplicado"
          ? `${nombreLimpio} ya está en tu lista.`
          : `Ya tenés ${MAX_COMPETIDORES_PORTAL} competidores. Quitá alguno para sumar otro.`,
    };
  }
  const nuevo = alta.competidor;

  // Ya creado, se trae su calificación de una: si Google no devuelve datos
  // para ese lugar, no se deja una fila vacía en la lista.
  const conDatos = await sincronizarCompetidor(nuevo.id).catch(() => false);
  if (!conDatos) {
    await eliminarCompetidor(nuevo.id);
    return { ok: false, error: "No pudimos leer los datos de ese lugar en Google. Probá con otro resultado." };
  }
  revalidatePath(`/portal/${codigo}`);
  return { ok: true, nombre: nombreLimpio };
}

export async function accionQuitarCompetidorPortal(
  codigo: string,
  comercioId: string,
  competidorId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let comercio: Cliente;
  try {
    comercio = await comercioAutorizado(String(codigo), String(comercioId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }
  // Nunca borrar por un id suelto: tiene que ser un competidor de ESTE local.
  const competidor = (await getCompetidores(comercio.id)).find((c) => c.id === Number(competidorId));
  if (!competidor) return { ok: false, error: "Ese competidor no está en tu lista." };
  await eliminarCompetidor(competidor.id);
  revalidatePath(`/portal/${codigo}`);
  return { ok: true };
}


// ---------- Loyalty: validar un canje en caja ----------
// La primera escritura del portal que mueve plata del comercio (un café
// gratis): misma autorización que el resto del portal (comercioAutorizado:
// código + gate de Google + el local tiene que ser de esta cuenta) y además
// un límite propio por local, para que nadie pruebe códigos al azar.

export type ResultadoCanjePortal =
  | { ok: true; beneficio: string; cliente: string; costoPuntos: number; saldo: number }
  | { ok: false; error: string };

export async function accionValidarCanjePortal(
  codigo: string,
  comercioId: string,
  codigoCanje: string,
): Promise<ResultadoCanjePortal> {
  try {
    const comercio = await comercioAutorizado(String(codigo), String(comercioId));
    if (!(await permitir(`portal-canje:${comercio.id}`, 30, 10 * 60_000))) {
      return { ok: false, error: "Demasiados intentos seguidos. Esperá unos minutos." };
    }
    if (!(await comercioConLoyalty(comercio.id))) {
      return { ok: false, error: "Este local no tiene el club de beneficios activo." };
    }
    const r = await validarCanje(comercio.id, String(codigoCanje ?? ""), "portal");
    if (!r.ok) return r;
    // El canje YA quedó validado: lo que sigue es accesorio y un fallo acá no
    // puede decirle al cajero "probá de nuevo" (vería "ya se usó" y le
    // negaría el beneficio a quien ya pagó con sus puntos).
    try {
      await registrarEventoLoyalty({ comercioId: comercio.id, tipo: "canje_validado", detalle: r.codigo });
      const membresia = await getMembresiaPorId(r.membresiaId);
      if (membresia) await reflejarSaldoEnWallet(membresia, r.saldo);
      revalidatePath(`/portal/${encodeURIComponent(String(codigo))}`);
    } catch (e) {
      console.error("Canje validado, pero falló el registro posterior:", e instanceof Error ? e.message : e);
    }
    return { ok: true, beneficio: r.beneficio, cliente: r.cliente, costoPuntos: r.costoPuntos, saldo: r.saldo };
  } catch (e) {
    // Errores de autorización (los de comercioAutorizado) se muestran; uno de
    // la base (ej. un conflicto de concurrencia) no: se pide reintentar.
    const mensaje = e instanceof Error ? e.message : "";
    const deLaBase = typeof e === "object" && e !== null && "code" in e;
    if (deLaBase) console.error("Canje: error de base al validar:", mensaje);
    return { ok: false, error: deLaBase || !mensaje ? "No se pudo validar el código. Probá de nuevo." : mensaje };
  }
}
