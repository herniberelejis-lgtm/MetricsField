import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  generarToken,
  hashToken,
  normalizarTelefono,
  hmacTelefono,
  cifrar,
  descifrar,
  hmacIp,
} from "@/lib/loyalty/identidad";

// Primitivas de identidad de Loyalty: la membresía es la credencial (no
// el teléfono), y el teléfono/nombre/email/IP se guardan cifrados o con
// índice ciego, nunca en texto plano. Ver
// docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §2, §4 y §8.

const CLAVE_PII = crypto.randomBytes(32).toString("base64");
const PEPPER_IP = crypto.randomBytes(32).toString("base64");
const originalPii = process.env.LOYALTY_PII_KEY;
const originalPepper = process.env.LOYALTY_IP_PEPPER;

beforeEach(() => {
  process.env.LOYALTY_PII_KEY = CLAVE_PII;
  process.env.LOYALTY_IP_PEPPER = PEPPER_IP;
});

afterEach(() => {
  if (originalPii === undefined) delete process.env.LOYALTY_PII_KEY;
  else process.env.LOYALTY_PII_KEY = originalPii;
  if (originalPepper === undefined) delete process.env.LOYALTY_IP_PEPPER;
  else process.env.LOYALTY_IP_PEPPER = originalPepper;
});

describe("generarToken", () => {
  it("produce un token distinto en cada llamada", () => {
    expect(generarToken()).not.toBe(generarToken());
  });

  it("tiene la forma base64url de 32 bytes (43 caracteres, sin padding)", () => {
    const token = generarToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("hashToken", () => {
  it("tokens distintos no colisionan", () => {
    expect(hashToken(generarToken())).not.toEqual(hashToken(generarToken()));
  });

  it("el mismo token siempre da el mismo hash", () => {
    const token = generarToken();
    expect(hashToken(token)).toEqual(hashToken(token));
  });

  it("el token no aparece en el hash", () => {
    const token = generarToken();
    const hashHex = hashToken(token).toString("hex");
    expect(hashHex).not.toContain(token);
  });

  it("es un Buffer de 32 bytes (SHA-256)", () => {
    expect(hashToken(generarToken())).toHaveLength(32);
  });
});

describe("normalizarTelefono", () => {
  // Todos estos representan la MISMA persona (351 555 1234, celular de
  // Córdoba) escrita de seis formas distintas que un cliente real tipearía.
  const formatos = [
    "351 555 1234",
    "+543515551234",
    "03515551234",
    "+5493515551234",
    "5493515551234",
    "9 3515551234",
  ];

  it.each(formatos)("normaliza \"%s\" al mismo E.164 con marcador de celular", (entrada) => {
    expect(normalizarTelefono(entrada)).toBe("+5493515551234");
  });

  it("todos los formatos anteriores resuelven al mismo valor entre sí", () => {
    const normalizados = new Set(formatos.map(normalizarTelefono));
    expect(normalizados.size).toBe(1);
  });

  it("rechaza un teléfono con menos dígitos de los esperados", () => {
    expect(() => normalizarTelefono("123")).toThrow(/inválido/);
  });

  it("rechaza un teléfono con más dígitos de los esperados", () => {
    expect(() => normalizarTelefono("1".repeat(20))).toThrow(/inválido/);
  });
});

describe("hmacTelefono", () => {
  it("es determinístico: el mismo teléfono da el mismo hmac", () => {
    const tel = normalizarTelefono("351 555 1234");
    expect(hmacTelefono(tel)).toEqual(hmacTelefono(tel));
  });

  it("teléfonos distintos dan hmacs distintos", () => {
    expect(hmacTelefono("+5493515551234")).not.toEqual(hmacTelefono("+5493515559999"));
  });

  it("cambia si cambia LOYALTY_PII_KEY", () => {
    const tel = "+5493515551234";
    const hmacOriginal = hmacTelefono(tel);
    process.env.LOYALTY_PII_KEY = crypto.randomBytes(32).toString("base64");
    expect(hmacTelefono(tel)).not.toEqual(hmacOriginal);
  });

  it("tira un error claro si falta LOYALTY_PII_KEY", () => {
    delete process.env.LOYALTY_PII_KEY;
    expect(() => hmacTelefono("+5493515551234")).toThrow(/LOYALTY_PII_KEY/);
  });
});

describe("cifrar / descifrar", () => {
  it("ida y vuelta devuelve el mismo valor", () => {
    const original = "Juan Pérez";
    expect(descifrar(cifrar(original))).toBe(original);
  });

  it("cifrar el mismo texto dos veces da resultados distintos (IV random)", () => {
    expect(cifrar("mismo-nombre")).not.toEqual(cifrar("mismo-nombre"));
  });

  it("rechaza un valor cifrado manipulado (GCM autentica)", () => {
    const c = cifrar("dato-sensible");
    c[c.length - 1] ^= 0xff; // flipear el último byte del ciphertext
    expect(() => descifrar(c)).toThrow();
  });

  it("no puede descifrarse con otra clave", () => {
    const c = cifrar("dato-sensible");
    process.env.LOYALTY_PII_KEY = crypto.randomBytes(32).toString("base64");
    expect(() => descifrar(c)).toThrow();
  });

  it("tira un error claro si falta LOYALTY_PII_KEY", () => {
    delete process.env.LOYALTY_PII_KEY;
    expect(() => cifrar("x")).toThrow(/LOYALTY_PII_KEY/);
  });
});

describe("hmacIp", () => {
  it("es determinístico", () => {
    expect(hmacIp("190.191.1.1")).toEqual(hmacIp("190.191.1.1"));
  });

  it("IPs distintas dan hmacs distintos", () => {
    expect(hmacIp("190.191.1.1")).not.toEqual(hmacIp("190.191.1.2"));
  });

  it("usa una clave separada de LOYALTY_PII_KEY (cambiar una no afecta a la otra)", () => {
    const ip = "190.191.1.1";
    const hmacOriginal = hmacIp(ip);
    process.env.LOYALTY_PII_KEY = crypto.randomBytes(32).toString("base64");
    expect(hmacIp(ip)).toEqual(hmacOriginal);
  });

  it("tira un error claro si falta LOYALTY_IP_PEPPER", () => {
    delete process.env.LOYALTY_IP_PEPPER;
    expect(() => hmacIp("190.191.1.1")).toThrow(/LOYALTY_IP_PEPPER/);
  });
});
