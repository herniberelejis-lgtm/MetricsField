"use client";

import { useState, type ReactNode } from "react";

// Toggle ES/EN para las páginas legales públicas (/terminos, /privacidad).
// Default español — el producto trabaja en español — pero la verificación
// OAuth de Google se graba en inglés, así que el mismo link público que ya
// está declarado en Google Cloud Console necesita poder mostrar el texto en
// inglés sin publicar una URL nueva.
export default function LangSwitch({ es, en }: { es: ReactNode; en: ReactNode }) {
  const [lang, setLang] = useState<"es" | "en">("es");

  return (
    <div>
      <div
        role="group"
        aria-label="Idioma / Language"
        className="mb-8 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold"
      >
        <button
          type="button"
          onClick={() => setLang("es")}
          aria-pressed={lang === "es"}
          className={`rounded-full px-3.5 py-1.5 transition ${
            lang === "es" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Español
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          aria-pressed={lang === "en"}
          className={`rounded-full px-3.5 py-1.5 transition ${
            lang === "en" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          English
        </button>
      </div>
      {lang === "es" ? es : en}
    </div>
  );
}
