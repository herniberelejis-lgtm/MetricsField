import { NextResponse, type NextRequest } from "next/server";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";
import { COOKIE_CLIENTE_FINAL, leerCookieClienteFinal } from "@/lib/loyalty-firma";
import { hashearIp } from "@/lib/loyalty-antifraude";
import { comercioConLoyalty, emitirTarjetaGoogle, linkTarjeta, origenLoyalty, walletGoogleConfigurado } from "@/lib/loyalty";
import { calcularSaldo, getClienteFinal, getMembresia, registrarEventoLoyalty } from "@/lib/db/loyalty";
import { generarLinkGuardar } from "@/lib/wallet/google";

// Botón "Guardar en Google Wallet": arma el link firmado en el momento (el
// JWT no viaja dentro del HTML de la página) y deja registrado el clic —
// es el evento "wallet_guardada" del KPI tap → wallet del piloto. Si la
// tarjeta había quedado sin emitir (Google caído en el alta), se reintenta
// acá antes de mandar al cliente a Google.

export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const volver = NextResponse.redirect(new URL(`/l/${encodeURIComponent(codigo)}?wallet=error`, req.nextUrl.origin), 303);

  limpiarVencidos();
  const ip = ipDelRequest(req.headers);
  if (!(await permitir(`loyalty-wallet:${ip}`, 20, 10 * 60_000))) return volver;
  const ctx = await comercioConLoyalty(codigo);
  if (!ctx || !walletGoogleConfigurado()) return volver;

  const clienteFinalId = leerCookieClienteFinal(req.cookies.get(COOKIE_CLIENTE_FINAL)?.value);
  const membresia = clienteFinalId ? await getMembresia(clienteFinalId, codigo) : null;
  const persona = clienteFinalId ? await getClienteFinal(clienteFinalId) : null;
  if (!membresia || !persona) return NextResponse.redirect(new URL(`/l/${encodeURIComponent(codigo)}`, req.nextUrl.origin), 303);

  const saldo = await calcularSaldo(membresia.id);
  const origen = await origenLoyalty();
  let classId = ctx.programa.googleClassId;
  let objectId = membresia.googleObjectId;
  if (membresia.estadoGoogle !== "emitido" || !classId || !objectId) {
    const emitida = await emitirTarjetaGoogle({ ...ctx, membresia, nombreCliente: persona.nombre, saldo, origen });
    if (!emitida) return volver;
    classId = emitida.classId;
    objectId = emitida.objectId;
  }

  await registrarEventoLoyalty({
    comercioId: codigo,
    clienteFinalId: persona.id,
    tipo: "wallet_guardada",
    ipHash: hashearIp(ip),
  });
  const link = generarLinkGuardar({
    classId,
    objectId,
    nombreCliente: persona.nombre,
    saldo,
    linkTarjeta: linkTarjeta(origen, codigo, membresia.id),
  });
  return NextResponse.redirect(link, 303);
}
