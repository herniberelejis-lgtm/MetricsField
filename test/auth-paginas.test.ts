import { globSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// C1 y C3 del security audit 2026-10. Las páginas de /admin solo dependían
// del middleware, que verifica firma y vencimiento pero no puede consultar
// la allowlist: un admin sacado de /admin/administradores seguía viendo el
// panel 30 días, y una cookie del portal copiada con otro nombre lo abría.
// asegurarAdminPagina() re-chequea la allowlist en cada render.

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (jar.has(nombre) ? { value: jar.get(nombre) } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
const permitidos = new Set<string>();
vi.mock("@/lib/db", () => ({
  esAdminPermitido: async (email: string) => permitidos.has(email),
}));

const { asegurarAdminPagina, crearCookieSesionGoogle, COOKIE_GOOGLE } = await import("@/lib/auth");
const { crearCookieSesionPortal } = await import("@/lib/portal-auth");

beforeEach(() => {
  jar.clear();
  permitidos.clear();
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secreto-de-prueba");
});

describe("asegurarAdminPagina", () => {
  it("deja pasar a un admin que sigue en la allowlist", async () => {
    permitidos.add("jefe@metricsfield.com");
    jar.set(COOKIE_GOOGLE, await crearCookieSesionGoogle("jefe@metricsfield.com", "Jefe"));
    await expect(asegurarAdminPagina()).resolves.toBeUndefined();
  });

  it("manda a /login a un admin sacado de la allowlist aunque su cookie siga vigente", async () => {
    jar.set(COOKIE_GOOGLE, await crearCookieSesionGoogle("ex@metricsfield.com", "Ex"));
    await expect(asegurarAdminPagina()).rejects.toThrow("REDIRECT:/login");
  });

  it("manda a /login una cookie del portal copiada como sesión del panel", async () => {
    permitidos.add("empleado@cliente.com"); // ni siquiera estando en la allowlist
    jar.set(COOKIE_GOOGLE, await crearCookieSesionPortal("empleado@cliente.com", "E"));
    await expect(asegurarAdminPagina()).rejects.toThrow("REDIRECT:/login");
  });

  it("manda a /login sin ninguna cookie", async () => {
    await expect(asegurarAdminPagina()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("todas las páginas de /admin llaman al guard", () => {
  // Si agregás una página nueva a /admin y esto se pone en rojo, falta
  // `await asegurarAdminPagina();` como primera línea (y en generateMetadata).
  const paginas = globSync("app/admin/**/page.tsx");

  it("encuentra las páginas", () => {
    expect(paginas.length).toBeGreaterThan(5);
  });

  it.each(paginas)("%s", (archivo) => {
    const fuente = readFileSync(archivo, "utf8");
    const funciones = fuente.match(/^export (default (async )?function \w+|async function generateMetadata)\(/gm) ?? [];
    const llamadas = fuente.match(/^ {2}await asegurarAdminPagina\(\);$/gm) ?? [];
    expect(funciones.length).toBeGreaterThan(0);
    expect(llamadas.length).toBe(funciones.length);
  });
});
