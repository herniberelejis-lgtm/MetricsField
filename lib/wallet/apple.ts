import "server-only";
import crypto from "node:crypto";
import forge from "node-forge";
import JSZip from "jszip";

// Generación de pases estáticos de Apple Wallet (.pkpass) — Fase A los
// emite así, sin push automático por APNs (eso es Fase B, ver el addendum
// de arquitectura). Un .pkpass es un zip con reglas puntuales: pass.json +
// assets + manifest.json (hash SHA-1 de cada archivo) + una firma PKCS#7
// detached sobre ese manifest. node:crypto no firma PKCS#7/CMS — por eso
// la única dependencia nueva de este módulo es node-forge, que sí lo hace
// sin necesitar invocar `openssl` como proceso aparte.
//
// Variables de entorno (ver .env.example):
//   APPLE_TEAM_ID       — Team ID de la cuenta Apple Developer
//   APPLE_PASS_TYPE_ID  — identificador del Pass Type (pass.com.metricsfield.loyalty)
//   APPLE_PASS_CERT     — certificado del Pass Type ID, PEM
//   APPLE_PASS_KEY      — clave privada de ese certificado, PEM
//   APPLE_WWDR_CERT     — certificado intermedio Apple WWDR, PEM

export interface DatosPaseApple {
  serialNumber: string; // membresia.id
  nombreComercio: string;
  nombreCliente: string;
  saldo: number;
}

/** icon.png (mínimo obligatorio por la spec de Apple) y opcionalmente
 * logo.png / icon@2x.png / logo@2x.png — buffers reales de imagen, no se
 * generan acá. Vienen de los assets de marca del comercio (A4/A7, todavía
 * sin definir de dónde salen — esta función no asume una fuente). */
export type AssetsPaseApple = Record<string, Buffer>;

function credenciales() {
  const teamId = process.env.APPLE_TEAM_ID;
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const certPem = process.env.APPLE_PASS_CERT;
  const keyPem = process.env.APPLE_PASS_KEY;
  const wwdrPem = process.env.APPLE_WWDR_CERT;
  if (!teamId || !passTypeId || !certPem || !keyPem || !wwdrPem) {
    throw new Error(
      "Faltan APPLE_TEAM_ID / APPLE_PASS_TYPE_ID / APPLE_PASS_CERT / APPLE_PASS_KEY / APPLE_WWDR_CERT"
    );
  }
  return { teamId, passTypeId, certPem, keyPem, wwdrPem };
}

function construirPassJson(datos: DatosPaseApple): Record<string, unknown> {
  const { teamId, passTypeId } = credenciales();
  return {
    formatVersion: 1,
    teamIdentifier: teamId,
    passTypeIdentifier: passTypeId,
    serialNumber: datos.serialNumber,
    organizationName: datos.nombreComercio,
    description: `Tarjeta de fidelidad — ${datos.nombreComercio}`,
    // Pase estático (Fase A): sin webServiceURL ni authenticationToken, por
    // lo tanto Apple nunca intenta empujar actualizaciones — el saldo que
    // ve el cliente es el del momento en que guardó el pase. Fase B agrega
    // el Web Service + push por APNs, ver el addendum.
    storeCard: {
      headerFields: [{ key: "puntos", label: "PUNTOS", value: String(datos.saldo) }],
      primaryFields: [{ key: "cliente", label: "MIEMBRO", value: datos.nombreCliente }],
      backFields: [
        {
          key: "info",
          label: "Sobre esta tarjeta",
          value: "Pase estático — actualizá tu saldo tocando el cartel en el local.",
        },
      ],
    },
  };
}

/** SHA-1 por archivo — es lo que exige el formato de manifest.json de
 * Apple (no es una elección de seguridad nuestra, es la spec del pase). */
function sha1(buf: Buffer): string {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

/** Firma PKCS#7 detached sobre manifest.json, con el certificado del Pass
 * Type ID + su clave privada, encadenado con el certificado intermedio
 * Apple WWDR — exactamente la cadena de confianza que Wallet valida al
 * abrir el pase. */
function firmarManifest(manifest: Buffer, cert: string, key: string, wwdr: string): Buffer {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString("binary"));
  p7.addCertificate(forge.pki.certificateFromPem(cert));
  p7.addCertificate(forge.pki.certificateFromPem(wwdr));
  p7.addSigner({
    key: forge.pki.privateKeyFromPem(key),
    certificate: forge.pki.certificateFromPem(cert),
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
}

/** Arma el .pkpass completo: pass.json + assets + manifest.json + firma,
 * todo dentro de un zip (jszip, ya es dependencia del repo). Devuelve el
 * buffer listo para servir con Content-Type application/vnd.apple.pkpass. */
export async function generarPkpass(
  datos: DatosPaseApple,
  assets: AssetsPaseApple
): Promise<Buffer> {
  if (!assets["icon.png"]) {
    throw new Error("Falta icon.png — Apple Wallet exige al menos ese asset para aceptar el pase.");
  }
  const { certPem, keyPem, wwdrPem } = credenciales();

  const passJson = Buffer.from(JSON.stringify(construirPassJson(datos)), "utf-8");
  const archivos: Record<string, Buffer> = { "pass.json": passJson, ...assets };

  const manifest: Record<string, string> = {};
  for (const [nombre, contenido] of Object.entries(archivos)) {
    manifest[nombre] = sha1(contenido);
  }
  const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf-8");
  const firma = firmarManifest(manifestBuf, certPem, keyPem, wwdrPem);

  const zip = new JSZip();
  for (const [nombre, contenido] of Object.entries(archivos)) zip.file(nombre, contenido);
  zip.file("manifest.json", manifestBuf);
  zip.file("signature", firma);

  return zip.generateAsync({ type: "nodebuffer" });
}
