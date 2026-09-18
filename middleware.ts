import { NextResponse, type NextRequest } from "next/server";
import { cookiePasswordValida, leerCookieSesionGoogle } from "@/lib/sesion";

// Dos trabajos en un solo middleware, porque Next.js solo permite uno:
//
// 1) CSP con nonce por request — antes vivía como header estático en
//    next.config.ts, pero "script-src 'self'" sin nonce bloquea los propios
//    scripts de hidratación que inyecta Next.js (probado a mano: rompía
//    /login). La única forma correcta de permitir ESOS scripts sin volver a
//    "unsafe-inline" (que anula la protección real contra un XSS futuro) es
//    un nonce distinto por request, generado acá y propagado por header a
//    los Server Components — por eso esto corre en TODAS las rutas, no solo
//    en una lista fija.
//
// 2) Protege el panel interno (/admin) con dos formas de sesión válida:
//    contraseña compartida (ADMIN_PASSWORD) o login con Google (allowlist de
//    `admins`, ver /api/admin/oauth/callback). Todo lo demás sigue siendo
//    público: la landing (/), el portal de clientes (/portal/…), la página
//    de tap (/t/…) y /login — esas rutas solo pasan por la parte 1 (CSP),
//    nunca por el chequeo de sesión de acá abajo.
//    Sin ADMIN_PASSWORD configurada: /admin abierto en desarrollo (tu PC),
//    bloqueado en producción (nunca se publica el panel sin contraseña).
//
// La verificación de las cookies (formato, firma HMAC y vencimiento) vive
// en lib/sesion.ts, compartida con lib/auth.ts — una sola implementación
// para el guard de acá y el de las server actions (requireAdmin).

const PROTEGIDAS = /^\/admin(\/|$)/;

function construirCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nonce por request: viaja a los Server Components por header de REQUEST
  // (x-nonce, lo lee app/layout.tsx con headers()) y a la CSP real por
  // header de RESPUESTA — tienen que ser el mismo valor para que el
  // navegador acepte los scripts que Next.js marca con ese nonce.
  // style-src NO lleva nonce: probado a mano (rompía la pestaña Competidores
  // del portal) — la CSP ignora 'unsafe-inline' por completo en cuanto hay un
  // nonce en la misma directiva (así lo define el spec), y esta app usa
  // montones de style={{...}} inline para valores calculados (barras de
  // gráficos, posición de tooltips) que React nunca les pone el nonce. Sin
  // nonce ahí, 'unsafe-inline' sí se aplica — inyección de ESTILOS es un
  // riesgo bajo comparado con scripts, que sí quedan estrictos.
  const nonce = crypto.randomUUID();
  const csp = construirCsp(nonce);

  const headersConNonce = new Headers(req.headers);
  headersConNonce.set("x-nonce", nonce);

  function siguiente(): NextResponse {
    const res = NextResponse.next({ request: { headers: headersConNonce } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  function aLogin(): NextResponse {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  if (!PROTEGIDAS.test(pathname)) return siguiente();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return siguiente();
    // producción sin contraseña: mandar a /login, que explica cómo configurarla
  } else {
    const cookiePassword = req.cookies.get("admin_session")?.value;
    if (cookiePassword && (await cookiePasswordValida(cookiePassword, password))) {
      return siguiente();
    }
  }

  const cookieGoogle = req.cookies.get("admin_google_session")?.value;
  const claveGoogle = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  if (cookieGoogle && (await leerCookieSesionGoogle(cookieGoogle, claveGoogle))) {
    return siguiente();
  }

  return aLogin();
}

// Corre en todo menos los assets estáticos de Next (_next/static, imágenes
// optimizadas, favicon) — no tiene sentido generar nonce ni CSP para un
// archivo binario que el navegador no va a interpretar como HTML/JS.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
