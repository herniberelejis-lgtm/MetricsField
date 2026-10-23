import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { COOKIE_CLIENTE_FINAL, crearCookieClienteFinal } from "@/lib/loyalty-firma";

// La ruta /l/<comercio>/apple entrega un pase firmado con el saldo de UNA
// persona. Lo que no puede pasar nunca: dárselo a quien no tiene sesión, a quien
// no es socio de ese comercio, o armarlo con datos que lleguen por la URL.
//
// Acá se simulan la base, el límite por IP y el generador del pase; quedan REALES
// la firma de la cookie del cliente y el hash de IP, que son lo que decide de
// quién es la tarjeta. La firma del .pkpass en sí la prueba wallet-apple.test.ts.

const m = vi.hoisted(() => ({
  permitir: vi.fn(),
  comercioConLoyalty: vi.fn(),
  appleWalletConfigurado: vi.fn(),
  getMembresia: vi.fn(),
  getClienteFinal: vi.fn(),
  calcularSaldo: vi.fn(),
  registrarEventoLoyalty: vi.fn(),
  generarPkpass: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  ipDelRequest: () => "203.0.113.7",
  limpiarVencidos: () => {},
  permitir: m.permitir,
}));
vi.mock("@/lib/loyalty", () => ({
  comercioConLoyalty: m.comercioConLoyalty,
  appleWalletConfigurado: m.appleWalletConfigurado,
  origenLoyalty: async () => "https://app.prueba.test",
  linkTarjeta: (origen: string, comercioId: string, membresiaId: string) =>
    `${origen}/l/${comercioId}/entrar?tarjeta=${membresiaId}`,
}));
vi.mock("@/lib/db/loyalty", () => ({
  getMembresia: m.getMembresia,
  getClienteFinal: m.getClienteFinal,
  calcularSaldo: m.calcularSaldo,
  registrarEventoLoyalty: m.registrarEventoLoyalty,
}));
vi.mock("@/lib/wallet/apple", () => ({ generarPkpass: m.generarPkpass }));

import { GET } from "@/app/(loyalty)/l/[codigo]/apple/route";

const COMERCIO = "nemo";
const CLIENTE = "cli-julieta";
const PASE = Buffer.from("PKPASS-DE-PRUEBA");

function pedir(opciones: { cookie?: string; codigo?: string } = {}) {
  const codigo = opciones.codigo ?? COMERCIO;
  const headers: Record<string, string> = {};
  if (opciones.cookie) headers.cookie = `${COOKIE_CLIENTE_FINAL}=${opciones.cookie}`;
  const req = new NextRequest(`http://localhost:3000/l/${codigo}/apple`, { headers });
  return GET(req, { params: Promise.resolve({ codigo }) });
}

function destino(res: Response): string {
  return new URL(res.headers.get("location") ?? "", "http://localhost:3000").pathname + new URL(res.headers.get("location") ?? "", "http://localhost:3000").search;
}

beforeEach(() => {
  vi.resetAllMocks();
  m.permitir.mockResolvedValue(true);
  m.appleWalletConfigurado.mockReturnValue(true);
  m.comercioConLoyalty.mockResolvedValue({ comercio: { id: COMERCIO, nombre: "Nemo Café" }, programa: { activo: true } });
  m.getMembresia.mockResolvedValue({ id: "mem-1", comercioId: COMERCIO, clienteFinalId: CLIENTE });
  m.getClienteFinal.mockResolvedValue({ id: CLIENTE, nombre: "Julieta Reyes" });
  m.calcularSaldo.mockResolvedValue(70);
  m.generarPkpass.mockResolvedValue(PASE);
});

describe("GET /l/<comercio>/apple: a quién se le entrega el pase", () => {
  it("camino feliz: entrega el .pkpass con el saldo de esa socia y registra el clic", async () => {
    const res = await pedir({ cookie: crearCookieClienteFinal(CLIENTE) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/vnd.apple.pkpass");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await res.arrayBuffer()).equals(PASE)).toBe(true);

    expect(m.generarPkpass).toHaveBeenCalledTimes(1);
    const [datos, assets] = m.generarPkpass.mock.calls[0];
    expect(datos).toEqual({
      serialNumber: "mem-1",
      nombreComercio: "Nemo Café",
      nombreCliente: "Julieta Reyes",
      saldo: 70,
      urlTarjeta: "https://app.prueba.test/l/nemo/entrar?tarjeta=mem-1",
    });
    expect(Object.keys(assets)).toContain("icon.png");

    expect(m.registrarEventoLoyalty).toHaveBeenCalledTimes(1);
    const evento = m.registrarEventoLoyalty.mock.calls[0][0];
    expect(evento).toMatchObject({ comercioId: COMERCIO, clienteFinalId: CLIENTE, tipo: "wallet_guardada" });
    expect(evento.ipHash).not.toContain("203.0.113.7"); // nunca la IP en claro
  });

  it("sin sesión no entrega ningún pase: manda a la landing", async () => {
    const res = await pedir();
    expect(res.status).toBe(303);
    expect(destino(res)).toBe("/l/nemo");
    expect(m.generarPkpass).not.toHaveBeenCalled();
    expect(m.registrarEventoLoyalty).not.toHaveBeenCalled();
  });

  it("una cookie falsificada o con la firma cambiada no vale", async () => {
    const valida = crearCookieClienteFinal(CLIENTE);
    const [, exp, firma] = valida.split(".");
    const ajena = `cli-otra-persona.${exp}.${firma}`; // cambia el id, conserva la firma
    const res = await pedir({ cookie: ajena });
    expect(destino(res)).toBe("/l/nemo");
    expect(m.getMembresia).not.toHaveBeenCalled();
    expect(m.generarPkpass).not.toHaveBeenCalled();
  });

  it("una sesión válida que NO es socia de ese comercio no recibe pase", async () => {
    m.getMembresia.mockResolvedValue(null);
    const res = await pedir({ cookie: crearCookieClienteFinal(CLIENTE) });
    expect(destino(res)).toBe("/l/nemo");
    expect(m.generarPkpass).not.toHaveBeenCalled();
  });

  it("la tarjeta se busca con el cliente de la COOKIE y el comercio de la URL, no con ids sueltos", async () => {
    await pedir({ cookie: crearCookieClienteFinal(CLIENTE) });
    expect(m.getMembresia).toHaveBeenCalledWith(CLIENTE, COMERCIO);
    expect(m.getClienteFinal).toHaveBeenCalledWith(CLIENTE);
  });
});

describe("GET /l/<comercio>/apple: cuándo no hay pase", () => {
  const sesion = () => crearCookieClienteFinal(CLIENTE);

  it("con Apple sin configurar vuelve a la landing con el aviso, sin armar nada", async () => {
    m.appleWalletConfigurado.mockReturnValue(false);
    const res = await pedir({ cookie: sesion() });
    expect(destino(res)).toBe("/l/nemo?wallet=error");
    expect(m.generarPkpass).not.toHaveBeenCalled();
  });

  it("si el comercio no tiene Loyalty activo (flag, entitlement, baja o programa), no hay pase", async () => {
    m.comercioConLoyalty.mockResolvedValue(null);
    const res = await pedir({ cookie: sesion() });
    expect(destino(res)).toBe("/l/nemo?wallet=error");
    expect(m.getMembresia).not.toHaveBeenCalled();
    expect(m.generarPkpass).not.toHaveBeenCalled();
  });

  it("pasado el límite por IP no firma nada ni toca la base", async () => {
    m.permitir.mockResolvedValue(false);
    const res = await pedir({ cookie: sesion() });
    expect(destino(res)).toBe("/l/nemo?wallet=error");
    expect(m.comercioConLoyalty).not.toHaveBeenCalled();
    expect(m.generarPkpass).not.toHaveBeenCalled();
  });

  it("si armar el pase falla: aviso al cliente, sin evento, y el log no lleva sus datos", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.generarPkpass.mockRejectedValue(new Error("certificado vencido"));
    const res = await pedir({ cookie: sesion() });

    expect(destino(res)).toBe("/l/nemo?wallet=error");
    expect(m.registrarEventoLoyalty).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const registrado = JSON.stringify(log.mock.calls);
    expect(registrado).toContain("certificado vencido");
    expect(registrado).not.toContain("Julieta");
    log.mockRestore();
  });
});
