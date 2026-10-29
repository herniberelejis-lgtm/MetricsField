"use client";

import { useEffect, useState } from "react";

// Abierto desde Instagram, Facebook y otras apps, el navegador es interno a
// esa app: no comparte nada con Chrome/Safari, así que lo que se guarde acá
// (qué piezas maneja este celular) no sirve cuando después se escanea con la
// cámara. Se avisa y se ofrece copiar el link para abrirlo bien.
export default function AvisoNavegadorInterno() {
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);
  useEffect(() => setLink(window.location.href), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      // queda el link a la vista
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl px-4 py-3.5 text-[13px]" style={{ background: "#fff8e6", color: "#7a5200" }}>
      <p className="font-semibold">Abrí esta página en Chrome o Safari</p>
      <p className="mt-1 leading-snug">
        Estás en el navegador de otra app: lo que hagas acá no queda guardado para cuando escanees tus piezas con la
        cámara. Copiá el link y pegalo en Chrome (Android) o Safari (iPhone).
      </p>
      <button
        type="button"
        onClick={copiar}
        className="mt-2.5 rounded-lg px-3.5 py-2 text-[13px] font-medium text-white"
        style={{ backgroundColor: "#7a5200" }}
      >
        {copiado ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
