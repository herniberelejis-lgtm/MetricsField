"use client";

import { useEffect, useState } from "react";
import { VIDEO_NFC } from "@/lib/onboarding";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const BRAND = "#2563eb";

// El chip NFC de la pieza viene vacío y se graba con la app gratis NFC
// Tools (video del equipo). Le ofrecemos al comprador grabar el link de su
// pieza en vez del de Google: así el QR y el NFC van al mismo lugar, se
// cuentan los toques del NFC (aviso semanal) y si cambia el destino no
// tiene que volver a grabar el chip. Grabar el link de Google directo
// también funciona; solo que esos toques no pasan por MetricsField.
export default function GrabarChip({ slug, titulo }: { slug: string; titulo: string }) {
  return (
    <section
      className="w-full max-w-md rounded-2xl bg-white px-5 py-6 sm:px-7"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
    >
      <h2 className="text-[17px] font-semibold" style={{ color: INK }}>
        {titulo}
      </h2>
      <p className="mt-1 text-[13.5px]" style={{ color: INK_SOFT }}>
        El chip viene vacío: se graba una sola vez con la app gratis <b style={{ color: INK }}>NFC Tools</b> (iPhone y Android).
        {VIDEO_NFC ? ` Mirá el video (${VIDEO_NFC.duracion}).` : ""}
      </p>

      <CopiarLinkPieza slug={slug} />

      {VIDEO_NFC && (
        <video
          src={VIDEO_NFC.src}
          poster={VIDEO_NFC.portada}
          controls
          playsInline
          preload="none"
          className="mx-auto mt-4 w-full max-w-[300px] rounded-xl bg-black"
          aria-label={`Video: ${VIDEO_NFC.titulo}`}
        />
      )}

      <ConsejosNfc />
    </section>
  );
}

const NOTA_VIDEO =
  "En el video se copia el link de Google (paso 1): copiá este en su lugar y pegalo en el paso 5. Así el QR y el chip van al mismo lugar, te contamos cuántas personas lo usan y, si algún día cambiás algo, no hay que volver a grabarlo.";

/** El link de la pieza listo para copiar y pegar en NFC Tools. */
export function CopiarLinkPieza({ slug, nota = NOTA_VIDEO }: { slug: string; nota?: string }) {
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);
  useEffect(() => setLink(`${window.location.origin}/t/${slug}`), [slug]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el link queda a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="mt-4 rounded-xl px-4 py-3.5" style={{ background: "#eef4ff" }}>
      <p className="text-[13.5px] font-medium" style={{ color: INK }}>
        Recomendado: grabá el link de tu pieza
      </p>
      <p className="mt-1 text-[12.5px]" style={{ color: INK_SOFT }}>
        {nota}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-[12.5px]" style={{ color: INK }}>
          {link.replace(/^https?:\/\//, "")}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-white"
          style={{ backgroundColor: BRAND }}
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function ConsejosNfc() {
  return (
    <ul className="mt-4 space-y-1.5 text-[12.5px]" style={{ color: INK_SOFT }}>
      <li>
        <b style={{ color: INK }}>iPhone:</b> apoyá la parte de arriba del celular sobre la pieza.
      </li>
      <li>
        <b style={{ color: INK }}>Android:</b> activá el NFC (Ajustes → Conexiones) y apoyá el centro de la espalda.
      </li>
      <li>
        <b style={{ color: INK }}>No la pegues sobre metal:</b> interfiere con la señal.
      </li>
    </ul>
  );
}
