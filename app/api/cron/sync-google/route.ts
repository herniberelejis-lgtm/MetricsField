import { NextResponse, type NextRequest } from "next/server";
import {
  sincronizarGoogleTodos,
  sincronizarRendimientoTodos,
  snapshotCompetenciaMensual,
} from "@/lib/db";

// Job diario (ver vercel.json) que actualiza rating/reseñas de todos los
// comercios con Google Place ID cargado. Vercel Cron llama esta ruta con
// un header Authorization: Bearer <CRON_SECRET> — lo verificamos para que
// nadie más pueda disparar el sync desde afuera.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // En producción, sin secreto configurado el endpoint queda cerrado:
    // abierto sería una puerta para que cualquiera queme cuota de la API.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Falta configurar CRON_SECRET" }, { status: 503 });
    }
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const resenas = await sincronizarGoogleTodos();
  const rendimiento = await sincronizarRendimientoTodos();
  // Congela la foto de competencia del mes en curso con los ratings recién
  // sincronizados — así el benchmarking histórico se arma solo.
  const competencia = await snapshotCompetenciaMensual();
  return NextResponse.json({ resenas, rendimiento, competencia });
}
