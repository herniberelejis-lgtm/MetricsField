import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getClientePorCodigo, getCliente } from "@/lib/db";
import {
  oauthConfigurado,
  urlDeAutorizacion,
  origenCanonico,
  dominioCookieOauth,
  PORTAL_SCOPE,
} from "@/lib/google-oauth";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

// Arranca el login + conexión de Google Business Profile del CLIENTE (no de
// la agencia): un solo consentimiento pide identidad (para chequear contra
// portal_usuarios, si el comercio exige login) Y acceso a su ficha de
// Business Profile — ver PORTAL_SCOPE. El código de acceso del portal sigue
// siendo necesario para llegar hasta acá (identifica DE QUÉ comercio es este
// login), pero ya no alcanza solo con eso si el comercio tiene emails
// cargados: el callback exige además que la cuenta de Google esté en esa
// allowlist. El state lleva el código + a qué comercio corresponde (la
// cuenta o una de sus sucursales — multi-sucursal: cada local tiene su
// propia ficha de Google) + un nonce anti-CSRF, y se verifica contra la
// cookie en el callback.
export async function GET(req: NextRequest): Promise<NextResponse> {
  limpiarVencidos();
  const ip = ipDelRequest(req.headers);
  if (!(await permitir(`portal-codigo:${ip}`, 20, 10 * 60_000))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const codigo = req.nextUrl.searchParams.get("codigo") ?? "";
  const cliente = await getClientePorCodigo(codigo);
  if (!cliente) return NextResponse.redirect(new URL("/", req.url));

  // comercioId por defecto = la cuenta misma (caso de siempre, un solo
  // local). Si viene explícito, tiene que ser la cuenta o una sucursal suya.
  const comercioIdParam = req.nextUrl.searchParams.get("comercioId") || cliente.id;
  let comercioId = cliente.id;
  if (comercioIdParam !== cliente.id) {
    const sucursal = await getCliente(comercioIdParam);
    if (sucursal && sucursal.comercioPadreId === cliente.id) comercioId = sucursal.id;
  }

  if (!oauthConfigurado()) {
    return NextResponse.redirect(
      new URL(`/portal/${codigo}?google=no-configurado`, req.url),
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${codigo}.${comercioId}.${nonce}`;
  const redirectUri = `${origenCanonico(req.nextUrl.origin)}/api/portal/google/oauth/callback`;
  const res = NextResponse.redirect(
    urlDeAutorizacion({ redirectUri, state, scope: PORTAL_SCOPE, offline: true }),
  );
  res.cookies.set("portal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    domain: dominioCookieOauth(),
    maxAge: 600,
    path: "/",
  });
  return res;
}
