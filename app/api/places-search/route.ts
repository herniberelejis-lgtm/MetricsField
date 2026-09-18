import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchGooglePlace } from "@/lib/places";

// Usado solo desde el formulario de cliente (Editar suscripción / Nuevo
// cliente) para encontrar el place_id de un negocio buscando por nombre,
// sin que el equipo tenga que pelearse con la herramienta de Google.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No autorizado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 3) {
    return NextResponse.json({ resultados: [] });
  }

  const resultado = await searchGooglePlace(q);
  if (!resultado.ok) {
    const error =
      resultado.motivo === "sin-key"
        ? "Falta configurar GOOGLE_PLACES_API_KEY en el servidor."
        : `Google rechazó la key (HTTP ${resultado.status}) — no es que falte configurarla. Revisá en Google Cloud Console: que "Places API (New)" esté habilitada, que el proyecto tenga facturación activa, y que la key no tenga restricción de HTTP referrer (no aplica a llamadas server-side — usá restricción por API en su lugar).`;
    return NextResponse.json({ error }, { status: 503 });
  }

  return NextResponse.json({ resultados: resultado.resultados });
}
