import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { oauthConfigurado, urlDeAutorizacion, origenCanonico, ADMIN_SCOPE } from "@/lib/google-oauth";

// Login del equipo con Google (no confundir con la conexión de Business
// Profile del cliente): solo pide identidad (openid email profile), no
// datos de ninguna ficha. La allowlist se verifica en el callback.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!oauthConfigurado()) {
    return NextResponse.redirect(new URL("/login?error=google-no-configurado", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origenCanonico(req.nextUrl.origin)}/api/admin/oauth/callback`;
  const res = NextResponse.redirect(
    urlDeAutorizacion({ redirectUri, state, scope: ADMIN_SCOPE }),
  );
  res.cookies.set("admin_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
