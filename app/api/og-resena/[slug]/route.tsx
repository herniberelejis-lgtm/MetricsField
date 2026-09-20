import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDatosTap, getLogoComercio } from "@/lib/db";

// Miniatura para el link preview de /t/[slug] (ver generateMetadata ahí).
// Con logo cargado (admin → editar cliente → "Logo para WhatsApp") arma la
// tarjeta con la marca real del comercio; sin logo, sirve tal cual el PNG
// genérico de MetricsField — nunca genera una versión "sin marca" propia,
// para no duplicar ese diseño en dos lugares.

const GENERICA = path.join(process.cwd(), "public", "og-resena.png");

async function servirGenerica(): Promise<Response> {
  const datos = await readFile(GENERICA);
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const datos = await getDatosTap(slug);
  const comercioId = datos?.comercio?.id;
  const logo = comercioId ? await getLogoComercio(comercioId) : null;
  if (!logo) return servirGenerica();

  const logoDataUri = `data:${logo.contentType};base64,${logo.datos.toString("base64")}`;

  return new ImageResponse(
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
            width: 480,
            height: 160,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUri}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#0D0D0D" }}>¿Cómo te fue?</div>
        <div style={{ fontSize: 28, color: "#666666", marginTop: 12 }}>
          Contanos en tu reseña de Google — te toma dos minutos
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
