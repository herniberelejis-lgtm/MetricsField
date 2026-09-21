// Reglas puras del canje de puntos (docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §6).
// Sin acceso a la base ni a env vars, mismo criterio que cooldown.ts y
// sesion.ts: así se testea sin LOYALTY_DATABASE_URL. La parte
// transaccional (pedirCanje / confirmarCanje) vive en lib/db/loyalty.ts.
//
// CONEXIONES
//   Lo usan: lib/db/loyalty.ts (expiración y clave de idempotencia),
//            app/portal/[codigo]/canjes/* y app/(loyalty)/tarjeta/* (mensajes
//            y cuenta regresiva).

/** Un canje pedido y no confirmado vence a los 5 minutos: alcanza para
 * que el cliente llegue al mostrador, y es corto para que un canje
 * olvidado no quede "vivo" en la pantalla del comercio. */
export const CANJE_TTL_MS = 5 * 60 * 1000;

export function calcularExpiracionCanje(ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + CANJE_TTL_MS);
}

/** Segundos que le quedan a un canje, redondeado hacia arriba (con 0,4 s
 * de margen la pantalla todavía muestra 0:01, no 0:00) y nunca negativo. */
export function segundosRestantes(expiraEn: Date, ahora: Date = new Date()): number {
  const ms = expiraEn.getTime() - ahora.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 1000);
}

export function formatearCuentaRegresiva(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const min = Math.floor(s / 60);
  const resto = String(s % 60).padStart(2, "0");
  return `${min}:${resto}`;
}

/** Por qué no se pudo confirmar. `no_disponible` agrupa a propósito
 * inexistente / de otro comercio / ya entregado / vencido: distinguirlos
 * le diría a quien enumera IDs cuáles existen en otro comercio (plan L5).
 * `saldo_insuficiente` sí se distingue: el empleado necesita saber por
 * qué no puede entregar. */
export type MotivoFalloConfirmacion = "no_disponible" | "saldo_insuficiente";

export function mensajeFalloConfirmacion(motivo: MotivoFalloConfirmacion): string {
  if (motivo === "saldo_insuficiente") {
    return "Al cliente ya no le alcanzan los puntos para este beneficio.";
  }
  return "Este canje ya no está disponible (venció, ya se entregó o no existe).";
}

/** Clave del `UNIQUE` de loyalty.movimientos para el descuento de un
 * canje: confirmar dos veces el mismo canje descuenta una sola vez. */
export function claveIdempotenciaCanje(canjeId: string): string {
  return `canje:${canjeId}`;
}
