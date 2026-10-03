import { describe, expect, it } from "vitest";
import { limpiarValorEnv, permitir } from "@/lib/ratelimit";

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
