import sharp from "sharp";
import { getComercioLoyalty } from "@/lib/db/loyalty";
import { getLogoComercio } from "@/lib/db";

// Logo del comercio para su tarjeta de Google Wallet: Google lo baja desde
// sus servidores (por eso es público) y pide un cuadrado de 660×660. Se
// sirve solo para comercios con Loyalty — no es una forma de bajar el logo
// de cualquier cliente. Sin logo propio, 404 (la clase usa el de
// MetricsField, ver urlLogoTarjeta en lib/wallet/google.ts).

export async function GET(_req: Request, { params }: { params: Promise<{ comercioId: string }> }) {
  const { comercioId } = await params;
  const comercio = await getComercioLoyalty(comercioId);
  if (!comercio?.tieneLoyalty) return new Response("No encontrado", { status: 404 });
  const logo = await getLogoComercio(comercioId);
  if (!logo) return new Response("No encontrado", { status: 404 });

  try {
    const png = await sharp(logo.datos)
      .resize(560, 560, { fit: "contain", background: "#ffffff" })
      .extend({ top: 50, bottom: 50, left: 50, right: 50, background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
