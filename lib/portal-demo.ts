// Códigos de portal que están publicados: el de la cuenta demo que muestra
// la landing (`/portal/demo2026`) y los de los datos de ejemplo de
// db/seed.sql y db/23-seed-cliente-prueba.sql, que viven en el repo. Quien
// los lea puede abrir esos portales, así que en producción esas cuentas son
// de SOLO LECTURA: se pueden mirar, pero ninguna acción del portal escribe
// ni gasta cuota con ellos. En previews, local y CI siguen siendo
// escribibles — las pruebas e2e los usan como control positivo.
const CODIGOS_PUBLICADOS = new Set([
  "demo2026",
  "demo2026-g",
  "demo2026-c",
  "bg7k2m4p",
  "rn9x3c5v",
  "cg2h8j6l",
  "ta5q1w9e",
  "vc4r7t2y",
  "gg8u3i6o",
  "en1a5s9d",
]);

export function esCodigoPublicado(codigo: string): boolean {
  return CODIGOS_PUBLICADOS.has(String(codigo ?? "").trim().toLowerCase());
}

/** true si este código de portal no puede hacer cambios en este entorno. */
export function portalSoloLectura(codigo: string): boolean {
  return process.env.VERCEL_ENV === "production" && esCodigoPublicado(codigo);
}

export const MENSAJE_SOLO_LECTURA = "Este es un portal de demostración: los cambios están desactivados.";
