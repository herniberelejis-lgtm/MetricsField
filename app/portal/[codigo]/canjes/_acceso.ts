import "server-only";
import { getClientePorCodigo } from "@/lib/db";
import { emailSesionPortal, tieneAccesoPortal } from "@/lib/portal-auth";
import { getComercioLoyalty, getProgramaPorCuenta, type Programa } from "@/lib/db/loyalty";

// Única puerta de acceso a las pantallas y acciones de canje del portal.
// El canje es la PRIMERA ESCRITURA del portal (hasta ahora era solo
// lectura), así que a diferencia del resto del portal NO abre solo con el
// código de acceso: exige sesión de Google Y estar en portal_usuarios de
// este comercio, siempre. Si el comercio no cargó ningún email, el canje
// queda cerrado (fail-closed) — `confirmado_por` necesita un email real
// para que exista la traza de qué empleado entregó cada premio.
//
// Página y acciones llaman a esta misma función: así la regla vive en un
// solo lugar y no puede divergir entre "lo que se ve" y "lo que se puede hacer".

// Acota el largo y los caracteres de lo que viene de la URL antes de usarlo.
const FORMATO_CODIGO = /^[A-Za-z0-9_-]{1,64}$/;

export type AccesoCanjes =
  | { ok: true; email: string; programa: Programa; comercioId: string }
  | { ok: false; motivo: "no_encontrado" | "sin_sesion" | "sin_permiso" | "sin_loyalty" };

export async function resolverAccesoCanjes(codigo: string): Promise<AccesoCanjes> {
  // La sesión se mira PRIMERO y sin tocar la base (es solo verificar la
  // cookie firmada): un anónimo siempre recibe "sin_sesion" sin importar si
  // el código existe, así no sirve para enumerar códigos y no genera carga.
  const email = await emailSesionPortal();
  if (!email) return { ok: false, motivo: "sin_sesion" };
  if (!FORMATO_CODIGO.test(codigo)) return { ok: false, motivo: "no_encontrado" };

  const comercio = await getClientePorCodigo(codigo);
  if (!comercio || comercio.estado === "baja") return { ok: false, motivo: "no_encontrado" };
  if (!(await tieneAccesoPortal(comercio.id))) return { ok: false, motivo: "sin_permiso" };

  const entitlement = await getComercioLoyalty(comercio.id);
  if (!entitlement?.tieneLoyalty) return { ok: false, motivo: "sin_loyalty" };

  const programa = await getProgramaPorCuenta(comercio.id);
  if (!programa?.activo) return { ok: false, motivo: "sin_loyalty" };

  return { ok: true, email, programa, comercioId: comercio.id };
}
