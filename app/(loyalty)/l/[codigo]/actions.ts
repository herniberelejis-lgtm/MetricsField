"use server";

import { cookies, headers } from "next/headers";
import {
  getComercioLoyalty,
  getProgramaPorCodigoPublico,
  upsertCliente,
  obtenerOCrearMembresia,
  registrarMovimiento,
  registrarEvento,
  registrarConsentimiento,
  actualizarClaseGoogle,
  marcarWalletGoogleEmitida,
  marcarWalletGoogleError,
} from "@/lib/db/loyalty";
import {
  generarToken,
  normalizarTelefono,
  hmacTelefono,
  cifrar,
  hmacIp,
} from "@/lib/loyalty/identidad";
import { NOMBRE_COOKIE_MEMBRESIA, opcionesCookieMembresia } from "@/lib/loyalty/sesion";
import { detectarPlataforma } from "@/lib/loyalty/plataforma";
import {
  VERSION_CONSENTIMIENTO_LOYALTY,
  textoLegalCompleto,
  hashTextoLegal,
} from "@/lib/loyalty/textos-legales";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { crearClase, crearOActualizarObjeto, generarLinkGuardar } from "@/lib/wallet/google";
import { reportarFalla } from "@/lib/monitor";

// CONEXIONES
//   Lo invoca:    components/loyalty/FormularioAlta.tsx (Server Action,
//                 "use server" — se llama como una función normal desde
//                 un Client Component gracias a Next.js)
//   Escribe en:   loyalty.clientes, loyalty.membresias, loyalty.movimientos,
//                 loyalty.consentimientos, loyalty.eventos, y
//                 loyalty.programas.google_class_id (todo vía
//                 lib/db/loyalty.ts, nunca SQL directo acá)
//   Llama a:      lib/wallet/google.ts (crea la clase/objeto y firma el
//                 link "Agregar a Google Wallet" — best-effort, no
//                 bloquea el registro si Google falla)
//   Setea:        la cookie loyalty_membresia (lib/loyalty/sesion.ts) —
//                 es el único lugar de todo el módulo que la escribe.
//   NO llama a lib/wallet/apple.ts: el .pkpass se genera on-demand en
//   app/(loyalty)/tarjeta/pase.pkpass/route.ts, no en el registro.

export interface ResultadoRegistro {
  ok: boolean;
  error?: string;
  /** Presente siempre que ok=true — lo necesita el cliente para el click
   * de "wallet_guardada" (registrarClickGuardarWallet). No es sensible:
   * es un UUID interno, no la credencial (esa es el token de la cookie). */
  membresiaId?: string;
  /** Presente solo si el alta funcionó Y la emisión a Google Wallet
   * funcionó. Su ausencia (con ok=true) no es un error: la base propia
   * es la fuente de verdad, y la membresía existe igual — el botón de
   * Google simplemente no se muestra hasta poder reintentar. */
  linkGoogleWallet?: string;
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Registro público del cliente final — el único punto de escritura sin
 * login de todo el módulo. "Entrada laxa, salida estricta"
 * (docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §3): validado y con rate
 * limit, pero deliberadamente sin OTP ni verificación de teléfono — eso
 * protegería el alta a costa de la métrica que valida el piloto entero
 * (tap→wallet). Nada de lo que llega del cliente se usa como prueba de
 * autorización: el `codigoPublico` solo selecciona QUÉ programa, nunca
 * decide nada de seguridad por sí mismo. */
export async function registrarClienteLoyalty(datos: {
  codigoPublico: string;
  nombre: string;
  telefono: string;
  email: string;
  aceptaDatos: boolean;
  aceptaWallet: boolean;
  aceptaMarketing: boolean;
  declaraEdad: boolean;
}): Promise<ResultadoRegistro> {
  const nombre = String(datos.nombre ?? "").trim().slice(0, 80);
  if (!nombre) return { ok: false, error: "Contanos tu nombre." };

  if (!datos.aceptaDatos || !datos.aceptaWallet) {
    return { ok: false, error: "Hace falta aceptar el tratamiento de datos y la emisión del pase para continuar." };
  }
  if (!datos.declaraEdad) {
    return { ok: false, error: "Este programa es para mayores de 16 años." };
  }

  let telefonoE164: string;
  try {
    telefonoE164 = normalizarTelefono(String(datos.telefono ?? ""));
  } catch {
    return { ok: false, error: "Revisá tu número de teléfono." };
  }

  const email = String(datos.email ?? "").trim().slice(0, 200);
  if (email && !EMAIL_VALIDO.test(email)) {
    return { ok: false, error: "Revisá tu email." };
  }

  const h = await headers();
  limpiarVencidos();
  const ip = ipDelRequest(h);
  // Rate limit generoso por IP: la entrada es laxa a propósito (ver
  // arriba), esto frena un loop automatizado, no a una persona real.
  if (!(await permitir(`loyalty-registro:${ip}`, 10, 15 * 60_000))) {
    return { ok: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
  }

  const programa = await getProgramaPorCodigoPublico(String(datos.codigoPublico ?? ""));
  if (!programa || !programa.activo) {
    return { ok: false, error: "Este programa no está disponible." };
  }
  const comercio = await getComercioLoyalty(programa.cuentaId);
  if (!comercio || !comercio.tieneLoyalty) {
    return { ok: false, error: "Este programa no está disponible." };
  }

  const userAgent = h.get("user-agent") ?? "";
  const plataforma = detectarPlataforma(userAgent);
  const ipHmac = hmacIp(ip);

  await registrarEvento({ programaId: programa.id, tipo: "tap", plataforma, ipHmac });

  const cliente = await upsertCliente({
    programaId: programa.id,
    telefonoHmac: hmacTelefono(telefonoE164),
    telefonoCifrado: cifrar(telefonoE164),
    nombreCifrado: cifrar(nombre),
    emailCifrado: email ? cifrar(email) : undefined,
  });

  const token = generarToken();
  const membresia = await obtenerOCrearMembresia(cliente.id, programa.id, token);

  if (membresia.esNueva && programa.puntosBienvenida > 0) {
    await registrarMovimiento({
      membresiaId: membresia.id,
      delta: programa.puntosBienvenida,
      motivo: "bienvenida",
      idemClave: `bienvenida:${membresia.id}`,
    });
  }

  // Consentimiento: SIEMPRE se registra, sea alta nueva o recuperación —
  // hay que poder probar qué aceptó la persona cada vez (Ley 25.326).
  const texto = textoLegalCompleto(comercio.nombre);
  await registrarConsentimiento({
    clienteId: cliente.id,
    programaId: programa.id,
    version: VERSION_CONSENTIMIENTO_LOYALTY,
    textoHash: hashTextoLegal(texto),
    datos: datos.aceptaDatos,
    wallet: datos.aceptaWallet,
    marketing: datos.aceptaMarketing,
    edadDeclarada: datos.declaraEdad,
    userAgent,
    ipHmac,
  });

  const jar = await cookies();
  jar.set(NOMBRE_COOKIE_MEMBRESIA, token, opcionesCookieMembresia());

  await registrarEvento({ programaId: programa.id, membresiaId: membresia.id, tipo: "registro", plataforma, ipHmac });

  // Emisión a Google Wallet: best-effort. Si Google no responde (o las
  // credenciales todavía no están cargadas — ver L0), la membresía queda
  // con estado_google en 'pendiente'/'error' y el registro NO falla por
  // eso — la base propia es la fuente de verdad, nunca se pierde un
  // punto por una caída de un tercero.
  let linkGoogleWallet: string | undefined;
  try {
    let classId = programa.googleClassId;
    if (!classId) {
      classId = await crearClase({ id: programa.id, nombreComercio: comercio.nombre });
      await actualizarClaseGoogle(programa.id, classId);
    }
    const objectId = await crearOActualizarObjeto({
      classId,
      membresiaId: membresia.id,
      nombreCliente: nombre,
      saldo: membresia.saldo,
    });
    await marcarWalletGoogleEmitida(membresia.id, objectId);
    linkGoogleWallet = generarLinkGuardar({ objectId });
  } catch (e) {
    await marcarWalletGoogleError(membresia.id);
    await reportarFalla("loyalty/registro-google-wallet", e, { membresiaId: membresia.id, programaId: programa.id });
  }

  return { ok: true, membresiaId: membresia.id, linkGoogleWallet };
}

/** Click-through en el botón de guardar — proxy de "se guardó el pase",
 * ya que ninguna de las dos wallets ofrece una confirmación real de que
 * el usuario completó el guardado (ver research de plataforma). Fire and
 * forget desde el cliente: no bloquea la navegación al link de la wallet. */
export async function registrarClickGuardarWallet(programaId: string, membresiaId: string): Promise<void> {
  const h = await headers();
  await registrarEvento({
    programaId,
    membresiaId,
    tipo: "wallet_guardada",
    plataforma: detectarPlataforma(h.get("user-agent") ?? ""),
  });
}
