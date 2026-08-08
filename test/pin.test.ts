import { describe, it, expect } from "vitest";
import { pinValido, hashearPin, pinCoincide } from "@/lib/pin";

// El PIN es la única credencial de las piezas autogestionadas (canal Mercado
// Libre): con él se cambia a dónde redirige un cartel ya impreso y en la
// calle. Si esto se rompe, un tercero puede apuntar el cartel de otro a
// donde quiera.

describe("pinValido", () => {
  it("acepta de 4 a 8 dígitos", () => {
    for (const pin of ["1234", "12345", "12345678"]) {
      expect(pinValido(pin)).toBe(true);
    }
  });

  it("rechaza lo que no sea exactamente dígitos", () => {
    for (const pin of ["123", "123456789", "", "12a4", "12 34", "1234\n", " 1234", "١٢٣٤"]) {
      expect(pinValido(pin)).toBe(false);
    }
  });

  it("no se deja pasar por un salto de línea (regex anclada)", () => {
    // Con /^\d{4,8}$/ sin la flag m, "1234\nrm -rf" no debe pasar.
    expect(pinValido("1234\nlo-que-sea")).toBe(false);
  });
});

describe("hashearPin / pinCoincide", () => {
  it("acepta el PIN correcto", () => {
    const { hash, salt } = hashearPin("482910");
    expect(pinCoincide("482910", hash, salt)).toBe(true);
  });

  it("rechaza cualquier otro PIN", () => {
    const { hash, salt } = hashearPin("482910");
    for (const otro of ["482911", "48291", "4829100", "000000", ""]) {
      expect(pinCoincide(otro, hash, salt)).toBe(false);
    }
  });

  it("nunca guarda el PIN en texto plano", () => {
    const { hash, salt } = hashearPin("482910");
    expect(hash).not.toContain("482910");
    expect(salt).not.toContain("482910");
  });

  it("usa un salt distinto cada vez (dos PIN iguales no comparten hash)", () => {
    const a = hashearPin("1234");
    const b = hashearPin("1234");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    // …y cada uno sigue validando con SU propio salt
    expect(pinCoincide("1234", a.hash, a.salt)).toBe(true);
    expect(pinCoincide("1234", b.hash, b.salt)).toBe(true);
  });

  it("no valida contra un hash de largo distinto en vez de tirar excepción", () => {
    const { salt } = hashearPin("1234");
    expect(pinCoincide("1234", "aabb", salt)).toBe(false);
  });
});
