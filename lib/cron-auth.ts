import "server-only";
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Verifica el header `Authorization: Bearer <CRON_SECRET>` con que Vercel
 * Cron llama a las rutas de /api/cron. Devuelve null si la llamada está
 * autorizada, o la respuesta de error que la ruta debe devolver tal cual.
 *
 * En producción, sin CRON_SECRET configurado la ruta queda cerrada:
 * abierta sería una puerta para que cualquiera dispare el job desde
 * afuera. En desarrollo (sin secreto) se deja pasar para poder probarlo. */
export function verificarCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Falta configurar CRON_SECRET" }, { status: 503 });
    }
    return null;
  }

  const esperado = Buffer.from(`Bearer ${secret}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const ok = recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
  return ok ? null : NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
