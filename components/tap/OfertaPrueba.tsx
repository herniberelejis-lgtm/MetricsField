"use client";

import { useEffect, useRef, useState } from "react";
import { MENSAJE_PRUEBA } from "@/lib/onboarding";
import { BotonWhatsapp } from "./AyudaActivacion";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const CLAVE = "mf-oferta-prueba-vista";

// Ventana emergente con la prueba gratis del software, apenas el comprador
// activa su pieza: ya le funcionó y es cuando más abierto está. No va antes
// de activar a propósito: un cartel encima del formulario hace que la gente
// abandone sin terminar y la pieza queda sin funcionar. Una sola vez por
// celular (quien activa varias piezas la ve con la primera) y siempre se
// puede cerrar.
export default function OfertaPrueba() {
  const [abierta, setAbierta] = useState(false);
  const boton = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE)) return;
    } catch {
      // sin almacenamiento local: se muestra igual
    }
    const t = setTimeout(() => setAbierta(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!abierta) return;
    boton.current?.querySelector("a")?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierta]);

  function cerrar() {
    setAbierta(false);
    try {
      localStorage.setItem(CLAVE, new Date().toISOString());
    } catch {
      // sin almacenamiento local: puede volver a aparecer, no pasa nada
    }
  }

  if (!abierta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "rgba(17,24,39,.55)" }}
      onClick={cerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="oferta-prueba-titulo"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white px-5 pb-5 pt-4 shadow-2xl"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-[20px]"
            style={{ color: INK_SOFT }}
          >
            ×
          </button>
        </div>
        <div className="-mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: "#fef3c7", color: "#92400e" }}>
          Gratis 15 días
        </div>
        <h2 id="oferta-prueba-titulo" className="mt-2 text-[21px] font-semibold leading-tight" style={{ color: INK }}>
          Tu pieza ya funciona. ¿Querés ver cuántas reseñas te trae?
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- captura estática chica */}
        <img
          src="/tap/panel-prueba.webp"
          alt="Panel de MetricsField con las reseñas, los toques del cartel y la calificación de cada local"
          width={780}
          height={446}
          className="mt-3 h-auto w-full rounded-xl border"
          style={{ borderColor: "#e4e6ea" }}
        />
        <ul className="mt-3 space-y-1.5 text-[14px]" style={{ color: INK_SOFT }}>
          <li>✓ Cuántas personas usan tu pieza y cuántas reseñas te deja cada semana.</li>
          <li>✓ Todas tus reseñas en un lugar, con aviso de las que esperan respuesta.</li>
          <li>✓ Cómo vas contra los negocios de tu zona.</li>
        </ul>
        <div ref={boton} onClick={cerrar}>
          <BotonWhatsapp mensaje={MENSAJE_PRUEBA}>Quiero mi prueba gratis</BotonWhatsapp>
        </div>
        <button type="button" onClick={cerrar} className="mt-2 w-full py-2 text-[13.5px] underline" style={{ color: INK_SOFT }}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
