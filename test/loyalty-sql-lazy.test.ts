import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Regresión: lib/sql-loyalty.ts tiraba un error AL IMPORTARSE si faltaba
// LOYALTY_DATABASE_URL, y eso rompía el build entero de la app (también
// Reviews) en cualquier ambiente sin la variable — pasó con los Preview de
// Vercel. Ahora la conexión se crea en el primer uso. No necesita base.

vi.mock("server-only", () => ({}));

describe("sqlLoyalty (conexión perezosa)", () => {
  const original = process.env.LOYALTY_DATABASE_URL;

  beforeEach(() => {
    delete process.env.LOYALTY_DATABASE_URL;
    delete globalThis.__taplySqlLoyalty;
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.LOYALTY_DATABASE_URL;
    else process.env.LOYALTY_DATABASE_URL = original;
  });

  it("importar el módulo sin LOYALTY_DATABASE_URL no tira", async () => {
    await expect(import("@/lib/sql-loyalty")).resolves.toBeDefined();
  });

  it("usarlo sin la variable tira un error que nombra la variable que falta", async () => {
    const { sqlLoyalty } = await import("@/lib/sql-loyalty");
    await expect(async () => {
      await sqlLoyalty`select 1`;
    }).rejects.toThrow(/LOYALTY_DATABASE_URL/);
  });

  it("acceder a begin sin la variable también tira el mismo error claro", async () => {
    const { sqlLoyalty } = await import("@/lib/sql-loyalty");
    expect(() => sqlLoyalty.begin).toThrow(/LOYALTY_DATABASE_URL/);
  });
});
