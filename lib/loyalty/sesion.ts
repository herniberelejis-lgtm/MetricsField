// Mecánica de la cookie de sesión del cliente final de Loyalty. Pure —
// sin `cookies()` de next/headers ni acceso a la base, mismo patrón que
// lib/sesion.ts (que tampoco importa next/headers: eso vive en la capa de
// arriba, lib/auth.ts / lib/portal-auth.ts). Acá pasa lo mismo: quien
// llama a `cookies().set(NOMBRE_COOKIE_MEMBRESIA, token, opcionesCookieMembresia())`
// es la Server Action de registro (L4), no este archivo.
//
// "La membresía es la credencial" (docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md
// §2): a diferencia de las cookies de admin/portal, esta cookie NO va
// firmada con HMAC. No hace falta — el token ya tiene 256 bits de
// entropía propios (generarToken() en lib/loyalty/identidad.ts), así que
// intentar forjarlo es inviable sin necesidad de una firma extra. Lo que
// autentica de verdad es la consulta a la base por su hash
// (loyalty.membresias.token_hash) — esa consulta vive en lib/db/loyalty.ts
// (L3), no acá: este archivo no toca la base a propósito, para poder
// testearse sin DATABASE_URL.
//
// CONEXIONES
//   Depende de:  nada (ni env vars ni base) — puro cálculo de strings.
//   Lo usan:
//     - app/(loyalty)/l/[codigo]/actions.ts → escribe la cookie con
//       `cookies().set(NOMBRE_COOKIE_MEMBRESIA, token, opcionesCookieMembresia())`
//       tras crear/recuperar la membresía
//     - app/(loyalty)/tarjeta/*  (L4/L5) → lee la cookie con
//       `tokenConFormaValida(...)` antes de hashearla y consultar
//       lib/db/loyalty.ts::obtenerMembresiaPorTokenHash

export const NOMBRE_COOKIE_MEMBRESIA = "loyalty_membresia";

// Una tarjeta de fidelización no es una sesión de 30 días como el panel
// de admin — se espera que dure meses. 400 días para quedar debajo del
// límite de ~400 días que Chrome impone a `Max-Age` en cookies.
export const MAX_EDAD_MEMBRESIA_MS = 1000 * 60 * 60 * 24 * 400;

/** Opciones para `cookies().set(NOMBRE_COOKIE_MEMBRESIA, token, ...)`.
 * Es una función (no un objeto estático) porque `secure` depende de
 * NODE_ENV en el momento de la request, igual que el resto de las
 * cookies del repo (ver app/login/actions.ts). */
export function opcionesCookieMembresia(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_EDAD_MEMBRESIA_MS / 1000,
    path: "/",
  };
}

// Largo exacto de generarToken(): 32 bytes en base64url, sin padding.
const LARGO_TOKEN = 43;
const FORMATO_TOKEN = /^[A-Za-z0-9_-]+$/;

/** Valida la FORMA de un valor de cookie antes de gastar un hash y una
 * consulta a la base con él — rechaza basura barato (cookie vacía,
 * truncada, o con caracteres que generarToken() nunca produciría). No
 * reemplaza la verificación real: un token con la forma correcta pero que
 * no exista en la base sigue sin autenticar nada, eso lo decide la
 * consulta de L3. */
export function tokenConFormaValida(valor: string | undefined | null): valor is string {
  return typeof valor === "string" && valor.length === LARGO_TOKEN && FORMATO_TOKEN.test(valor);
}
