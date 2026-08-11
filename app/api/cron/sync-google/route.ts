import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  sincronizarGoogleTodos,
  sincronizarRendimientoTodos,
  sincronizarResenasGoogleTodos,
  sincronizarCompetidoresTodos,
  snapshotCompetenciaMensual,
  enviarResumenesMensuales,
  avisarGoogleDesconectado,
} from "@/lib/db";

// Job diario (ver vercel.json) que actualiza rating/reseñas de todos los
// comercios con Google Place ID cargado. Vercel Cron llama esta ruta con
// un header Authorization: Bearer <CRON_SECRET> — lo verificamos para que
// nadie más pueda disparar el sync desde afuera.

// Sin esto la función se cortaba con el timeout default a mitad de la
// lista y los últimos comercios quedaban sin sincronizar en silencio.
// 60s es el techo del plan Hobby; en Pro se puede subir a 300.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // En producción, sin secreto configurado el endpoint queda cerrado:
    // abierto sería una puerta para que cualquiera queme cuota de la API.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Falta configurar CRON_SECRET" }, { status: 503 });
    }
  } else {
    const esperado = Buffer.from(`Bearer ${secret}`);
    const recibido = Buffer.from(req.headers.get("authorization") ?? "");
    const ok = recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const resenas = await sincronizarGoogleTodos();
  const rendimiento = await sincronizarRendimientoTodos();
  // No hace nada (0 en todos los conteos) mientras GOOGLE_REVIEWS_API_ENABLED
  // no esté prendido — ver lib/google-reviews.ts.
  const resenasDetalle = await sincronizarResenasGoogleTodos();
  // Actualiza el rating/reseñas de cada competidor con place_id cargado
  // ANTES de congelar la foto del mes — si no, snapshotCompetenciaMensual
  // fotografía lo último tipeado a mano en vez de un dato fresco.
  const competidores = await sincronizarCompetidoresTodos();
  // Congela la foto de competencia del mes en curso con los ratings recién
  // sincronizados — así el benchmarking histórico se arma solo.
  const competencia = await snapshotCompetenciaMensual();

  // Resumen mensual: solo el día 1, para no mandarlo todos los días. Si el
  // cron falla justo ese día no hay reintento hasta el próximo mes — es un
  // resumen, no una alerta urgente (esas van por evento en lib/alertas.ts,
  // no dependen de esta fecha).
  const resumenes =
    new Date().getUTCDate() === 1 ? await enviarResumenesMensuales() : { total: 0, enviados: 0 };

  // Va al final a propósito: si algo de arriba falla, el aviso de clientes
  // desconectados no aporta nada todavía. Mientras la app siga en modo Prueba
  // esto avisa por el webhook cada vez que a un cliente se le vence el permiso.
  const desconectados = await avisarGoogleDesconectado();

  return NextResponse.json({
    resenas,
    rendimiento,
    resenasDetalle,
    competidores,
    competencia,
    resumenes,
    desconectados,
  });
}
