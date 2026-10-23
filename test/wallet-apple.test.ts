import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import forge from "node-forge";
import JSZip from "jszip";
import { generarPkpass } from "@/lib/wallet/apple";
import { ASSETS_PASE_APPLE } from "@/lib/wallet/apple-assets";

// Cadena de certificados de prueba (nunca los reales de Apple): una CA
// autofirmada haciendo de "WWDR", y un certificado de Pass Type ID firmado
// por esa CA — exactamente la misma forma que la cadena real, así que
// probar la firma PKCS#7 contra esto verifica la lógica de firmado sin
// necesitar una cuenta de Apple Developer.
function generarCadenaDePrueba() {
  const parCA = forge.pki.rsa.generateKeyPair(2048);
  const ca = forge.pki.createCertificate();
  ca.publicKey = parCA.publicKey;
  ca.serialNumber = "01";
  ca.validity.notBefore = new Date();
  ca.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrsCA = [{ name: "commonName", value: "Test WWDR" }];
  ca.setSubject(attrsCA);
  ca.setIssuer(attrsCA);
  ca.setExtensions([{ name: "basicConstraints", cA: true }]);
  ca.sign(parCA.privateKey, forge.md.sha256.create());

  const parPass = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = parPass.publicKey;
  cert.serialNumber = "02";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  cert.setSubject([{ name: "commonName", value: "pass.com.metricsfield.loyalty.test" }]);
  cert.setIssuer(attrsCA);
  cert.sign(parCA.privateKey, forge.md.sha256.create());

  return {
    wwdrPem: forge.pki.certificateToPem(ca),
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(parPass.privateKey),
  };
}

const cadena = generarCadenaDePrueba();
const originales = {
  teamId: process.env.APPLE_TEAM_ID,
  passTypeId: process.env.APPLE_PASS_TYPE_ID,
  cert: process.env.APPLE_PASS_CERT,
  key: process.env.APPLE_PASS_KEY,
  wwdr: process.env.APPLE_WWDR_CERT,
};

beforeAll(() => {
  process.env.APPLE_TEAM_ID = "TEST1234TEAM";
  process.env.APPLE_PASS_TYPE_ID = "pass.com.metricsfield.loyalty.test";
  process.env.APPLE_PASS_CERT = cadena.certPem;
  process.env.APPLE_PASS_KEY = cadena.keyPem;
  process.env.APPLE_WWDR_CERT = cadena.wwdrPem;
});

afterAll(() => {
  for (const [nombre, valor] of Object.entries(originales)) {
    const clave = `APPLE_${nombre === "passTypeId" ? "PASS_TYPE_ID" : nombre === "teamId" ? "TEAM_ID" : nombre === "cert" ? "PASS_CERT" : nombre === "key" ? "PASS_KEY" : "WWDR_CERT"}`;
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

const iconFalso = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // firma PNG, contenido no importa acá

describe("generarPkpass", () => {
  it("rechaza sin icon.png — Apple lo exige", async () => {
    await expect(
      generarPkpass({ serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta", saldo: 100 }, {})
    ).rejects.toThrow(/icon\.png/);
  });

  it("arma un zip con pass.json, manifest.json y signature", async () => {
    const buf = await generarPkpass(
      { serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta Reyes", saldo: 100 },
      { "icon.png": iconFalso }
    );
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).sort()).toEqual(["icon.png", "manifest.json", "pass.json", "signature"]);
  });

  it("el manifest tiene el SHA-1 correcto de cada archivo", async () => {
    const buf = await generarPkpass(
      { serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta Reyes", saldo: 100 },
      { "icon.png": iconFalso }
    );
    const zip = await JSZip.loadAsync(buf);
    const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
    const passJsonBuf = Buffer.from(await zip.file("pass.json")!.async("nodebuffer"));
    expect(manifest["pass.json"]).toBe(crypto.createHash("sha1").update(passJsonBuf).digest("hex"));
    expect(manifest["icon.png"]).toBe(crypto.createHash("sha1").update(iconFalso).digest("hex"));
  });

  it("pass.json trae el saldo y el nombre del cliente correctos", async () => {
    const buf = await generarPkpass(
      { serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta Reyes", saldo: 250 },
      { "icon.png": iconFalso }
    );
    const zip = await JSZip.loadAsync(buf);
    const pass = JSON.parse(await zip.file("pass.json")!.async("string"));
    expect(pass.serialNumber).toBe("m1");
    expect(pass.storeCard.headerFields[0].value).toBe("250");
    expect(pass.storeCard.primaryFields[0].value).toBe("Julieta Reyes");
  });

  it("la firma es un PKCS#7 detached válido sobre el manifest (verificado con OpenSSL, no con forge)", async () => {
    // node-forge trae verify() sin implementar en PkcsSignedData ("not yet
    // implemented" en tiempo de ejecución, aunque el tipo lo declara) — no
    // sirve como referencia. OpenSSL sí es una implementación completa e
    // independiente de PKCS#7, y el CI de este repo corre en
    // ubuntu-latest, donde viene preinstalado (ver .github/workflows) —
    // por eso acá se lo invoca directo en vez de reimplementar a mano la
    // verificación de SignedAttributes.
    const buf = await generarPkpass(
      { serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta Reyes", saldo: 100 },
      { "icon.png": iconFalso }
    );
    const zip = await JSZip.loadAsync(buf);
    const manifestBuf = Buffer.from(await zip.file("manifest.json")!.async("nodebuffer"));
    const firmaBuf = Buffer.from(await zip.file("signature")!.async("nodebuffer"));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pkpass-verify-"));
    const manifestPath = path.join(dir, "manifest.json");
    const firmaPath = path.join(dir, "signature.der");
    const wwdrPath = path.join(dir, "wwdr.pem");
    fs.writeFileSync(manifestPath, manifestBuf);
    fs.writeFileSync(firmaPath, firmaBuf);
    fs.writeFileSync(wwdrPath, cadena.wwdrPem);

    try {
      // openssl sale con código 0 solo si la cadena de confianza y la
      // firma son válidas — "Verification successful" va a stderr, así
      // que lo que importa acá es que NO tire (exit code, no el texto).
      expect(() =>
        execFileSync(
          "openssl",
          ["smime", "-verify", "-in", firmaPath, "-inform", "DER", "-content", manifestPath, "-CAfile", wwdrPath, "-out", path.join(dir, "out")],
          { stdio: "pipe" }
        )
      ).not.toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------- Pase armado con los assets reales y el dorso con link ----------

/** Ancho y alto de un PNG, leídos de su cabecera IHDR (bytes 16 a 23). */
function medidasPng(png: Buffer): { ancho: number; alto: number } {
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

describe("assets embebidos del pase de Apple", () => {
  const firmaPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const esperadas: Record<string, number> = {
    "icon.png": 29,
    "icon@2x.png": 58,
    "icon@3x.png": 87,
    "logo.png": 50,
    "logo@2x.png": 100,
  };

  it("trae el icon.png que Apple exige, y todos son PNG cuadrados del tamaño de su escala", () => {
    for (const [nombre, lado] of Object.entries(esperadas)) {
      const png = ASSETS_PASE_APPLE[nombre];
      expect(png, nombre).toBeDefined();
      expect(png.subarray(0, 8).equals(firmaPng), `${nombre} no es un PNG`).toBe(true);
      expect(medidasPng(png), nombre).toEqual({ ancho: lado, alto: lado });
    }
  });

  it("no trae archivos de más: el pase solo lleva lo que Apple lee", () => {
    expect(Object.keys(ASSETS_PASE_APPLE).sort()).toEqual(Object.keys(esperadas).sort());
  });
});

describe("pase de Apple con assets reales", () => {
  const datos = {
    serialNumber: "mem-1",
    nombreComercio: "Nemo Café",
    nombreCliente: "Julieta Reyes",
    saldo: 70,
  };

  it("arma el zip completo: pass.json, manifest, firma y las cinco imágenes", async () => {
    const zip = await JSZip.loadAsync(await generarPkpass(datos, ASSETS_PASE_APPLE));
    expect(Object.keys(zip.files).sort()).toEqual(
      ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "manifest.json", "pass.json", "signature"].sort()
    );
  });

  it("pone el nombre del comercio junto al logo y los colores de marca", async () => {
    const zip = await JSZip.loadAsync(await generarPkpass(datos, ASSETS_PASE_APPLE));
    const pass = JSON.parse(await zip.file("pass.json")!.async("string"));
    expect(pass.logoText).toBe("Nemo Café");
    expect(pass.backgroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(pass.foregroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  it("el dorso trae el link para ver los puntos al día, solo si se lo pasan", async () => {
    const conLink = await JSZip.loadAsync(
      await generarPkpass({ ...datos, urlTarjeta: "https://app.metricsfield.com/l/nemo/entrar?tarjeta=abc" }, ASSETS_PASE_APPLE)
    );
    const sinLink = await JSZip.loadAsync(await generarPkpass(datos, ASSETS_PASE_APPLE));
    const dorsoCon = JSON.parse(await conLink.file("pass.json")!.async("string")).storeCard.backFields;
    const dorsoSin = JSON.parse(await sinLink.file("pass.json")!.async("string")).storeCard.backFields;
    expect(dorsoCon.find((c: { key: string }) => c.key === "tarjeta")?.value).toBe(
      "https://app.metricsfield.com/l/nemo/entrar?tarjeta=abc"
    );
    expect(dorsoSin.find((c: { key: string }) => c.key === "tarjeta")).toBeUndefined();
  });

  it("el saldo viaja en un único campo PUNTOS del encabezado", async () => {
    const zip = await JSZip.loadAsync(await generarPkpass(datos, ASSETS_PASE_APPLE));
    const pass = JSON.parse(await zip.file("pass.json")!.async("string"));
    expect(pass.storeCard.headerFields).toEqual([{ key: "puntos", label: "PUNTOS", value: "70" }]);
  });
});

describe("certificados cargados como variable de entorno", () => {
  it("acepta los PEM con los saltos de línea escritos como texto barra-n (como se pegan en Vercel en una sola línea)", async () => {
    // Barra invertida + n escritos como TEXTO (no un salto de línea real).
    const barraN = String.fromCharCode(92) + "n";
    const escapar = (pem: string) => pem.replace(/\r?\n/g, barraN);
    const antes = {
      cert: process.env.APPLE_PASS_CERT,
      key: process.env.APPLE_PASS_KEY,
      wwdr: process.env.APPLE_WWDR_CERT,
    };
    process.env.APPLE_PASS_CERT = escapar(cadena.certPem);
    process.env.APPLE_PASS_KEY = escapar(cadena.keyPem);
    process.env.APPLE_WWDR_CERT = escapar(cadena.wwdrPem);
    try {
      expect(process.env.APPLE_PASS_CERT).not.toContain("\n");
      const buf = await generarPkpass(
        { serialNumber: "m1", nombreComercio: "Nemo Café", nombreCliente: "Julieta", saldo: 1 },
        ASSETS_PASE_APPLE
      );
      expect(buf.length).toBeGreaterThan(0);
    } finally {
      process.env.APPLE_PASS_CERT = antes.cert;
      process.env.APPLE_PASS_KEY = antes.key;
      process.env.APPLE_WWDR_CERT = antes.wwdr;
    }
  });
});
