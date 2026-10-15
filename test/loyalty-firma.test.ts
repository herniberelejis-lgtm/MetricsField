import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  VISITA_MS,
  crearCookieClienteFinal,
  crearTokenTarjeta,
  crearTokenVisita,
  leerCookieClienteFinal,
  leerTokenTarjeta,
  normalizarTelefono,
  tokenVisitaValido,
} from "@/lib/loyalty-firma";
import { hashearIp } from "@/lib/loyalty-antifraude";

// Estas firmas SON el acceso del cliente final a su tarjeta y a sus puntos.
// Si una se pone en rojo: alguien puede entrar a la tarjeta de otro, o
// sumar puntos sin tocar el cartel.

beforeEach(() => {
  vi.stubEnv("LOYALTY_PII_KEY", "clave-de-prueba");
  vi.stubEnv("NODE_ENV", "production");
});
afterEach(() => vi.unstubAllEnvs());

describe("sesión del cliente final", () => {
  it("devuelve el id que firmó", () => {
    expect(leerCookieClienteFinal(crearCookieClienteFinal("cf-1"))).toBe("cf-1");
  });

  it("no se puede cambiar el id por el de otra persona", () => {
    const [, exp, firma] = crearCookieClienteFinal("cf-1").split(".");
    expect(leerCookieClienteFinal(`cf-2.${exp}.${firma}`)).toBeNull();
  });

  it("no se puede estirar el vencimiento", () => {
    const [id, exp, firma] = crearCookieClienteFinal("cf-1").split(".");
    expect(leerCookieClienteFinal(`${id}.${Number(exp) + 1000}.${firma}`)).toBeNull();
  });

  it("vence", () => {
    const ahora = Date.now();
    const cookie = crearCookieClienteFinal("cf-1", ahora);
    expect(leerCookieClienteFinal(cookie, ahora + 366 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("firmada con otra clave no vale", () => {
    const cookie = crearCookieClienteFinal("cf-1");
    vi.stubEnv("LOYALTY_PII_KEY", "otra-clave");
    expect(leerCookieClienteFinal(cookie)).toBeNull();
  });

  it("en producción sin clave no firma ni valida nada (falla cerrado)", () => {
    const cookie = crearCookieClienteFinal("cf-1");
    vi.stubEnv("LOYALTY_PII_KEY", "");
    expect(leerCookieClienteFinal(cookie)).toBeNull();
    expect(() => crearCookieClienteFinal("cf-1")).toThrow(/LOYALTY_PII_KEY/);
  });

  it("rechaza basura sin explotar", () => {
    for (const malo of [undefined, "", ".", "a.b", "a.b.c.d", "a.NaN.x"]) {
      expect(leerCookieClienteFinal(malo)).toBeNull();
    }
  });
});

describe("token de visita (tap real en el cartel)", () => {
  it("vale para ese comercio durante 15 minutos", () => {
    const ahora = Date.now();
    const token = crearTokenVisita("cafe-a", ahora);
    expect(tokenVisitaValido(token, "cafe-a", ahora + VISITA_MS - 1000)).toBe(true);
    expect(tokenVisitaValido(token, "cafe-a", ahora + VISITA_MS + 1000)).toBe(false);
  });

  it("el token de un comercio no suma puntos en otro", () => {
    expect(tokenVisitaValido(crearTokenVisita("cafe-a"), "cafe-b")).toBe(false);
  });

  it("no se puede renovar cambiando la hora", () => {
    const ahora = Date.now();
    const [, firma] = crearTokenVisita("cafe-a", ahora - VISITA_MS * 2).split(".");
    expect(tokenVisitaValido(`${ahora}.${firma}`, "cafe-a", ahora)).toBe(false);
  });

  it("no acepta tokens del futuro", () => {
    const ahora = Date.now();
    expect(tokenVisitaValido(crearTokenVisita("cafe-a", ahora + 10 * 60_000), "cafe-a", ahora)).toBe(false);
  });

  it("sin token, no hay visita", () => {
    expect(tokenVisitaValido(undefined, "cafe-a")).toBe(false);
    expect(tokenVisitaValido("123", "cafe-a")).toBe(false);
  });
});

describe("link de la tarjeta (dentro del pase de Wallet)", () => {
  it("devuelve la membresía que firmó", () => {
    expect(leerTokenTarjeta(crearTokenTarjeta("m-1"))).toBe("m-1");
  });

  it("no sirve para entrar a otra membresía", () => {
    const [, firma] = crearTokenTarjeta("m-1").split(".");
    expect(leerTokenTarjeta(`m-2.${firma}`)).toBeNull();
  });

  it("una cookie de sesión no vale como link de tarjeta (prefijos distintos)", () => {
    expect(leerTokenTarjeta(crearCookieClienteFinal("m-1"))).toBeNull();
  });
});

describe("normalizarTelefono", () => {
  it("las formas comunes de escribir el mismo celular dan el mismo número", () => {
    const formas = ["351 555-1234", "0351 15 555 1234", "+54 9 351 555 1234", "5493515551234", "(0351) 155551234"];
    for (const f of formas) expect(normalizarTelefono(f)).toBe("3515551234");
  });

  it("Buenos Aires con 15", () => {
    expect(normalizarTelefono("011 15 2345 6789")).toBe("1123456789");
  });

  it("números de otro país quedan tal cual", () => {
    expect(normalizarTelefono("+1 415 555 0100")).toBe("14155550100");
  });

  it("rechaza lo que no es un teléfono", () => {
    for (const malo of ["", "123", "hola", "1".repeat(20)]) expect(normalizarTelefono(malo)).toBeNull();
  });
});

describe("hashearIp con pepper", () => {
  it("con LOYALTY_IP_PEPPER no es el SHA-256 pelado (que se revierte probando todas las IPv4)", () => {
    const sinPepper = hashearIp("190.191.1.1");
    vi.stubEnv("LOYALTY_IP_PEPPER", "pepper-de-prueba");
    const conPepper = hashearIp("190.191.1.1");
    expect(conPepper).toMatch(/^[0-9a-f]{64}$/);
    expect(conPepper).not.toBe(sinPepper);
  });
});
