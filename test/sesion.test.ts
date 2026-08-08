import { describe, it, expect, vi, afterEach } from "vitest";
import {
  crearCookiePassword,
  cookiePasswordValida,
  crearCookieSesionGoogle,
  leerCookieSesionGoogle,
  SESION_MAX_MS,
} from "@/lib/sesion";

// Estas cookies SON la autenticación del panel: si una de estas pruebas se
// pone en rojo, cualquiera puede entrar a /admin. Cubren las tres formas de
// entrar sin la credencial: firma inventada, firma de OTRA clave, y cookie
// vieja que ya venció.

afterEach(() => {
  vi.useRealTimers();
});

describe("cookie de contraseña compartida", () => {
  it("acepta la cookie que ella misma emitió", async () => {
    const cookie = await crearCookiePassword("clave-del-equipo");
    expect(await cookiePasswordValida(cookie, "clave-del-equipo")).toBe(true);
  });

  it("rechaza la cookie si la contraseña cambió (rota las sesiones vivas)", async () => {
    const cookie = await crearCookiePassword("clave-vieja");
    expect(await cookiePasswordValida(cookie, "clave-nueva")).toBe(false);
  });

  it("no lleva la contraseña adentro", async () => {
    const cookie = await crearCookiePassword("s3cr3t0-literal");
    expect(cookie).not.toContain("s3cr3t0-literal");
  });

  it("rechaza una firma inventada para un vencimiento futuro", async () => {
    const expFuturo = Date.now() + SESION_MAX_MS;
    expect(await cookiePasswordValida(`${expFuturo}.firmatrucha`, "clave")).toBe(false);
  });

  it("rechaza basura sin el formato exp.firma", async () => {
    for (const malo of ["", ".", "solo-texto", "abc.def", "..", "123"]) {
      expect(await cookiePasswordValida(malo, "clave")).toBe(false);
    }
  });

  it("rechaza una cookie vencida aunque la firma sea legítima", async () => {
    const cookie = await crearCookiePassword("clave");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESION_MAX_MS + 1000);
    expect(await cookiePasswordValida(cookie, "clave")).toBe(false);
  });

  it("sin ADMIN_PASSWORD configurada no valida ninguna cookie", async () => {
    // El login nunca llega a emitir una cookie sin contraseña (app/login/
    // actions.ts corta con !!password), así que lo que importa acá es la
    // otra punta: que ninguna cookie preexistente pase el guard cuando la
    // variable no está cargada.
    const cookie = await crearCookiePassword("clave-que-despues-se-borra");
    expect(await cookiePasswordValida(cookie, "")).toBe(false);
  });
});

describe("cookie de sesión con Google", () => {
  it("devuelve el email y nombre que firmó", async () => {
    const cookie = await crearCookieSesionGoogle("aleee@metricsfield.com", "Ale", "secreto");
    expect(await leerCookieSesionGoogle(cookie, "secreto")).toEqual({
      email: "aleee@metricsfield.com",
      nombre: "Ale",
    });
  });

  it("rechaza la cookie firmada con otro secreto", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto-uno");
    expect(await leerCookieSesionGoogle(cookie, "secreto-dos")).toBeNull();
  });

  it("rechaza un payload manipulado para escalar a otro email", async () => {
    const cookie = await crearCookieSesionGoogle("cualquiera@gmail.com", "X", "secreto");
    const [, firma] = cookie.split(".");
    const payloadFalso = Buffer.from(
      JSON.stringify({ email: "jefe@metricsfield.com", nombre: "Jefe", exp: Date.now() + 99999 }),
    )
      .toString("base64url");
    expect(await leerCookieSesionGoogle(`${payloadFalso}.${firma}`, "secreto")).toBeNull();
  });

  it("rechaza una sesión vencida", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESION_MAX_MS + 1000);
    expect(await leerCookieSesionGoogle(cookie, "secreto")).toBeNull();
  });

  it("nunca valida si no hay secreto configurado", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto");
    expect(await leerCookieSesionGoogle(cookie, "")).toBeNull();
  });

  it("rechaza basura sin explotar", async () => {
    for (const malo of ["", ".", "abc", "abc.def", "...."]) {
      expect(await leerCookieSesionGoogle(malo, "secreto")).toBeNull();
    }
  });
});
