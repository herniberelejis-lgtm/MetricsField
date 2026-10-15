import { NextResponse, type NextRequest } from "next/server";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";
import { COOKIE_CLIENTE_FINAL, leerCookieClienteFinal } from "@/lib/loyalty-firma";
import { hashearIp } from "@/lib/loyalty-antifraude";
import { appleWalletConfigurado, comercioConLoyalty, linkTarjeta, origenLoyalty } from "@/lib/loyalty";
import { calcularSaldo, getClienteFinal, getMembresia, registrarEventoLoyalty } from "@/lib/db/loyalty";
import { generarPkpass } from "@/lib/wallet/apple";
import { ASSETS_PASE_APPLE } from "@/lib/wallet/apple-assets";

// Botón "Agregar a Apple Wallet": arma el .pkpass en el momento, con el saldo
// de ese instante, y lo devuelve para que el iPhone lo abra. Mismo esquema que
// ./google: mismo guardia (comercioConLoyalty), la sesión del cliente decide de
// quién es la tarjeta (nunca un id que llegue por la URL), límite por IP, y el
// clic queda registrado como "wallet_guardada" para el KPI tap → wallet.
//
// Es un pase ESTÁTICO: Apple no lo actualiza solo (sin web service ni push),
// así que el dorso trae el link "Ver mis puntos al día". Cada vez que el cliente
// vuelve a tocar este botón se arma un pase nuevo con el saldo actual.
//
// Firmar el pase (RSA + PKCS#7) cuesta CPU: por eso hay límite por IP y no se
// arma nada antes de comprobar el comercio y la sesión.

export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const volver = NextResponse.redirect(new URL(`/l/${encodeURIComponent(codigo)}?wallet=error`, req.nextUrl.origin), 303);

  limpiarVencidos();
  const ip = ipDelRequest(req.headers);
  if (!(await permitir(`loyalty-apple:${ip}`, 20, 10 * 60_000))) return volver;
  const ctx = await comercioConLoyalty(codigo);
  if (!ctx || !appleWalletConfigurado()) return volver;

  const clienteFinalId = leerCookieClienteFinal(req.cookies.get(COOKIE_CLIENTE_FINAL)?.value);
  const membresia = clienteFinalId ? await getMembresia(clienteFinalId, codigo) : null;
  const persona = clienteFinalId ? await getClienteFinal(clienteFinalId) : null;
  if (!membresia || !persona) return NextResponse.redirect(new URL(`/l/${encodeURIComponent(codigo)}`, req.nextUrl.origin), 303);

  const saldo = await calcularSaldo(membresia.id);
  const origen = await origenLoyalty();

  let pase: Buffer;
  try {
    pase = await generarPkpass(
      {
        serialNumber: membresia.id,
        nombreComercio: ctx.comercio.nombre,
        nombreCliente: persona.nombre,
        saldo,
        urlTarjeta: linkTarjeta(origen, codigo, membresia.id),
      },
      ASSETS_PASE_APPLE,
    );
  } catch (e) {
    // Solo el mensaje: nunca el objeto (podría arrastrar datos del cliente).
    console.error("Loyalty: no se pudo armar el pase de Apple:", e instanceof Error ? e.message : e);
    return volver;
  }

  await registrarEventoLoyalty({
    comercioId: codigo,
    clienteFinalId: persona.id,
    tipo: "wallet_guardada",
    ipHash: hashearIp(ip),
  });

  return new Response(new Uint8Array(pase), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="tarjeta.pkpass"',
      // El saldo cambia y es de una persona: nada de cachés compartidas.
      "Cache-Control": "private, no-store",
    },
  });
}
