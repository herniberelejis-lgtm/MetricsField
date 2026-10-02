import "server-only";
import sharp from "sharp";
import { ImageResponse } from "next/og";

// Compone la miniatura de WhatsApp (logo real + texto) UNA sola vez, al
// subir el logo (ver accionSubirLogoComercio en app/actions.ts) — nunca al
// vuelo en cada visita del bot de preview de /api/og-resena/[slug]/route.tsx.
// Componerla por request con next/og (satori) resultó demasiado lento para
// el tiempo que WhatsApp espera antes de mostrar la tarjeta vacía.

const CAJA_LOGO = { width: 480, height: 160 };

export async function componerMiniaturaLogo(
  datosLogo: Buffer,
  contentType: string,
): Promise<Buffer> {
  // satori no siempre infiere el tamaño de un <img> a partir de una data
  // URI — sin ancho/alto explícitos, el logo puede salir en blanco o con
  // el layout roto sin tirar ningún error. Se lee el tamaño real con sharp
  // y se escala manteniendo proporción, en vez de confiar en objectFit solo.
  const metadata = await sharp(datosLogo).metadata();
  const anchoOriginal = metadata.width ?? CAJA_LOGO.width;
  const altoOriginal = metadata.height ?? CAJA_LOGO.height;
  const escala = Math.min(
    CAJA_LOGO.width / anchoOriginal,
    CAJA_LOGO.height / altoOriginal,
    1,
  );
  const ancho = Math.round(anchoOriginal * escala);
  const alto = Math.round(altoOriginal * escala);
  const logoDataUri = `data:${contentType};base64,${datosLogo.toString("base64")}`;

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
    { width: 1200, height: 630 },
  );

  return Buffer.from(await imagen.arrayBuffer());
}
