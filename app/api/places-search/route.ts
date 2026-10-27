import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, emailAdminActual } from "@/lib/auth";
import { searchGooglePlace } from "@/lib/places";
import { permitirConsultaPaga } from "@/lib/places-seguridad";
import { ipDelRequest } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Usado solo desde el formulario de cliente (Editar suscripción / Nuevo
// cliente) para encontrar el place_id de un negocio buscando por nombre,
// sin que el equipo tenga que pelearse con la herramienta de Google.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  try {
    await requireAdmin();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No autorizado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 120) return NextResponse.json({ error: "La búsqueda es demasiado larga." }, { status: 400 });
  if (q.trim().length < 3) {
    return NextResponse.json({ resultados: [] });
  }

  const actor = (await emailAdminActual()) || ipDelRequest(req.headers);
  if (!(await permitirConsultaPaga(`admin-busqueda:${actor}`, 30, 3600_000))) {
    return NextResponse.json({ error: "Consultas pausadas o límite alcanzado. Intentá más tarde." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const resultado = await searchGooglePlace(q);
  if (!resultado.ok) {
    const error =
      resultado.motivo === "sin-key"
        ? "Falta configurar GOOGLE_PLACES_API_KEY en el servidor."
        : "Google no está disponible o se alcanzó el cupo de consultas. Intentá más tarde.";
    return NextResponse.json({ error }, { status: 503 });
  }

  return NextResponse.json({ resultados: resultado.resultados }, { headers: { "Cache-Control": "private, no-store" } });
}
