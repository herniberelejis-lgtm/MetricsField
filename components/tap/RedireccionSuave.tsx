"use client";

import { useEffect } from "react";

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
export default function RedireccionSuave({ url, editarHref }: { url: string; editarHref?: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <p className="text-sm text-slate-500">Redirigiendo…</p>
      <a href={url} className="text-xs text-slate-400 underline underline-offset-2">
        Si no pasa nada, tocá acá
      </a>
      {editarHref && (
        <a
          href={editarHref}
          className="mt-8 text-[11px] text-slate-300 underline underline-offset-2 hover:text-slate-400"
        >
          ¿Sos el dueño de este cartel? Editar
        </a>
      )}
    </div>
  );
}
