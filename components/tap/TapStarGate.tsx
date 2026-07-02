"use client";

import { useState } from "react";
import { enviarFeedback } from "@/app/t/actions";

// La pantalla que ve el cliente final al tocar el cartel NFC. Star-gate
// LEGAL: 4-5 estrellas van directo a Google; 1-3 estrellas OFRECEN un
// feedback privado, pero el link a la reseña pública de Google sigue
// visible siempre — nunca se le bloquea a nadie el camino público (eso
// viola las políticas de Google, además de ser una mala práctica).
export default function TapStarGate({
  comercioId,
  nombre,
  rubro,
  googleReviewUrl,
}: {
  comercioId: string;
  nombre: string;
  rubro: string;
  googleReviewUrl: string;
}) {
  const [estrellas, setEstrellas] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState("");
  const [contacto, setContacto] = useState("");

  const esPositiva = estrellas >= 4;
  const esNegativa = estrellas >= 1 && estrellas <= 3;

  async function handleEnviarFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || !texto.trim()) return;
    setEnviando(true);
    await enviarFeedback(comercioId, estrellas as 1 | 2 | 3, texto, contacto);
    setEnviando(false);
    setEnviado(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="text-lg font-semibold text-slate-900">{nombre}</div>
        <div className="mt-0.5 text-sm text-slate-500">{rubro}</div>

        {estrellas === 0 && (
          <div className="mt-10">
            <p className="text-base text-slate-700">
              ¿Cómo estuvo tu experiencia?
            </p>
            <div className="mt-6 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                  onClick={() => setEstrellas(n as 1 | 2 | 3 | 4 | 5)}
                  className="p-1 text-5xl leading-none text-amber-300 transition hover:scale-110 active:scale-95"
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        {esPositiva && (
          <div className="mt-10">
            <div className="mb-4 flex justify-center gap-1 text-4xl text-amber-400">
              {"★".repeat(estrellas)}
            </div>
            <p className="text-base text-slate-700">
              ¡Qué bueno! Contanos en Google — te toma 10 segundos.
            </p>
            <a
              href={googleReviewUrl}
              className="mt-6 inline-block w-full rounded-full bg-brand px-6 py-3.5 text-base font-medium text-white hover:bg-brand-fg"
            >
              Publicar en Google
            </a>
            <p className="mt-6 text-[11px] text-slate-400">
              Impulsado por Taply
            </p>
          </div>
        )}

        {esNegativa && !enviado && (
          <form onSubmit={handleEnviarFeedback} className="mt-8 text-left">
            <p className="mb-1 text-center text-xl">🙏</p>
            <p className="text-center text-base font-medium text-slate-800">
              Lamentamos que no fue perfecto
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              Contanos qué pasó y lo resolvemos hoy mismo.
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              rows={4}
              placeholder="¿Qué podemos mejorar?"
              className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] focus:border-brand focus:outline-none"
            />
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Tu WhatsApp (opcional, para responderte)"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="mt-4 w-full rounded-full bg-brand px-6 py-3.5 text-base font-medium text-white hover:bg-brand-fg disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar en privado"}
            </button>
            <a
              href={googleReviewUrl}
              className="mt-4 block text-center text-sm text-slate-500 underline underline-offset-2"
            >
              También podés dejar tu reseña pública en Google
            </a>
          </form>
        )}

        {esNegativa && enviado && (
          <div className="mt-10">
            <p className="text-3xl">✅</p>
            <p className="mt-3 text-base font-medium text-slate-800">
              Gracias por contarnos
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Lo vamos a revisar y, si dejaste tu contacto, te escribimos.
            </p>
            <a
              href={googleReviewUrl}
              className="mt-6 block text-sm text-slate-500 underline underline-offset-2"
            >
              De todas formas, podés dejar tu reseña pública en Google
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
