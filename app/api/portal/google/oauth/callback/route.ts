import { NextResponse, type NextRequest } from "next/server";
import { canjearCodigo } from "@/lib/google-oauth";
import { getClientePorCodigo, getCliente, guardarTokenGoogleComercio } from "@/lib/db";

// Callback del OAuth de Google Business Profile por CLIENTE: canjea el code
// por un refresh token y lo guarda en el comercio que inició el flujo (leído
// del state, verificado contra la cookie httpOnly que puso /start). El
// comercio puede ser la cuenta o una de sus sucursales — se revalida acá de
// nuevo, no alcanza con confiar en lo que ya validó /start.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const cookieState = req.cookies.get("portal_oauth_state")?.value ?? "";
  const [codigo, comercioIdState] = state.split(".");

  const limpiar = (res: NextResponse) => {
    res.cookies.delete("portal_oauth_state");
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

  const redirectUri = `${req.nextUrl.origin}/api/portal/google/oauth/callback`;
  const { refreshToken } = await canjearCodigo(code, redirectUri);
  if (!refreshToken) return volver("error");

  await guardarTokenGoogleComercio(comercioId, refreshToken);
  return volver("conectado");
}
