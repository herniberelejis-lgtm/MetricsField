import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { generarLinkGuardar } from "@/lib/wallet/google";

// generarLinkGuardar es la única función de este módulo que no pega a la
// red (crearClase/crearOActualizarObjeto sí, contra la Issuer API real) —
// así que es la única testeable sin credenciales de Google de verdad. Lo
// que se prueba es la firma del JWT en sí: con un par de claves de prueba
// generado acá, no con nada de Google.

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const originales = {
  issuerId: process.env.GOOGLE_WALLET_ISSUER_ID,
  email: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
  clave: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY,
};

function restaurar(nombre: "GOOGLE_WALLET_ISSUER_ID" | "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL" | "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY", valor: string | undefined) {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}

afterEach(() => {
  restaurar("GOOGLE_WALLET_ISSUER_ID", originales.issuerId);
  restaurar("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL", originales.email);
  restaurar("GOOGLE_WALLET_SERVICE_ACCOUNT_KEY", originales.clave);
});

describe("sin credenciales configuradas", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_WALLET_ISSUER_ID;
    delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;
  });

  it("falla fuerte en vez de generar un link roto", () => {
    expect(() =>
      generarLinkGuardar({ classId: "x.y", objectId: "x.z", nombreCliente: "Julieta", saldo: 100 })
    ).toThrow(/GOOGLE_WALLET_ISSUER_ID/);
  });
});

describe("con credenciales de prueba", () => {
  beforeEach(() => {
    process.env.GOOGLE_WALLET_ISSUER_ID = "3388000000012345";
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = "loyalty-test@proyecto-test.iam.gserviceaccount.com";
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY = privateKey;
  });

  it("arma un JWT de 3 partes apuntando a pay.google.com", () => {
    const link = generarLinkGuardar({
      classId: "3388000000012345.nemo-cafe",
      objectId: "3388000000012345.membresia-1",
      nombreCliente: "Julieta Reyes",
      saldo: 100,
    });
    expect(link.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
    const jwt = link.split("/save/")[1];
    expect(jwt.split(".")).toHaveLength(3);
  });

  it("el header y el payload son JSON válido con los datos correctos", () => {
    const link = generarLinkGuardar({
      classId: "3388000000012345.nemo-cafe",
      objectId: "3388000000012345.membresia-1",
      nombreCliente: "Julieta Reyes",
      saldo: 250,
    });
    const [encabezado, cuerpo] = link.split("/save/")[1].split(".");
    const header = JSON.parse(Buffer.from(encabezado, "base64url").toString("utf-8"));
    const payload = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf-8"));
    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
    expect(payload.typ).toBe("savetowallet");
    expect(payload.payload.loyaltyObjects[0].loyaltyPoints.balance.int).toBe(250);
  });

  it("la firma verifica contra la clave pública del par de prueba", () => {
    const link = generarLinkGuardar({
      classId: "3388000000012345.nemo-cafe",
      objectId: "3388000000012345.membresia-1",
      nombreCliente: "Julieta Reyes",
      saldo: 100,
    });
    const [encabezado, cuerpo, firma] = link.split("/save/")[1].split(".");
    const verificador = crypto.createVerify("RSA-SHA256");
    verificador.update(`${encabezado}.${cuerpo}`);
    const firmaBuf = Buffer.from(firma, "base64url");
    expect(verificador.verify(publicKey, firmaBuf)).toBe(true);
  });
});
