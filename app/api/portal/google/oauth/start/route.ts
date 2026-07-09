import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getClientePorCodigo } from "@/lib/db";
import { oauthConfigurado, urlDeAutorizacion, GBP_SCOPE } from "@/lib/google-oauth";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

// Arranca la conexión de Google Business Profile del CLIENTE (no de la
// agencia): cada comercio autoriza con su propia cuenta desde su portal.
// El código de acceso del portal ya funciona como credencial — no hace
// falta sesión de admin acá. El state lleva el código (no es secreto en sí,
// solo identifica a qué comercio corresponde) + un nonce anti-CSRF, y se
// verifica contra la cookie en el callback.
export async function GET(req: NextRequest): Promise<NextResponse> {
  limpiarVencidos();
  const ip = ipDelRequest(req.headers);
  if (!permitir(`portal-codigo:${ip}`, 20, 10 * 60_000)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const codigo = req.nextUrl.searchParams.get("codigo") ?? "";
  const cliente = await getClientePorCodigo(codigo);
  if (!cliente) return NextResponse.redirect(new URL("/", req.url));

  if (!oauthConfigurado()) {
    return NextResponse.redirect(
      new URL(`/portal/${codigo}?google=no-configurado`, req.url),
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${codigo}.${nonce}`;
  const redirectUri = `${req.nextUrl.origin}/api/portal/google/oauth/callback`;
  const res = NextResponse.redirect(
    urlDeAutorizacion({ redirectUri, state, scope: GBP_SCOPE, offline: true }),
  );
  res.cookies.set("portal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
