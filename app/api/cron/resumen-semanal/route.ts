import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisosPiezas, enviarResumenesSemanales } from "@/lib/db";

// "Tu semana en Google": cada lunes a las 12:00 UTC = 09:00 en Córdoba (ver
// vercel.json). Mismo control que el cron de sincronización: Vercel Cron
// llama con Authorization: Bearer <CRON_SECRET>.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Falta configurar CRON_SECRET" }, { status: 503 });
    }
  } else {
    const esperado = Buffer.from(`Bearer ${secret}`);
    const recibido = Buffer.from(req.headers.get("authorization") ?? "");
    const ok = recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
    if (!ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Los comercios del panel y, aparte, quien compró piezas sueltas y pidió
  // el aviso semanal gratis al activarlas.
  const comercios = await enviarResumenesSemanales();
  const piezas = await enviarAvisosPiezas();
  return NextResponse.json({ ...comercios, piezas });
}
