import { NextResponse, type NextRequest } from "next/server";
import { canjearCodigo, decodificarIdToken, origenCanonico, dominioCookieOauth } from "@/lib/google-oauth";
import { getClientePorCodigo, getCliente, guardarTokenGoogleComercio, esEmailAutorizadoPortal } from "@/lib/db";
import { crearCookieSesionPortal, portalRequiereLoginGoogle, COOKIE_PORTAL_GOOGLE, SESION_MAX_MS } from "@/lib/portal-auth";

// Callback del login + conexión de Google Business Profile por CLIENTE:
// canjea el code por refresh token + id_token y guarda el primero en el
// comercio que inició el flujo (leído del state, verificado contra la
// cookie httpOnly que puso /start). El comercio puede ser la cuenta o una de
// sus sucursales para el token de GBP — se revalida acá de nuevo, no alcanza
// con confiar en lo que ya validó /start.
//
// Si la CUENTA RAÍZ (nunca una sucursal — ver portalRequiereLoginGoogle)
// tiene emails cargados en portal_usuarios, el email de este login tiene que
// estar en esa lista o se rechaza antes de guardar nada: el código ya no
// alcanza solo. Si no tiene ninguno cargado, sigue el comportamiento de
// siempre (solo conecta GBP, sin gate de identidad).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const cookieState = req.cookies.get("portal_oauth_state")?.value ?? "";
  const [codigo, comercioIdState] = state.split(".");

  const limpiar = (res: NextResponse) => {
    res.cookies.delete({ name: "portal_oauth_state", domain: dominioCookieOauth(), path: "/" });
    return res;
  };

  if (!state || state !== cookieState || !codigo || !comercioIdState) {
    return limpiar(NextResponse.redirect(new URL("/", req.url)));
  }

  const cliente = await getClientePorCodigo(codigo);
  if (!cliente) return limpiar(NextResponse.redirect(new URL("/", req.url)));

  let comercioId = cliente.id;
  if (comercioIdState !== cliente.id) {
    const sucursal = await getCliente(comercioIdState);
    if (!sucursal || sucursal.comercioPadreId !== cliente.id) {
      return limpiar(NextResponse.redirect(new URL("/", req.url)));
    }
    comercioId = sucursal.id;
  }

  const volver = (resultado: string) =>
    limpiar(NextResponse.redirect(new URL(`/portal/${codigo}?google=${resultado}`, req.url)));

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return volver("cancelado");

  const redirectUri = `${origenCanonico(req.nextUrl.origin)}/api/portal/google/oauth/callback`;
  const { refreshToken, idToken } = await canjearCodigo(code, redirectUri);
  if (!refreshToken) return volver("error");

  // Gate de identidad: siempre contra la cuenta raíz (cliente.id), nunca
  // contra una sucursal — igual que codigo_acceso, portal_usuarios vive en
  // la raíz. Si el comercio no tiene ningún email cargado, no hay nada que
  // chequear (comportamiento de siempre).
  const requiereLogin = await portalRequiereLoginGoogle(cliente.id);
  if (requiereLogin) {
    const datos = idToken ? decodificarIdToken(idToken) : null;
    if (!datos) return volver("google");
    if (!(await esEmailAutorizadoPortal(cliente.id, datos.email))) {
      return volver("no-autorizado");
    }
    await guardarTokenGoogleComercio(comercioId, refreshToken);
    const res = volver("conectado");
    res.cookies.set(COOKIE_PORTAL_GOOGLE, await crearCookieSesionPortal(datos.email, datos.nombre), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      domain: dominioCookieOauth(),
      maxAge: SESION_MAX_MS / 1000,
      path: "/",
    });
    return res;
  }

  await guardarTokenGoogleComercio(comercioId, refreshToken);
  return volver("conectado");
}
