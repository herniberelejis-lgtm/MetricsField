"use client";

import { useEffect, useState } from "react";
import { esPiezaMia, olvidarPiezaMia } from "@/lib/piezas-mias";

// El 99% de quien escanea un cartel solo quiere dejar una reseña — un
// redirect() del servidor sería más rápido, pero un 3xx no tiene body que un
// generador de preview (WhatsApp, Telegram, etc.) pueda leer, y no todos se
// identifican con un User-Agent de bot: WhatsApp Web/Desktop, por ejemplo,
// pide el link con un UA de navegador normal, indistinguible de una persona.
// Por eso esta página SIEMPRE devuelve 200 con el <head> ya armado por
// generateMetadata (ver app/t/[slug]/page.tsx) y el salto real lo hace
// location.replace() en el cliente — casi instantáneo para una persona, y
// para cualquier bot (que no ejecuta JS) el body que lee ya tiene la
// miniatura correcta, sin que nadie tenga que reconocerlo primero.
export default function RedireccionSuave({
  url,
  editarHref,
  slug,
  nombre,
}: {
  url: string;
  editarHref?: string;
  /** Solo en piezas autogestionadas: si este celular la configuró, en vez
   * de saltar a Google se ofrece cambiar a dónde lleva (lib/piezas-mias). */
  slug?: string;
  nombre?: string;
}) {
  const [esMia, setEsMia] = useState(false);

  useEffect(() => {
    if (slug && editarHref && esPiezaMia(slug)) {
      setEsMia(true);
      return;
    }
    window.location.replace(url);
  }, [url, slug, editarHref]);

  if (esMia && slug && editarHref) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10" style={{ background: "#f8f9fa" }}>
        <div
          className="w-full max-w-sm rounded-2xl bg-white px-6 py-7 text-center"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)" }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#2563eb" }}>
            MetricsField
          </div>
          <h1 className="mt-1 text-[19px] font-semibold" style={{ color: "#1c2530" }}>
            Esta pieza la configuraste vos
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "#5f6b7a" }}>
            Hoy lleva a dejar una reseña{nombre ? <> a <b style={{ color: "#1c2530" }}>{nombre}</b></> : null}.
          </p>
          <a
            href={editarHref}
            className="mt-6 block w-full rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: "#2563eb" }}
          >
            Cambiar a dónde lleva
          </a>
          <a
            href={url}
            className="mt-2.5 block w-full rounded-full border px-6 py-3 text-[14.5px] font-medium"
            style={{ borderColor: "#dfe3e8", color: "#1c2530" }}
          >
            Ir a la reseña (como un cliente)
          </a>
          <p className="mt-5 text-[12px]" style={{ color: "#5f6b7a" }}>
            Esto lo ves solo en este celular. Tus clientes van directo a Google.
          </p>
          <button
            type="button"
            onClick={() => {
              olvidarPiezaMia(slug);
              window.location.replace(url);
            }}
            className="mt-2 text-[12px] underline"
            style={{ color: "#5f6b7a" }}
          >
            No mostrar más esto en este celular
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <p className="text-sm text-slate-500">Redirigiendo…</p>
      <a href={url} className="text-xs text-slate-500 underline underline-offset-2">
        Si no pasa nada, tocá acá
      </a>
      {editarHref && (
        <a
          href={editarHref}
          className="mt-8 text-[11px] text-slate-400 underline underline-offset-2 hover:text-slate-500"
        >
          ¿Sos el dueño de este cartel? Editar
        </a>
      )}
    </div>
  );
}
