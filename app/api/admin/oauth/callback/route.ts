import { NextResponse, type NextRequest } from "next/server";
import { canjearCodigo, decodificarIdToken } from "@/lib/google-oauth";
import { crearCookieSesionGoogle, COOKIE_GOOGLE, SESION_MAX_MS } from "@/lib/auth";
import { esAdminPermitido, registrarAuditoria } from "@/lib/db";

// Callback del login del equipo: valida el state, canjea el code por el
// id_token, chequea el email contra la allowlist de `admins` y recién ahí
// abre sesión. Cualquier cuenta de Google puede LLEGAR hasta acá — lo que
// filtra es esAdminPermitido, no el consentimiento de OAuth en sí.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("admin_oauth_state")?.value;

  const limpiar = (res: NextResponse) => {
    res.cookies.delete("admin_oauth_state");
    return res;
  };
  const volver = (error: string) =>
    limpiar(NextResponse.redirect(new URL(`/login?error=${error}`, req.url)));

  if (!state || !cookieState || state !== cookieState) return volver("estado");

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return volver("cancelado");

  const redirectUri = `${req.nextUrl.origin}/api/admin/oauth/callback`;
  const { idToken } = await canjearCodigo(code, redirectUri);
  const datos = idToken ? decodificarIdToken(idToken) : null;
  if (!datos) return volver("google");

  const permitido = await esAdminPermitido(datos.email);
  if (!permitido) return volver("no-autorizado");

  await registrarAuditoria(datos.email, "login", "Inicio de sesión con Google");

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(COOKIE_GOOGLE, await crearCookieSesionGoogle(datos.email, datos.nombre), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESION_MAX_MS / 1000, // 30 días — el exp firmado dentro del payload es el que manda
    path: "/",
  });
  return limpiar(res);
}
