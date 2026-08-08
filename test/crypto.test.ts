import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { cifrar, descifrar } from "@/lib/crypto";

// Cifrado en reposo del refresh token de Google Business Profile de cada
// cliente. Con ese token se puede leer (y escribir) la ficha de Google del
// comercio hasta que lo revoque a mano — es el secreto más sensible que
// guarda la base.

const CLAVE = crypto.randomBytes(32).toString("hex");
const original = process.env.TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = original;
});

describe("con TOKEN_ENCRYPTION_KEY configurada", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = CLAVE;
  });

  it("ida y vuelta devuelve el mismo valor", () => {
    const token = "1//0abcDEF-refresh-token-de-google";
    expect(descifrar(cifrar(token))).toBe(token);
  });

  it("el texto cifrado no contiene el original", () => {
    const token = "1//0abcDEF-refresh-token-de-google";
    const c = cifrar(token);
    expect(c).not.toContain(token);
    expect(c.startsWith("enc1:")).toBe(true);
  });

  it("cifrar dos veces da resultados distintos (IV random)", () => {
    expect(cifrar("mismo-token")).not.toBe(cifrar("mismo-token"));
  });

  it("rechaza un texto cifrado manipulado (GCM autentica)", () => {
    const c = cifrar("token-real");
    const manipulado = c.slice(0, -2) + (c.slice(-2) === "00" ? "11" : "00");
    expect(() => descifrar(manipulado)).toThrow();
  });

  it("no puede descifrarse con otra clave", () => {
    const c = cifrar("token-real");
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    expect(() => descifrar(c)).toThrow();
  });

  it("una clave de largo incorrecto falla fuerte, no en silencio", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "abcd";
    expect(() => cifrar("x")).toThrow(/64 caracteres hex/);
  });
});

describe("sin TOKEN_ENCRYPTION_KEY (compatibilidad hacia atrás)", () => {
  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  it("cifrar es no-op para no romper un deploy sin la variable", () => {
    expect(cifrar("token-plano")).toBe("token-plano");
  });

  it("descifrar devuelve tal cual los tokens viejos sin prefijo", () => {
    expect(descifrar("token-guardado-antes")).toBe("token-guardado-antes");
  });

  it("avisa fuerte si hay un valor cifrado y se perdió la clave", () => {
    process.env.TOKEN_ENCRYPTION_KEY = CLAVE;
    const c = cifrar("token");
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => descifrar(c)).toThrow(/falta TOKEN_ENCRYPTION_KEY/);
  });
});
