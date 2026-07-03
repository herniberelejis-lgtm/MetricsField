"use client";

import { useState } from "react";
import { enviarFeedback } from "@/app/t/actions";

// La pantalla que ve el cliente final al tocar el cartel NFC. Star-gate
// LEGAL: 4-5 estrellas van directo a Google; 1-3 estrellas OFRECEN un
// feedback privado, pero el link a la reseña pública de Google sigue
// visible siempre — nunca se le bloquea a nadie el camino público (eso
// viola las políticas de Google, además de ser una mala práctica).
//
// El look calca al widget real de reseñas de Google (mismo azul, mismo
// dorado de estrella, mismo logo) para que el cliente final reconozca de
// inmediato de qué se trata — no es la identidad de marca de Taply, es
// intencional que sea distinto: acá el protagonista es Google.

const GOOGLE_BLUE = "#1a73e8";
const GOOGLE_GOLD = "#fbbc04";
const INK = "#202124";
const INK_SOFT = "#5f6368";
const LINE = "#dadce0";

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h11.9c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.5-9.5 6.5-16.7z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8z" />
      <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.7-5.3 6.6-9.2 12.4-9.2z" />
    </svg>
  );
}

function StarIcon({ filled, size = 44 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? GOOGLE_GOLD : "none"}
      stroke={filled ? GOOGLE_GOLD : LINE}
      strokeWidth={filled ? 0 : 1.5}
      className="transition-transform duration-100"
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function StarRow({
  value,
  onSelect,
}: {
  value: 0 | 1 | 2 | 3 | 4 | 5;
  onSelect: (n: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const activo = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onSelect(n as 1 | 2 | 3 | 4 | 5)}
            className="rounded-full p-1 transition hover:scale-110 active:scale-95"
          >
            <StarIcon filled={activo} />
          </button>
        );
      })}
    </div>
  );
}

/** Solo muestra la calificación ya elegida — no es tocable, evita que
 * parezca que hay que volver a puntuar en la pantalla siguiente. */
function StarsReadOnly({ value }: { value: number }) {
  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="p-1">
          <StarIcon filled={value >= n} size={36} />
        </div>
      ))}
    </div>
  );
}

function GoogleButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
      style={{ backgroundColor: GOOGLE_BLUE }}
    >
      <GoogleG size={18} />
      {children}
    </a>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  const esPositiva = estrellas >= 4;
  const esNegativa = estrellas >= 1 && estrellas <= 3;

  async function handleEnviarFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || !texto.trim()) return;
    setEnviando(true);
    setError(null);
    const res = await enviarFeedback(comercioId, estrellas as 1 | 2 | 3, texto, contacto);
    setEnviando(false);
    if (res.ok) {
      setEnviado(true);
    } else {
      setError(res.error ?? "No se pudo enviar. Probá de nuevo.");
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5 py-10"
      style={{
        background: "linear-gradient(180deg, #f8f9fa 0%, #f1f3f4 100%)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white px-7 py-8 text-center"
        style={{ boxShadow: "0 1px 2px rgba(60,64,67,.15), 0 4px 24px rgba(60,64,67,.1)" }}
      >
        <div className="flex items-center justify-center gap-2">
          <GoogleG size={22} />
          <span className="text-[13px] font-medium" style={{ color: INK_SOFT }}>
            Reseñas de Google
          </span>
        </div>

        <div className="mt-5 border-t" style={{ borderColor: LINE }} />

        <div className="mt-5 text-[19px] font-medium" style={{ color: INK }}>
          {nombre}
        </div>
        <div className="mt-0.5 text-[13px]" style={{ color: INK_SOFT }}>
          {rubro}
        </div>

        {estrellas === 0 && (
          <div className="mt-8">
            <p className="text-[15px]" style={{ color: INK }}>
              ¿Cómo estuvo tu experiencia?
            </p>
            <div className="mt-5">
              <StarRow value={estrellas} onSelect={setEstrellas} />
            </div>
            <p className="mt-5 text-[11px]" style={{ color: INK_SOFT }}>
              Tocá una estrella para calificar
            </p>
          </div>
        )}

        {esPositiva && (
          <div className="mt-8">
            <StarsReadOnly value={estrellas} />
            <p className="mt-5 text-[15px]" style={{ color: INK }}>
              ¡Qué bueno! Contanos en Google — te toma 10 segundos.
            </p>
            <GoogleButton href={googleReviewUrl}>Publicar reseña</GoogleButton>
            <p className="mt-5 text-[11px]" style={{ color: INK_SOFT }}>
              Impulsado por Taply
            </p>
          </div>
        )}

        {esNegativa && !enviado && (
          <form onSubmit={handleEnviarFeedback} className="mt-8 text-left">
            <StarsReadOnly value={estrellas} />
            <p className="mt-5 text-center text-[15px] font-medium" style={{ color: INK }}>
              Lamentamos que no fue perfecto
            </p>
            <p className="mt-1 text-center text-[13px]" style={{ color: INK_SOFT }}>
              Contanos qué pasó y lo resolvemos hoy mismo.
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
              rows={4}
              placeholder="¿Qué podemos mejorar?"
              className="mt-4 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2"
              style={{ borderColor: LINE, color: INK }}
              onFocus={(e) => (e.currentTarget.style.borderColor = GOOGLE_BLUE)}
              onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
            />
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Tu WhatsApp (opcional, para responderte)"
              className="mt-2.5 w-full rounded-xl border px-3.5 py-2.5 text-[15px] outline-none transition"
              style={{ borderColor: LINE, color: INK }}
              onFocus={(e) => (e.currentTarget.style.borderColor = GOOGLE_BLUE)}
              onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="mt-4 w-full rounded-full px-6 py-3.5 text-[15px] font-medium text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              style={{ backgroundColor: GOOGLE_BLUE }}
            >
              {enviando ? "Enviando…" : "Enviar en privado"}
            </button>
            {error && (
              <p className="mt-2 text-center text-[13px]" style={{ color: "#d93025" }}>
                {error}
              </p>
            )}
            <a
              href={googleReviewUrl}
              className="mt-4 block text-center text-[13px] underline underline-offset-2"
              style={{ color: INK_SOFT }}
            >
              También podés dejar tu reseña pública en Google
            </a>
          </form>
        )}

        {esNegativa && enviado && (
          <div className="mt-8">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#e6f4ea" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#34A853"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-3 text-[15px] font-medium" style={{ color: INK }}>
              Gracias por contarnos
            </p>
            <p className="mt-1 text-[13px]" style={{ color: INK_SOFT }}>
              Lo vamos a revisar y, si dejaste tu contacto, te escribimos.
            </p>
            <a
              href={googleReviewUrl}
              className="mt-5 block text-[13px] underline underline-offset-2"
              style={{ color: INK_SOFT }}
            >
              De todas formas, podés dejar tu reseña pública en Google
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
