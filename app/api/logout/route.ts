import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Solo desde la propia app: otro sitio no puede cerrar la sesión del panel
  // con un formulario oculto.
  const origen = req.headers.get("origin");
  if (origen && origen !== new URL(req.url).origin) {
    return new NextResponse("Origen no permitido", { status: 403 });
  }
  const jar = await cookies();
  jar.delete("admin_session");
  jar.delete("admin_google_session");
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
