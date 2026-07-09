"use client";

import { useEffect } from "react";

// Pieza autogestionada ya activada: el 99% de quien escanea esto es un
// cliente que solo quiere dejar una reseña — el redirect() del servidor de
// siempre sería más rápido, pero no deja lugar para el link de edición del
// dueño (un redirect real ni siquiera renderiza esta página). Con
// location.replace() en el cliente el salto sigue siendo casi instantáneo
// (sin esta pantalla, el QR no tendría forma de volver a la edición).
export default function RedireccionSuave({ url, slug }: { url: string; slug: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <p className="text-sm text-slate-500">Redirigiendo…</p>
      <a href={url} className="text-xs text-slate-400 underline underline-offset-2">
        Si no pasa nada, tocá acá
      </a>
      <a
        href={`/t/${slug}/editar`}
        className="mt-8 text-[11px] text-slate-300 underline underline-offset-2 hover:text-slate-400"
      >
        ¿Sos el dueño de este cartel? Editar
      </a>
    </div>
  );
}
