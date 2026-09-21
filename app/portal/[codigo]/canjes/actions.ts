"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  confirmarCanje,
  crearBeneficio,
  desactivarBeneficio,
  listarBeneficios,
  registrarEvento,
} from "@/lib/db/loyalty";
import { reportarFalla } from "@/lib/monitor";
import { mensajeFalloConfirmacion } from "@/lib/loyalty/canje";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { resolverAccesoCanjes } from "./_acceso";

// CONEXIONES
//   Lo invocan:  components/portal/CanjesPendientes.tsx y ./page.tsx
//   Regla:       TODA acción empieza por resolverAccesoCanjes(codigo) — sesión
//                de Google + allowlist + programa del comercio de ESA sesión.
//                El programa_id NUNCA viene del navegador: se deriva de la
//                sesión, así un canje de otro comercio devuelve el mismo
//                error genérico que uno inexistente.

export interface ResultadoAccion {
  ok: boolean;
  mensaje?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_ACCESO = "No tenés permiso para hacer esto. Volvé a iniciar sesión.";
const MAX_ACCIONES_POR_MINUTO = 60;
const MAX_BENEFICIOS_POR_PROGRAMA = 20;

// La clave lleva solo la IP, nunca el `codigo`: viene de la URL sin validar
// y, como parte de la clave, un atacante podría inflar el almacén del
// limitador rotando códigos inventados sin llegar jamás al tope.
async function excedioLimite(): Promise<boolean> {
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  return !(await permitir(`portal-canjes:${ip}`, MAX_ACCIONES_POR_MINUTO, 60_000));
}

export async function confirmarCanjeAction(codigo: string, canjeId: string): Promise<ResultadoAccion> {
  if (await excedioLimite()) return { ok: false, mensaje: "Demasiados intentos. Esperá un momento." };

  const acceso = await resolverAccesoCanjes(codigo);
  if (!acceso.ok) return { ok: false, mensaje: ERROR_ACCESO };
  if (!UUID.test(canjeId)) return { ok: false, mensaje: mensajeFalloConfirmacion("no_disponible") };

  const resultado = await confirmarCanje({
    canjeId,
    programaId: acceso.programa.id,
    confirmadoPor: acceso.email,
  });

  if (!resultado.ok) return { ok: false, mensaje: mensajeFalloConfirmacion(resultado.motivo) };

  // El canje ya se entregó y los puntos ya se descontaron (commit hecho):
  // si el evento de métricas falla no puede convertir una entrega exitosa
  // en un error para el empleado, que reintentaría y vería "ya no está
  // disponible". Se reporta y se sigue.
  try {
    await registrarEvento({
      programaId: acceso.programa.id,
      tipo: "canje_confirmado",
      detalle: { confirmado_por: acceso.email },
    });
  } catch (error) {
    await reportarFalla("loyalty-canje-evento", error);
  }
  revalidatePath(`/portal/${codigo}/canjes`);
  return { ok: true };
}

export async function crearBeneficioAction(codigo: string, formData: FormData): Promise<ResultadoAccion> {
  if (await excedioLimite()) return { ok: false, mensaje: "Demasiados intentos. Esperá un momento." };

  const acceso = await resolverAccesoCanjes(codigo);
  if (!acceso.ok) return { ok: false, mensaje: ERROR_ACCESO };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const costoPuntos = Number(formData.get("costoPuntos"));
  if (nombre.length < 1 || nombre.length > 80) {
    return { ok: false, mensaje: "El nombre tiene que tener entre 1 y 80 caracteres." };
  }
  if (!Number.isInteger(costoPuntos) || costoPuntos < 1 || costoPuntos > 100_000) {
    return { ok: false, mensaje: "El costo tiene que ser un número entero de puntos, mayor a 0." };
  }

  if ((await listarBeneficios(acceso.programa.id)).length >= MAX_BENEFICIOS_POR_PROGRAMA) {
    return { ok: false, mensaje: `Llegaste al máximo de ${MAX_BENEFICIOS_POR_PROGRAMA} beneficios. Quitá alguno para agregar otro.` };
  }

  await crearBeneficio({ programaId: acceso.programa.id, nombre, costoPuntos });
  revalidatePath(`/portal/${codigo}/canjes`);
  return { ok: true };
}

export async function desactivarBeneficioAction(codigo: string, beneficioId: string): Promise<ResultadoAccion> {
  if (await excedioLimite()) return { ok: false, mensaje: "Demasiados intentos. Esperá un momento." };

  const acceso = await resolverAccesoCanjes(codigo);
  if (!acceso.ok) return { ok: false, mensaje: ERROR_ACCESO };
  if (!UUID.test(beneficioId)) return { ok: false, mensaje: "Beneficio inválido." };

  await desactivarBeneficio(acceso.programa.id, beneficioId);
  revalidatePath(`/portal/${codigo}/canjes`);
  return { ok: true };
}
