import "server-only";
import crypto from "node:crypto";
import { permitir } from "./ratelimit";

// Lógica de antifraude Nivel 1 del módulo Loyalty. Vive separada de
// lib/db/loyalty.ts a propósito: ese archivo importa lib/sql.ts, que tira
// si falta DATABASE_URL — apenas se importe, no al llamarlo. Nada acá toca
// la base (hashearIp es puro, verificarCooldownTap solo usa
// lib/ratelimit.ts), así que este archivo sí se puede testear sin una base
// configurada, igual que el resto del test/ del repo.

export type TipoEventoLoyalty =
  | "tap"
  | "registro"
  | "wallet_guardada"
  | "mision_completada"
  | "canje_validado"
  | "cooldown_bloqueado";

/** Hash de IP para eventos_loyalty — nunca se guarda la IP en texto plano
 * (ver comentario de la migración 011). SHA-256 simple: no hace falta un
 * salt por-registro, el objetivo es no poder revertir a la IP real desde
 * la base, no autenticar con esto. */
export function hashearIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

const COOLDOWN_TAP_MS = 20 * 60 * 60 * 1000; // 20h — ver sección 8 del doc de antifraude

/** Antifraude Nivel 1: máximo un tap-que-otorga-sello por cliente y
 * comercio cada 20h. Reusa lib/ratelimit.ts (Upstash si está configurado,
 * memoria si no) en vez de un mecanismo propio — mismo helper que ya usa
 * /t/[slug] para el límite anti-DoS. Devuelve false si hay que bloquear
 * (mostrar "ya sumaste tu sello hoy" en vez de acreditar puntos). Esto NO
 * bloquea el acceso del cliente a nada — solo el segundo premio del día,
 * que es una categoría de riesgo distinta al "nunca bloquear un tap real"
 * que rige para Reviews (ver docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html). */
export async function verificarCooldownTap(clienteFinalId: string, comercioId: string): Promise<boolean> {
  return permitir(`loyalty-tap:${clienteFinalId}:${comercioId}`, 1, COOLDOWN_TAP_MS);
}
