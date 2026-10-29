import { describe, it, expect } from "vitest";
import {
  MAX_PIEZAS_LLAVERO,
  claveLlavero,
  codigoDeTicket,
  conPieza,
  crearTicket,
  crearMarcaSumar,
  escribirLlavero,
  esNavegadorInterno,
  firmaPieza,
  firmaValida,
  leerLlavero,
  marcaSumarVigente,
  sinPieza,
  ticketValido,
} from "@/lib/llavero-core";

// El llavero es lo que deja cambiar una pieza sin PIN. Cada caso que se
// ponga en verde de más es alguien cambiando el destino de una pieza ajena.

const clave = claveLlavero("secreto-de-prueba");
const otraClave = claveLlavero("otro-secreto");

describe("firma de una pieza", () => {
  it("vale para esa pieza y esa sal de PIN", () => {
    const f = firmaPieza(clave, "p-0149-66470d", "sal1");
    expect(firmaValida(clave, "p-0149-66470d", "sal1", f)).toBe(true);
  });

  it("no vale para otra pieza", () => {
    const f = firmaPieza(clave, "p-0149-66470d", "sal1");
    expect(firmaValida(clave, "p-0150-aaaaaa", "sal1", f)).toBe(false);
  });

  it("deja de valer cuando cambia el PIN (sal nueva)", () => {
    const f = firmaPieza(clave, "p-0149-66470d", "sal1");
    expect(firmaValida(clave, "p-0149-66470d", "sal2", f)).toBe(false);
  });

  it("no vale con otro secreto de servidor (ej. una preview)", () => {
    const f = firmaPieza(otraClave, "p-0149-66470d", "sal1");
    expect(firmaValida(clave, "p-0149-66470d", "sal1", f)).toBe(false);
  });

  it("nunca autoriza una pieza sin PIN (sal vacía o nula)", () => {
    for (const sal of [null, ""]) {
      const f = firmaPieza(clave, "p-0149-66470d", "");
      expect(firmaValida(clave, "p-0149-66470d", sal, f)).toBe(false);
    }
  });

  it("rechaza firmas mal formadas sin tirar error", () => {
    for (const f of ["", "corta", "x".repeat(17), "!!!!!!!!!!!!!!!!"]) {
      expect(firmaValida(clave, "p-0149-66470d", "sal1", f)).toBe(false);
    }
  });
});

describe("cookie del llavero", () => {
  it("ida y vuelta conserva piezas y orden", () => {
    let m = new Map<string, string>();
    m = conPieza(m, "p-0001-aaaaaa", firmaPieza(clave, "p-0001-aaaaaa", "s"));
    m = conPieza(m, "p-0002-bbbbbb", firmaPieza(clave, "p-0002-bbbbbb", "s"));
    const leido = leerLlavero(escribirLlavero(m));
    expect([...leido.keys()]).toEqual(["p-0001-aaaaaa", "p-0002-bbbbbb"]);
    expect(leido.get("p-0002-bbbbbb")).toBe(m.get("p-0002-bbbbbb"));
  });

  it("actualizar una pieza la mueve al final y no la duplica", () => {
    let m = new Map<string, string>();
    m = conPieza(m, "p-0001-aaaaaa", firmaPieza(clave, "p-0001-aaaaaa", "s"));
    m = conPieza(m, "p-0002-bbbbbb", firmaPieza(clave, "p-0002-bbbbbb", "s"));
    m = conPieza(m, "p-0001-aaaaaa", firmaPieza(clave, "p-0001-aaaaaa", "s2"));
    expect([...m.keys()]).toEqual(["p-0002-bbbbbb", "p-0001-aaaaaa"]);
  });

  it("sacar una pieza", () => {
    let m = conPieza(new Map(), "p-0001-aaaaaa", firmaPieza(clave, "p-0001-aaaaaa", "s"));
    m = sinPieza(m, "p-0001-aaaaaa");
    expect(m.size).toBe(0);
  });

  it("ignora basura sin romper", () => {
    const valido = `p-0001-aaaaaa.${firmaPieza(clave, "p-0001-aaaaaa", "s")}`;
    const leido = leerLlavero(`basura~P-MAYUS.xxxxxxxxxxxxxxxx~a.b.c~${valido}~.~~`);
    expect([...leido.keys()]).toEqual(["p-0001-aaaaaa"]);
    expect(leerLlavero(undefined).size).toBe(0);
    expect(leerLlavero("").size).toBe(0);
  });

  it("no pasa el tope de piezas ni de tamaño de cookie", () => {
    let m = new Map<string, string>();
    for (let i = 0; i < MAX_PIEZAS_LLAVERO + 20; i++) {
      const codigo = `p-${String(i).padStart(4, "0")}-abcdef`;
      m = conPieza(m, codigo, firmaPieza(clave, codigo, "s"));
    }
    const valor = escribirLlavero(m);
    const leido = leerLlavero(valor);
    expect(leido.size).toBe(MAX_PIEZAS_LLAVERO);
    // se quedan las más recientes
    expect(leido.has(`p-${String(MAX_PIEZAS_LLAVERO + 19).padStart(4, "0")}-abcdef`)).toBe(true);
    expect(leido.has("p-0000-abcdef")).toBe(false);
    expect(valor.length).toBeLessThan(3500);
  });
});

describe("modo sumar", () => {
  it("vale hasta que vence", () => {
    const ahora = 1_800_000_000_000;
    const marca = crearMarcaSumar(clave, ahora + 600_000);
    expect(marcaSumarVigente(clave, marca, ahora)).toBe(true);
    expect(marcaSumarVigente(clave, marca, ahora + 600_001)).toBe(false);
  });

  it("no se puede estirar el vencimiento a mano ni falsificar", () => {
    const ahora = 1_800_000_000_000;
    const marca = crearMarcaSumar(clave, ahora + 600_000);
    const [, firma] = marca.split(".");
    expect(marcaSumarVigente(clave, `${ahora + 99_999_999}.${firma}`, ahora)).toBe(false);
    expect(marcaSumarVigente(clave, crearMarcaSumar(otraClave, ahora + 600_000), ahora)).toBe(false);
    for (const malo of [undefined, "", "abc", "123.456", `${ahora + 1000}`]) {
      expect(marcaSumarVigente(clave, malo, ahora)).toBe(false);
    }
  });
});

describe("navegadores internos", () => {
  it("detecta los de apps", () => {
    expect(esNavegadorInterno("Mozilla/5.0 (iPhone) ... Instagram 300.0")).toBe(true);
    expect(esNavegadorInterno("Mozilla/5.0 ... [FBAN/FBIOS;FBAV/400.0]")).toBe(true);
    expect(esNavegadorInterno("Mozilla/5.0 (Linux; Android 13; SM-A135M Build/TP1A; wv) AppleWebKit")).toBe(true);
  });

  it("no confunde Chrome ni Safari", () => {
    expect(
      esNavegadorInterno(
        "Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
    expect(
      esNavegadorInterno(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("ticket de una pieza recién activada", () => {
  const ahora = 1_800_000_000_000;
  it("vale para esa pieza, ese PIN y por 5 minutos", () => {
    const t = crearTicket(clave, "p-0149-66470d", "sal1", ahora + 300_000);
    expect(codigoDeTicket(t)).toBe("p-0149-66470d");
    expect(ticketValido(clave, t, "sal1", ahora)).toBe(true);
    expect(ticketValido(clave, t, "sal1", ahora + 300_001)).toBe(false);
    expect(ticketValido(clave, t, "sal2", ahora)).toBe(false);
    expect(ticketValido(clave, t, null, ahora)).toBe(false);
  });
  it("no se puede pasar a otra pieza ni estirar", () => {
    const t = crearTicket(clave, "p-0149-66470d", "sal1", ahora + 300_000);
    const [, hasta, firma] = t.split(".");
    expect(ticketValido(clave, `p-0001-aaaaaa.${hasta}.${firma}`, "sal1", ahora)).toBe(false);
    expect(ticketValido(clave, `p-0149-66470d.${ahora + 9_999_999}.${firma}`, "sal1", ahora)).toBe(false);
    expect(ticketValido(otraClave, t, "sal1", ahora)).toBe(false);
    expect(codigoDeTicket("../x")).toBe(null);
  });
});
