import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import forge from "node-forge";
import JSZip from "jszip";
import { generarPkpass } from "@/lib/wallet/apple";

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
