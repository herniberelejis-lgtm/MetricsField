import { describe, expect, it } from "vitest";
import { claveDeIp, ipDelRequest, limpiarValorEnv, permitir } from "@/lib/ratelimit";

// Sin Upstash configurado en los tests: el límite corre en memoria.

describe("limpiarValorEnv", () => {
  it("saca comillas envolventes pegadas en el panel de Vercel", () => {
    expect(limpiarValorEnv('"https://ejemplo.upstash.io"')).toBe("https://ejemplo.upstash.io");
    expect(limpiarValorEnv("'abc123'")).toBe("abc123");
    expect(limpiarValorEnv('  "https://ejemplo.upstash.io"\n')).toBe("https://ejemplo.upstash.io");
  });

  it("no toca valores sin comillas ni comillas desparejas", () => {
    expect(limpiarValorEnv("https://ejemplo.upstash.io")).toBe("https://ejemplo.upstash.io");
    expect(limpiarValorEnv('"abc')).toBe('"abc');
    expect(limpiarValorEnv("a\"b\"c")).toBe('a"b"c');
  });

  it("vacío o sin definir da cadena vacía", () => {
    expect(limpiarValorEnv(undefined)).toBe("");
    expect(limpiarValorEnv('""')).toBe("");
    expect(limpiarValorEnv("   ")).toBe("");
  });
});

describe("permitir (en memoria)", () => {
  it("corta al pasar el máximo dentro de la ventana", async () => {
    const clave = `test:${Math.random()}`;
    expect(await permitir(clave, 2, 60_000)).toBe(true);
    expect(await permitir(clave, 2, 60_000)).toBe(true);
    expect(await permitir(clave, 2, 60_000)).toBe(false);
  });
});

describe("claveDeIp", () => {
  it("IPv4 queda igual", () => {
    expect(claveDeIp("190.12.3.4")).toBe("190.12.3.4");
    expect(claveDeIp("::ffff:190.12.3.4")).toBe("190.12.3.4");
  });

  it("IPv6 se agrupa por /64: rotar dentro del mismo prefijo no da otra clave", () => {
    const a = claveDeIp("2001:db8:aa:1:1111:2222:3333:4444");
    const b = claveDeIp("2001:0db8:00aa:0001::9");
    expect(a).toBe("2001:db8:aa:1::/64");
    expect(b).toBe(a);
    expect(claveDeIp("[2001:db8:aa:2::1]")).not.toBe(a);
  });

  it("formas raras no rompen: se usan tal cual", () => {
    expect(claveDeIp("::1")).toBe("0:0:0:0::/64");
    expect(claveDeIp("desconocida")).toBe("desconocida");
    expect(claveDeIp("no:es:una:ip")).toBe("no:es:una:ip");
  });

  it("ipDelRequest aplica la agrupación", () => {
    const h = new Headers({ "x-real-ip": "2001:db8:aa:1:ffff::1" });
    expect(ipDelRequest(h)).toBe("2001:db8:aa:1::/64");
  });
});
