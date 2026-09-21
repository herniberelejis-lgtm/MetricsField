// Fórmula del cooldown de 20h para visitas repetidas, derivado del
// ledger — sin Redis (ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §5).
// Vive FUERA de lib/db/loyalty.ts a propósito: ese archivo importa
// lib/sql.ts y lib/sql-loyalty.ts, que tiran si faltan DATABASE_URL /
// LOYALTY_DATABASE_URL apenas se importan — poner esta función pura ahí
// la volvía imposible de testear sin una base configurada. Mismo motivo
// por el que hashearIp vivía separado en el extinto lib/loyalty-antifraude.ts.
//
// CONEXIONES
//   Depende de:  nada.
//   Lo usan:     lib/db/loyalty.ts (registrarVisita, la reexporta) ·
//                test/loyalty-ledger.test.ts (directo, sin pasar por
//                lib/db/loyalty.ts — así el test no necesita
//                LOYALTY_DATABASE_URL).

const VENTANA_COOLDOWN_SEGUNDOS = 20 * 60 * 60; // 20h

/** La `idem_clave` de una visita incluye la ventana horaria: dos visitas
 * de la MISMA membresía dentro de la MISMA ventana de 20h producen la
 * misma clave, así que la segunda choca contra el UNIQUE de
 * loyalty.movimientos y no inserta — el cooldown y la idempotencia son
 * el mismo mecanismo, sin una tabla ni un servicio aparte. */
export function claveIdempotenciaVisita(membresiaId: string, ahora: Date = new Date()): string {
  const ventana = Math.floor(ahora.getTime() / 1000 / VENTANA_COOLDOWN_SEGUNDOS);
  return `visita:${membresiaId}:${ventana}`;
}
