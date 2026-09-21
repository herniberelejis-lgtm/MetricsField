import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDatosTap, getMiniaturaLogoComercio } from "@/lib/db";

// Miniatura para el link preview de /t/[slug] (ver generateMetadata ahí).
// Con logo cargado (admin → editar cliente → "Logo para WhatsApp") sirve
// la miniatura ya compuesta con la marca real del comercio — se arma UNA
// sola vez al subir el logo (ver componerMiniaturaLogo en lib/imagenLogo.tsx
// y accionSubirLogoComercio en app/actions.ts), nunca acá. Componerla al
// vuelo en cada visita del bot de preview resultó demasiado lento para el
// tiempo que WhatsApp espera antes de mostrar la tarjeta vacía — esta ruta
// ahora es solo un SELECT + servir bytes, igual de rápida que la genérica.

const GENERICA = path.join(process.cwd(), "public", "og-resena.png");
const CACHE_HEADERS = { "Cache-Control": "public, max-age=300" };

async function servirGenerica(): Promise<Response> {
  const datos = await readFile(GENERICA);
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const datos = await getDatosTap(slug);
  const comercioId = datos?.comercio?.id;
  const miniatura = comercioId ? await getMiniaturaLogoComercio(comercioId) : null;
  if (!miniatura) return servirGenerica();

  return new Response(new Uint8Array(miniatura), {
    headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
  });
}
