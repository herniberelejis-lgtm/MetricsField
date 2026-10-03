// `npm audit --audit-level=high` con excepciones explícitas y con fecha de
// vencimiento. npm no permite ignorar un aviso puntual: sin esto, un aviso
// sin parche que no nos afecta deja el CI rojo para siempre, y la única
// salida sería apagar la auditoría entera (mucho peor).
//
// Reglas para agregar una excepción: (1) no hay versión corregida, (2) está
// verificado en el código que la función vulnerable NO se usa, (3) lleva
// fecha de vencimiento — al vencer el CI vuelve a fallar y obliga a revisar.
import { execSync } from "node:child_process";

const EXCEPCIONES = {
  // node-forge: falla en la VERIFICACIÓN de firmas RSA PKCS#1 v1.5.
  // lib/wallet/apple.ts solo FIRMA pases de Apple Wallet (pkcs7
  // createSignedData + sign) con nuestro propio certificado; nunca verifica
  // una firma recibida de afuera. Sin parche publicado al 02/10/2026.
  "GHSA-86w9-cpqp-85rv": "2026-12-31",
  // braces (lo traen tailwindcss y eslint-config-next, vía micromatch /
  // fast-glob): caída por stack con patrones de glob muy anidados. Solo
  // corre en build/lint, sobre los patrones de NUESTRA configuración
  // (tailwind.config, eslint) — nunca con input de un usuario, y no llega
  // al bundle de producción. Sin versión corregida al 03/10/2026.
  "GHSA-vfj7-8cjw-p6xm": "2026-12-31",
};

let salida;
try {
  salida = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch (e) {
  salida = e.stdout; // npm audit sale con código != 0 si encuentra algo
}
const { vulnerabilities = {} } = JSON.parse(salida);
const hoy = new Date().toISOString().slice(0, 10);

const bloqueantes = [];
for (const [paquete, v] of Object.entries(vulnerabilities)) {
  if (!["high", "critical"].includes(v.severity)) continue;
  const avisos = v.via.filter((x) => typeof x === "object");
  // Un paquete marcado solo por depender de otro vulnerable (via = nombres)
  // se resuelve en el paquete de origen, que también aparece en la lista.
  if (avisos.length === 0) continue;
  for (const a of avisos) {
    const id = a.url.split("/").pop();
    const vence = EXCEPCIONES[id];
    if (vence && hoy <= vence) {
      console.log(`· ${paquete} ${id}: exceptuado hasta ${vence}`);
    } else {
      bloqueantes.push(`${paquete} (${v.severity}) ${a.url}${vence ? ` — excepción vencida el ${vence}` : ""}`);
    }
  }
}

if (bloqueantes.length > 0) {
  console.error("Vulnerabilidades altas/críticas sin resolver:\n" + bloqueantes.map((b) => `  - ${b}`).join("\n"));
  process.exit(1);
}
console.log("Sin vulnerabilidades altas/críticas pendientes.");
