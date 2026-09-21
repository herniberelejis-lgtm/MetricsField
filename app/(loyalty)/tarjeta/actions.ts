"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerMembresiaPorTokenHash, pedirCanje, registrarEvento } from "@/lib/db/loyalty";
import { hashToken, hmacIp } from "@/lib/loyalty/identidad";
import { NOMBRE_COOKIE_MEMBRESIA, tokenConFormaValida } from "@/lib/loyalty/sesion";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

// CONEXIONES
//   Lo invoca:   app/(loyalty)/tarjeta/page.tsx (<form action={...}>)
//   Escribe en:  loyalty.canjes y loyalty.eventos (vía lib/db/loyalty.ts)
//   NO descuenta puntos: eso ocurre recién cuando el comercio confirma la
//   entrega (app/portal/[codigo]/canjes/actions.ts).
//   Vuelve a /tarjeta con ?canje=<resultado>: la página muestra el mensaje.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PEDIDOS_POR_HORA = 10;

export async function pedirCanjeAction(formData: FormData): Promise<void> {
  const beneficioId = String(formData.get("beneficioId") ?? "");

  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`loyalty-canje:${ip}`, MAX_PEDIDOS_POR_HORA, 60 * 60_000))) {
    redirect("/tarjeta?canje=demasiados");
  }

  // La membresía sale SIEMPRE de la cookie, nunca del formulario: nada de
  // lo que manda el navegador decide de quién es el canje ni de qué comercio.
  const token = (await cookies()).get(NOMBRE_COOKIE_MEMBRESIA)?.value;
  if (!tokenConFormaValida(token) || !UUID.test(beneficioId)) redirect("/tarjeta");

  const membresia = await obtenerMembresiaPorTokenHash(hashToken(token));
  if (!membresia) redirect("/tarjeta");

  const resultado = await pedirCanje({
    membresiaId: membresia.id,
    programaId: membresia.programaId,
    beneficioId,
  });

  if (!resultado.ok) redirect(`/tarjeta?canje=${resultado.motivo}`);

  await registrarEvento({
    programaId: membresia.programaId,
    membresiaId: membresia.id,
    tipo: "canje_pedido",
    ipHmac: hmacIp(ip),
  });
  redirect("/tarjeta?canje=pedido");
}
