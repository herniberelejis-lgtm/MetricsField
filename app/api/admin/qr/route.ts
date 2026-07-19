import { NextResponse, type NextRequest } from "next/server";
import { tieneSesionAdmin } from "@/lib/auth";
import { getLink } from "@/lib/db";
import { generarQrPng, urlPublicaDeTap } from "@/lib/qr";

// QR real del link NFC de un cliente: codifica /t/<slug> tal cual, así el
// standee impreso con este QR abre exactamente la misma página que abre el
// tap por NFC — misma página de destino, mismo conteo de taps (source=web hoy; si
// se quiere diferenciar "vino por QR" hay que agregar un ?s=qr al final acá
// y sumarlo a getTapsPorDia/registrarTap más adelante).
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await tieneSesionAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const linkId = req.nextUrl.searchParams.get("linkId");
  if (!linkId) {
    return NextResponse.json({ error: "Falta linkId" }, { status: 400 });
  }

  const link = await getLink(linkId);
  if (!link) {
    return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
  }

  const targetUrl = urlPublicaDeTap(link.id, req.nextUrl.origin);
  const png = await generarQrPng(targetUrl);

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "no-store",
  };
  if (req.nextUrl.searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="qr-${link.id}.png"`;
  }

  return new NextResponse(new Uint8Array(png), { headers });
}
