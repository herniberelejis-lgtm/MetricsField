import { describe, it, expect } from "vitest";
import { claveIdempotenciaVisita } from "@/lib/loyalty/cooldown";

// El motor de puntos (lib/db/loyalty.ts) es, casi en su totalidad, SQL
// ejecutado contra Postgres: no hay lógica pura que testear sin una base
// real, salvo claveIdempotenciaVisita — por eso vive en su propio archivo
// (lib/loyalty/cooldown.ts) sin importar lib/sql.ts ni lib/sql-loyalty.ts,
// que tiran si faltan DATABASE_URL/LOYALTY_DATABASE_URL apenas se
// importan. Es también la pieza que hace de cooldown de 20h sin Redis
// (ver docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §5): dos visitas de la
// misma membresía en la misma ventana producen la misma clave, y el
// UNIQUE de idem_clave en loyalty.movimientos hace el resto.
//
// LO QUE ESTO **NO** CUBRE, y necesita verificarse a mano contra una
// Neon real antes de mergear (no hay Postgres disponible en este
// entorno de desarrollo — ver docs/LOYALTY-PLAN-IMPLEMENTACION.md, nota
// de L3):
//   1. registrarMovimiento: que el UPDATE condicional en membresias.saldo
//      efectivamente bloquea la fila y nunca deja saldo negativo bajo
//      dos requests concurrentes con el mismo saldo justo.
//   2. registrarMovimiento: que reenviar la misma idem_clave devuelve
//      { aplicado: false } con el saldo real, sin duplicar el ledger.
//   3. obtenerOCrearMembresia: que dos altas simultáneas del mismo
//      (cliente_id, programa_id) no violan el UNIQUE ni se pisan.
//   4. upsertCliente: que el ON CONFLICT actualiza los campos cifrados
//      sin duplicar la fila de loyalty.clientes.

describe("claveIdempotenciaVisita", () => {
  it("dos visitas de la misma membresía en el mismo instante caen en la misma ventana", () => {
    const ahora = new Date("2026-09-19T10:00:00Z");
    expect(claveIdempotenciaVisita("membresia-1", ahora)).toBe(claveIdempotenciaVisita("membresia-1", ahora));
  });

  it("dos visitas separadas por menos de 20h caen en la misma ventana", () => {
    const t1 = new Date("2026-09-19T10:00:00Z");
    const t2 = new Date("2026-09-19T15:00:00Z"); // +5h
    expect(claveIdempotenciaVisita("membresia-1", t1)).toBe(claveIdempotenciaVisita("membresia-1", t2));
  });

  it("dos visitas separadas por más de 20h caen en ventanas distintas", () => {
    const t1 = new Date("2026-09-19T00:00:00Z");
    const t2 = new Date("2026-09-20T01:00:00Z"); // +25h
    expect(claveIdempotenciaVisita("membresia-1", t1)).not.toBe(claveIdempotenciaVisita("membresia-1", t2));
  });

  it("membresías distintas nunca comparten clave, aun en el mismo instante", () => {
    const ahora = new Date("2026-09-19T10:00:00Z");
    expect(claveIdempotenciaVisita("membresia-1", ahora)).not.toBe(claveIdempotenciaVisita("membresia-2", ahora));
  });

  it("la clave incluye el prefijo 'visita:' (namespace del motivo en el ledger)", () => {
    expect(claveIdempotenciaVisita("membresia-1")).toMatch(/^visita:membresia-1:\d+$/);
  });
});
