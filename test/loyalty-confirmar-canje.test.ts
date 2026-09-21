import { describe, it, expect, vi, beforeEach } from "vitest";

// Flujo de control de confirmarCanje con la base MOCKEADA. Esto NO prueba
// el SQL (que el UPDATE condicional bloquee la fila, que el UNIQUE de
// idem_clave rechace duplicados, etc. — eso solo se verifica contra una
// Neon real, ver test/loyalty-canje.test.ts). Prueba lo que sí es lógica
// nuestra: que con 0 filas NO se toque el ledger, que el descuento use la
// clave 'canje:<id>', que el alcance por programa viaje en la consulta y
// que cada falla del ledger se traduzca al motivo correcto.

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sql", () => ({ sql: vi.fn() }));

type Llamada = { texto: string; valores: unknown[] };
const llamadas: Llamada[] = [];
let respuestas: unknown[][] = [];

function tx(strings: TemplateStringsArray, ...valores: unknown[]): Promise<unknown[]> {
  llamadas.push({ texto: strings.join("?"), valores });
  return Promise.resolve(respuestas.shift() ?? []);
}

vi.mock("@/lib/sql-loyalty", () => ({
  sqlLoyalty: Object.assign(vi.fn(), {
    // begin() real: si el callback lanza, revierte y relanza. Acá alcanza
    // con propagar la excepción.
    begin: async (cb: (t: typeof tx) => unknown) => cb(tx),
    json: (v: unknown) => v,
  }),
}));

import { confirmarCanje } from "@/lib/db/loyalty";

const CANJE = "11111111-1111-4111-8111-111111111111";
const PROGRAMA = "22222222-2222-4222-8222-222222222222";
const MEMBRESIA = "33333333-3333-4333-8333-333333333333";
const EMPLEADO = "empleado@comercio.com";

beforeEach(() => {
  llamadas.length = 0;
  respuestas = [];
});

describe("confirmarCanje", () => {
  it("confirma y descuenta el costo congelado con la clave canje:<id>", async () => {
    respuestas = [
      [{ membresia_id: MEMBRESIA, costo_puntos: 50 }], // UPDATE canjes
      [{ saldo: 30 }], //                                UPDATE membresias
      [{ id: 1 }], //                                    INSERT movimientos
    ];

    const r = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });

    expect(r).toEqual({ ok: true, saldo: 30 });
    expect(llamadas).toHaveLength(3);
    // Descuento: delta negativo por el costo congelado en el canje, no por
    // el precio actual del beneficio.
    expect(llamadas[1].valores).toContain(-50);
    // Idempotencia + traza del empleado en el ledger.
    expect(llamadas[2].valores).toContain(`canje:${CANJE}`);
    expect(llamadas[2].valores).toContain(EMPLEADO);
    expect(llamadas[2].valores).toContain("canje");
  });

  it("el UPDATE del canje va acotado al programa de la sesión y guarda quién confirmó", async () => {
    respuestas = [[{ membresia_id: MEMBRESIA, costo_puntos: 50 }], [{ saldo: 0 }], [{ id: 1 }]];

    await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });

    const update = llamadas[0];
    expect(update.texto).toMatch(/programa_id\s*=\s*\?/);
    expect(update.texto).toMatch(/estado\s*=\s*'pendiente'/);
    expect(update.texto).toMatch(/expira_en\s*>\s*now\(\)/);
    expect(update.valores).toEqual(expect.arrayContaining([CANJE, PROGRAMA, EMPLEADO]));
  });

  it("confirmar dos veces: la segunda no encuentra el canje y NO toca el ledger", async () => {
    // Primera confirmación: éxito.
    respuestas = [[{ membresia_id: MEMBRESIA, costo_puntos: 50 }], [{ saldo: 30 }], [{ id: 1 }]];
    const primera = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });
    expect(primera.ok).toBe(true);

    // Segunda: el UPDATE ya no matchea (estado != 'pendiente') → 0 filas.
    llamadas.length = 0;
    respuestas = [[]];
    const segunda = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });

    expect(segunda).toEqual({ ok: false, motivo: "no_disponible" });
    expect(llamadas).toHaveLength(1); // solo el UPDATE del canje: ni saldo ni movimientos
  });

  it("un canje de otro comercio / vencido / inexistente responde igual: no_disponible", async () => {
    respuestas = [[]];
    const r = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });
    expect(r).toEqual({ ok: false, motivo: "no_disponible" });
  });

  it("si al cliente ya no le alcanza el saldo, informa saldo_insuficiente", async () => {
    respuestas = [
      [{ membresia_id: MEMBRESIA, costo_puntos: 50 }], // UPDATE canjes
      [], //                                             UPDATE membresias: saldo + delta < 0 → 0 filas
    ];

    const r = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });

    expect(r).toEqual({ ok: false, motivo: "saldo_insuficiente" });
    // No llegó a insertar en el ledger.
    expect(llamadas).toHaveLength(2);
  });

  it("si la clave de idempotencia ya existía, no descuenta de nuevo: no_disponible", async () => {
    respuestas = [
      [{ membresia_id: MEMBRESIA, costo_puntos: 50 }],
      [{ saldo: 30 }],
      [], // INSERT ... ON CONFLICT DO NOTHING → 0 filas
    ];

    const r = await confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO });

    expect(r).toEqual({ ok: false, motivo: "no_disponible" });
  });

  it("un error inesperado de la base se propaga, no se disfraza de motivo", async () => {
    const { sqlLoyalty } = await import("@/lib/sql-loyalty");
    const begin = vi
      .spyOn(sqlLoyalty as unknown as { begin: () => unknown }, "begin")
      .mockRejectedValueOnce(new Error("conexión caída"));

    await expect(
      confirmarCanje({ canjeId: CANJE, programaId: PROGRAMA, confirmadoPor: EMPLEADO }),
    ).rejects.toThrow("conexión caída");

    begin.mockRestore();
  });
});
