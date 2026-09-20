import type { Plataforma } from "../db/loyalty";

// Import type-only: se borra en compilación, así que este archivo NO
// arrastra la dependencia de lib/sql.ts/lib/sql-loyalty.ts de
// lib/db/loyalty.ts — sigue siendo testeable sin DATABASE_URL.
//
// CONEXIONES
//   Depende de:  nada en runtime (el import de arriba es solo tipos).
//   Lo usan:     app/(loyalty)/l/[codigo]/actions.ts — para etiquetar
//                cada evento (`registrarEvento`) y decidir qué botón de
//                wallet mostrar tras el alta.

/** Detecta la plataforma desde el User-Agent. El piloto exige medir
 * tap→wallet SEPARADO por Android/iPhone — mirar solo el agregado no
 * permite saber si Apple realmente aportó o si Android sostenía el
 * promedio (ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md). También decide
 * qué botón de wallet mostrar en la landing. */
export function detectarPlataforma(userAgent: string): Plataforma {
  const ua = userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "otro";
}
