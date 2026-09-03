import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/auth";
import { getInventarioHardware } from "@/lib/db";
import { generarQrPng, urlPublicaDeTap } from "@/lib/qr";

// Exportación masiva para mandar a imprimir. Por defecto solo las piezas
// libres (recién generadas, sin cliente todavía) — son las que hay que
// mandarle al proveedor. ?estado=todas trae también las ya asignadas (por
// si hace falta reimprimir alguna puntual).
//
// ?formato=zip (default): un .zip con un PNG por pieza, nombrado por su
// código fijo (qr-p-0001.png...) — para proveedores que solo imprimen la
// imagen tal cual se las mandás.
// ?formato=links: lista de texto plano, una URL por línea (el mismo link
// que codifica cada QR) — para proveedores que arman ellos mismos el QR a
// partir de una lista de datos.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No autorizado" }, { status: 401 });
  }

  const lote = req.nextUrl.searchParams.get("lote");
  const estado = req.nextUrl.searchParams.get("estado") ?? "libre";
  const formato = req.nextUrl.searchParams.get("formato") ?? "zip";

  const inventario = await getInventarioHardware();
  const piezas = inventario.filter((p) => {
    if (lote && p.lote !== lote) return false;
    if (estado === "libre" && p.comercioId) return false;
    return true;
  });

  if (piezas.length === 0) {
    return NextResponse.json(
      { error: "No hay piezas para descargar con ese filtro." },
      { status: 404 },
    );
  }

  if (formato === "links") {
    const links = piezas.map((p) => urlPublicaDeTap(p.id, req.nextUrl.origin)).join("\n");
    return new NextResponse(links, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const zip = new JSZip();
  await Promise.all(
    piezas.map(async (pieza) => {
      const targetUrl = urlPublicaDeTap(pieza.id, req.nextUrl.origin);
      const png = await generarQrPng(targetUrl);
      zip.file(`qr-${pieza.id}.png`, png);
    }),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const nombreArchivo = `metricsfield-qr${lote ? `-${lote}` : ""}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
