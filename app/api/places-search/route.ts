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

  const resultados = await searchGooglePlace(q);
  if (resultados === null) {
    return NextResponse.json(
      { error: "Falta configurar GOOGLE_PLACES_API_KEY en el servidor." },
      { status: 503 },
    );
  }

  return NextResponse.json({ resultados });
}
