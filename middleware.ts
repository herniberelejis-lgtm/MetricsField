import { NextResponse, type NextRequest } from "next/server";
import { cookiePasswordValida, leerCookieSesionGoogle } from "@/lib/sesion";

// Protege el panel interno (/admin) con dos formas de sesión válidas:
// contraseña compartida (ADMIN_PASSWORD) o login con Google (allowlist de
// `admins`, ver /api/admin/oauth/callback). Todo lo demás es público: la
// landing (/), el portal de clientes (/portal/…), la página de tap (/t/…)
// y /login.
// Sin ADMIN_PASSWORD configurada: /admin abierto en desarrollo (tu PC),
// bloqueado en producción (nunca se publica el panel sin contraseña).
//
// La verificación de las cookies (formato, firma HMAC y vencimiento) vive
// en lib/sesion.ts, compartida con lib/auth.ts — una sola implementación
// para el guard de acá y el de las server actions (requireAdmin).

const PROTEGIDAS = /^\/admin(\/|$)/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTEGIDAS.test(pathname)) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    // producción sin contraseña: mandar a /login, que explica cómo configurarla
  } else {
    const cookiePassword = req.cookies.get("admin_session")?.value;
    if (cookiePassword && (await cookiePasswordValida(cookiePassword, password))) {
      return NextResponse.next();
    }
  }

  const cookieGoogle = req.cookies.get("admin_google_session")?.value;
  const claveGoogle = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  if (cookieGoogle && (await leerCookieSesionGoogle(cookieGoogle, claveGoogle))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Solo /admin/* pasa por acá: correr el middleware en la landing, el portal
// y sobre todo en /t/[slug] (la ruta más caliente, cada tap de un cliente
// final) era latencia y facturación Edge sin ningún efecto.
export const config = {
  matcher: ["/admin/:path*"],
};
