import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { getDatosTap, getLogoComercio } from "@/lib/db";

// Miniatura para el link preview de /t/[slug] (ver generateMetadata ahí).
// Con logo cargado (admin → editar cliente → "Logo para WhatsApp") arma la
// tarjeta con la marca real del comercio; sin logo, sirve tal cual el PNG
// genérico de MetricsField — nunca genera una versión "sin marca" propia,
// para no duplicar ese diseño en dos lugares.

const GENERICA = path.join(process.cwd(), "public", "og-resena.png");
const CACHE_HEADERS = { "Cache-Control": "public, max-age=300" };

async function servirGenerica(): Promise<Response> {
  const datos = await readFile(GENERICA);
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
  });
}

// Caja donde entra el logo, cualquiera sea su forma (isotipo cuadrado o
// wordmark horizontal como el de Felippa & Asociados, 1536×864).
const CAJA_LOGO = { width: 480, height: 160 };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const datos = await getDatosTap(slug);
  const comercioId = datos?.comercio?.id;
  const logo = comercioId ? await getLogoComercio(comercioId) : null;
  if (!logo) return servirGenerica();

  try {
    // satori (el motor detrás de ImageResponse) no siempre calcula bien el
    // tamaño de un <img> a partir de una data URI — hay que decirle el
    // ancho/alto explícitos, si no el logo puede salir en blanco o con el
    // layout roto sin tirar ningún error visible en los logs. Por eso se
    // lee el tamaño real con sharp (ya es dependencia del proyecto) y se
    // escala manteniendo proporción, en vez de confiar en objectFit solo.
    const metadata = await sharp(logo.datos).metadata();
    const anchoOriginal = metadata.width ?? CAJA_LOGO.width;
    const altoOriginal = metadata.height ?? CAJA_LOGO.height;
    const escala = Math.min(CAJA_LOGO.width / anchoOriginal, CAJA_LOGO.height / altoOriginal, 1);
    const ancho = Math.round(anchoOriginal * escala);
    const alto = Math.round(altoOriginal * escala);
    const logoDataUri = `data:${logo.contentType};base64,${logo.datos.toString("base64")}`;

    const imagen = new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              width: CAJA_LOGO.width,
              height: CAJA_LOGO.height,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoDataUri} width={ancho} height={alto} />
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#0D0D0D" }}>¿Cómo te fue?</div>
          <div style={{ fontSize: 28, color: "#666666", marginTop: 12 }}>
            Contanos en tu reseña de Google — te toma dos minutos
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS },
    );
    return imagen;
  } catch {
    // Cualquier falla componiendo el logo (formato raro, satori atragantado)
    // no puede dejar sin miniatura del todo — mejor la genérica que nada.
    return servirGenerica();
  }
}
