"use server";

import { crearFeedback } from "@/lib/db";

// Server action pública (sin login): la usa cualquiera que toque un cartel
// y elija 1-3 estrellas. Sin rate-limit por IP todavía (ver README,
// sección Pendientes) — para el volumen de un cartel físico no es crítico,
// pero es lo primero a sumar si el sitio empieza a recibir tráfico externo.

export async function enviarFeedback(
  comercioId: string,
  estrellas: 1 | 2 | 3,
  texto: string,
  contacto: string,
): Promise<void> {
  const textoLimpio = texto.trim().slice(0, 2000);
  if (!textoLimpio) return;
  await crearFeedback(comercioId, {
    estrellas,
    texto: textoLimpio,
    contacto: contacto.trim().slice(0, 200) || null,
  });
}
