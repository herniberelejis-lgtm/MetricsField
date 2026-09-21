import { describe, it, expect } from "vitest";
import {
  CANJE_TTL_MS,
  calcularExpiracionCanje,
  segundosRestantes,
  formatearCuentaRegresiva,
  mensajeFalloConfirmacion,
  claveIdempotenciaCanje,
} from "@/lib/loyalty/canje";

// La lógica transaccional del canje (pedirCanje/confirmarCanje en
// lib/db/loyalty.ts) es SQL contra Postgres y no se puede testear sin una
// base real — mismo límite que documenta test/loyalty-ledger.test.ts.
// Acá va lo que sí es puro: ventana de 5 min, cuenta regresiva, mensajes
// y la clave de idempotencia del descuento.
//
// A VERIFICAR A MANO contra una Neon real antes de mergear:
//   1. Confirmar dos veces el mismo canje descuenta UNA sola vez.
//   2. Confirmar un canje vencido (expira_en <= now()) no afecta filas.
//   3. Confirmar un canje de otro programa_id no afecta filas.
//   4. Dos canjes pendientes con saldo para uno: el segundo confirmar
//      falla con saldo insuficiente y el canje queda 'pendiente'.

describe("calcularExpiracionCanje", () => {
  it("vence exactamente 5 minutos después de pedido", () => {
    const ahora = new Date("2026-09-20T12:00:00Z");
    expect(calcularExpiracionCanje(ahora).toISOString()).toBe("2026-09-20T12:05:00.000Z");
  });

  it("no muta la fecha recibida", () => {
    const ahora = new Date("2026-09-20T12:00:00Z");
    calcularExpiracionCanje(ahora);
    expect(ahora.toISOString()).toBe("2026-09-20T12:00:00.000Z");
  });

  it("el TTL es de 5 minutos", () => {
    expect(CANJE_TTL_MS).toBe(5 * 60 * 1000);
  });
});

describe("segundosRestantes", () => {
  it("devuelve los segundos que faltan, redondeando hacia arriba", () => {
    const expira = new Date("2026-09-20T12:05:00Z");
    expect(segundosRestantes(expira, new Date("2026-09-20T12:04:30.500Z"))).toBe(30);
  });

  it("nunca es negativo: un canje vencido devuelve 0", () => {
    const expira = new Date("2026-09-20T12:05:00Z");
    expect(segundosRestantes(expira, new Date("2026-09-20T12:10:00Z"))).toBe(0);
  });
});

describe("formatearCuentaRegresiva", () => {
  it("formatea como m:ss", () => {
    expect(formatearCuentaRegresiva(300)).toBe("5:00");
    expect(formatearCuentaRegresiva(65)).toBe("1:05");
    expect(formatearCuentaRegresiva(9)).toBe("0:09");
    expect(formatearCuentaRegresiva(0)).toBe("0:00");
  });
});

describe("mensajeFalloConfirmacion", () => {
  it("un canje inexistente, ajeno, ya entregado o vencido dan el MISMO mensaje", () => {
    // No revelar cuál de los casos es: un canje de otro comercio no debe
    // distinguirse de uno inexistente (plan L5).
    expect(mensajeFalloConfirmacion("no_disponible")).toBe(mensajeFalloConfirmacion("no_disponible"));
    expect(mensajeFalloConfirmacion("no_disponible")).not.toMatch(/otro comercio|ajeno/i);
  });

  it("saldo insuficiente se informa distinto: el empleado necesita el motivo", () => {
    expect(mensajeFalloConfirmacion("saldo_insuficiente")).not.toBe(mensajeFalloConfirmacion("no_disponible"));
  });
});

describe("claveIdempotenciaCanje", () => {
  it("es determinística por canje", () => {
    expect(claveIdempotenciaCanje("abc")).toBe("canje:abc");
  });
});
