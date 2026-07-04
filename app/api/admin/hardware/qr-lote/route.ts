import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { tieneSesionAdmin } from "@/lib/auth";
import { getInventarioHardware } from "@/lib/db";
import { generarQrPng } from "@/lib/qr";

// Descarga masiva de QR para mandar a imprimir: un .zip con un PNG por
// pieza, nombrado por su código fijo (qr-p-0001.png...). Por defecto solo
// las piezas libres (recién generadas, sin cliente todavía) — son las que
// hay que mandarle al proveedor. ?estado=todas trae también las ya
// asignadas (por si hace falta reimprimir alguna puntual).
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await tieneSesionAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const lote = req.nextUrl.searchParams.get("lote");
  const estado = req.nextUrl.searchParams.get("estado") ?? "libre";

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

  const zip = new JSZip();
  await Promise.all(
    piezas.map(async (pieza) => {
      const targetUrl = `${req.nextUrl.origin}/t/${pieza.id}`;
      const png = await generarQrPng(targetUrl);
      zip.file(`qr-${pieza.id}.png`, png);
    }),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const nombreArchivo = `taply-qr${lote ? `-${lote}` : ""}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
