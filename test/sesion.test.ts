import { describe, it, expect, vi, afterEach } from "vitest";
import {
  crearCookiePassword,
  cookiePasswordValida,
  crearCookieSesionGoogle,
  leerCookieSesionGoogle,
  loginConPasswordPermitido,
  SESION_MAX_MS,
} from "@/lib/sesion";

// Estas cookies SON la autenticación del panel: si una de estas pruebas se
// pone en rojo, cualquiera puede entrar a /admin. Cubren las tres formas de
// entrar sin la credencial: firma inventada, firma de OTRA clave, y cookie
// vieja que ya venció.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
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
    const cookie = await crearCookieSesionGoogle("aleee@metricsfield.com", "Ale", "secreto", "admin");
    expect(await leerCookieSesionGoogle(cookie, "secreto", "admin")).toEqual({
      email: "aleee@metricsfield.com",
      nombre: "Ale",
    });
  });

  it("rechaza la cookie firmada con otro secreto", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto-uno", "admin");
    expect(await leerCookieSesionGoogle(cookie, "secreto-dos", "admin")).toBeNull();
  });

  it("rechaza un payload manipulado para escalar a otro email", async () => {
    const cookie = await crearCookieSesionGoogle("cualquiera@gmail.com", "X", "secreto", "admin");
    const [, firma] = cookie.split(".");
    const payloadFalso = Buffer.from(
      JSON.stringify({ email: "jefe@metricsfield.com", nombre: "Jefe", exp: Date.now() + 99999 }),
    )
      .toString("base64url");
    expect(await leerCookieSesionGoogle(`${payloadFalso}.${firma}`, "secreto", "admin")).toBeNull();
  });

  it("rechaza una sesión vencida", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto", "admin");
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESION_MAX_MS + 1000);
    expect(await leerCookieSesionGoogle(cookie, "secreto", "admin")).toBeNull();
  });

  it("nunca valida si no hay secreto configurado", async () => {
    const cookie = await crearCookieSesionGoogle("a@b.com", "A", "secreto", "admin");
    expect(await leerCookieSesionGoogle(cookie, "", "admin")).toBeNull();
  });

  it("rechaza basura sin explotar", async () => {
    for (const malo of ["", ".", "abc", "abc.def", "...."]) {
      expect(await leerCookieSesionGoogle(malo, "secreto", "admin")).toBeNull();
    }
  });

  // C1 del security audit 2026-10: la cookie del portal de un cliente tenía
  // el mismo formato y la misma clave que la del panel, así que copiarla con
  // el nombre admin_google_session abría /admin. Si alguno de estos se pone
  // en rojo, ese agujero volvió.
  it("una cookie del portal nunca vale como sesión del panel (y al revés)", async () => {
    const portal = await crearCookieSesionGoogle("empleado@cliente.com", "E", "secreto", "portal");
    expect(await leerCookieSesionGoogle(portal, "secreto", "admin")).toBeNull();
    expect(await leerCookieSesionGoogle(portal, "secreto", "portal")).toEqual({
      email: "empleado@cliente.com",
      nombre: "E",
    });
    const admin = await crearCookieSesionGoogle("jefe@metricsfield.com", "J", "secreto", "admin");
    expect(await leerCookieSesionGoogle(admin, "secreto", "portal")).toBeNull();
  });

  // La cuenta de Google de los dueños de piezas de Mercado Libre usa el
  // mismo secreto: cualquiera puede crearse una (no hay allowlist), así que
  // NUNCA puede abrir el panel ni un portal.
  it("una cookie de dueño de piezas no vale como panel ni como portal (y al revés)", async () => {
    const piezas = await crearCookieSesionGoogle("revendedor@gmail.com", "R", "secreto", "piezas");
    expect(await leerCookieSesionGoogle(piezas, "secreto", "admin")).toBeNull();
    expect(await leerCookieSesionGoogle(piezas, "secreto", "portal")).toBeNull();
    expect(await leerCookieSesionGoogle(piezas, "secreto", "piezas")).toEqual({ email: "revendedor@gmail.com", nombre: "R" });
    const admin = await crearCookieSesionGoogle("jefe@metricsfield.com", "J", "secreto", "admin");
    expect(await leerCookieSesionGoogle(admin, "secreto", "piezas")).toBeNull();
  });

  it("no alcanza con cambiar la audiencia del payload: la firma la cubre", async () => {
    const portal = await crearCookieSesionGoogle("empleado@cliente.com", "E", "secreto", "portal");
    const [payload, firma] = portal.split(".");
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString());
    const payloadAdmin = Buffer.from(JSON.stringify({ ...datos, aud: "admin" })).toString("base64url");
    expect(await leerCookieSesionGoogle(`${payloadAdmin}.${firma}`, "secreto", "admin")).toBeNull();
  });

  it("rechaza las cookies del formato viejo, sin audiencia", async () => {
    const payload = Buffer.from(
      JSON.stringify({ email: "a@b.com", nombre: "A", exp: Date.now() + 99999 }),
    ).toString("base64url");
    const { createHmac } = await import("node:crypto");
    const firmaVieja = createHmac("sha256", "secreto").update(payload).digest("base64url");
    expect(await leerCookieSesionGoogle(`${payload}.${firmaVieja}`, "secreto", "admin")).toBeNull();
    expect(await leerCookieSesionGoogle(`${payload}.${firmaVieja}`, "secreto", "portal")).toBeNull();
  });
});

// En producción el panel es solo con Google: si esto se pone en rojo, la
// contraseña compartida vuelve a abrir el panel de producción.
describe("login con contraseña compartida según el entorno", () => {
  it("en producción (Vercel) NO se permite", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(loginConPasswordPermitido()).toBe(false);
  });

  it("en previews de Vercel sí (detrás de Vercel Authentication)", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(loginConPasswordPermitido()).toBe(true);
  });

  it("en tu PC (sin VERCEL_ENV) sí", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(loginConPasswordPermitido()).toBe(true);
  });
});
