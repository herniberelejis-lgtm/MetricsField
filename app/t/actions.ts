"use server";

import { headers } from "next/headers";
import { crearFeedback, existeComercio } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

// Server action pública (sin login): la usa cualquiera que toque un cartel
// y elija 1-3 estrellas. Con rate limit por IP para frenar spam.

export async function enviarFeedback(
  comercioId: string,
  estrellas: number,
  texto: string,
  contacto: string,
): Promise<{ ok: boolean; error?: string }> {
  // Validación del lado servidor: nunca confiar en lo que manda el cliente.
  const e = Math.round(Number(estrellas));
  if (![1, 2, 3].includes(e)) {
    return { ok: false, error: "Calificación inválida." };
  }
  const textoLimpio = String(texto ?? "").trim().slice(0, 2000);
  if (!textoLimpio) return { ok: false, error: "Contanos qué pasó." };

  // Rate limit: máx 5 envíos por IP cada 10 minutos.
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!permitir(`feedback:${ip}`, 5, 10 * 60_000)) {
    return { ok: false, error: "Demasiados envíos. Probá de nuevo en un rato." };
  }

  // El comercioId viene del cliente: verificar que exista antes de insertar
  // (un id inexistente rompía contra la FK con un 500; uno inventado no debe
  // poder inyectar feedback falso a cualquier comercio).
  if (!(await existeComercio(comercioId))) {
    return { ok: false, error: "Comercio inválido." };
  }

  await crearFeedback(comercioId, {
    estrellas: e as 1 | 2 | 3,
    texto: textoLimpio,
    contacto: String(contacto ?? "").trim().slice(0, 200) || null,
  });
  return { ok: true };
}
