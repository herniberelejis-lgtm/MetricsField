import { NextResponse, type NextRequest } from "next/server";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";
import { COOKIE_CLIENTE_FINAL, crearCookieClienteFinal, leerTokenTarjeta } from "@/lib/loyalty-firma";
import { comercioConLoyalty } from "@/lib/loyalty";
import { getMembresiaPorId } from "@/lib/db/loyalty";

// "Ver mis puntos y beneficios" dentro del pase de Google Wallet: el token
// firmado de la tarjeta le devuelve la sesión al cliente (celular nuevo,
// cookies borradas). Route handler y no página porque tiene que poner una
// cookie. Token inválido o de otro comercio: a la landing sin sesión.

export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const destino = new URL(`/l/${encodeURIComponent(codigo)}`, req.nextUrl.origin);
  const res = NextResponse.redirect(destino, 303);

  limpiarVencidos();
  if (!(await permitir(`loyalty-entrar:${ipDelRequest(req.headers)}`, 30, 10 * 60_000))) return res;
  if (!(await comercioConLoyalty(codigo))) return res;

  const membresiaId = leerTokenTarjeta(req.nextUrl.searchParams.get("tarjeta") ?? undefined);
  const membresia = membresiaId ? await getMembresiaPorId(membresiaId) : null;
  if (!membresia || membresia.comercioId !== codigo) return res;

  res.cookies.set(COOKIE_CLIENTE_FINAL, crearCookieClienteFinal(membresia.clienteFinalId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
