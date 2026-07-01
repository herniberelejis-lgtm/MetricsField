import { NextResponse, type NextRequest } from "next/server";

// Protege el panel interno con la contraseña de ADMIN_PASSWORD.
// Público sin login: el portal de clientes (/portal/…) y /login.
// Sin ADMIN_PASSWORD configurada: abierto en desarrollo (tu PC),
// bloqueado en producción (nunca se publica el panel sin contraseña).

const PUBLICAS = [/^\/portal(\/|$)/, /^\/login(\/|$)/];

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(texto),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((r) => r.test(pathname))) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    // producción sin contraseña: mandar a /login, que explica cómo configurarla
  } else {
    const cookie = req.cookies.get("admin_session")?.value;
    if (cookie === (await sha256(password))) return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
