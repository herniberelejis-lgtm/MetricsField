import { describe, it, expect } from "vitest";
import { hashearIp } from "@/lib/loyalty-antifraude";

// hashearIp es la pieza que corrige la limitación ya documentada de la
// tabla `taps` (no guarda IP ni nada revisable días después) sin volver a
// guardar la IP en texto plano — ver docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html.

describe("hashearIp", () => {
  it("la misma IP siempre da el mismo hash (permite comparar sin descifrar)", () => {
    expect(hashearIp("190.191.1.1")).toBe(hashearIp("190.191.1.1"));
  });

  it("IPs distintas dan hashes distintos", () => {
    expect(hashearIp("190.191.1.1")).not.toBe(hashearIp("190.191.1.2"));
  });

  it("el hash no contiene la IP original", () => {
    const ip = "190.191.1.1";
    expect(hashearIp(ip)).not.toContain(ip);
  });

  it("es hex de 64 caracteres (SHA-256)", () => {
    expect(hashearIp("190.191.1.1")).toMatch(/^[0-9a-f]{64}$/);
  });
});
