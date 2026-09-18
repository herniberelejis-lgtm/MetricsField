"use client";

import { useState, useTransition } from "react";
import type { ResenaCRM, TonoMarca } from "@/lib/types";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { accionAprobarResenaPortal, accionDescartarResenaPortal } from "@/app/portal/actions";
import { btnSuccess, btnSecondary, btnGhost, IconCheck } from "@/components/ui";

// Gestión de reseñas desde el portal del cliente: el dueño ve sus reseñas
// pendientes, edita/regenera la respuesta sugerida (gratis, sin IA paga —
// mismo generador por reglas que usa el equipo interno) y la aprueba.
// "Aprobar" intenta publicar directo en la ficha de Google (requiere que la
// reseña haya venido del sync y que la Reviews API ya esté habilitada); si
// falta cualquiera de las dos, cae a copiar la respuesta al portapapeles
// para que el dueño la pegue él mismo — nunca se promete una publicación
// que no pasó de verdad.

const COLOR_BADGE: Record<number, string> = {
  1: "bg-slate-100 text-slate-500",
  2: "bg-slate-100 text-slate-500",
  3: "bg-slate-200 text-slate-700",
  4: "bg-slate-900 text-white",
  5: "bg-slate-900 text-white",
};

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

/** Fecha + hora cuando se conoce la hora exacta (creadoEn) — si no, solo la
 * fecha, sin inventar una hora que no tenemos. */
function fechaConHora(resena: ResenaCRM): string {
  if (!resena.creadoEn) return fechaCorta(resena.fecha);
  const d = new Date(resena.creadoEn);
  return `${d.toLocaleDateString("es-AR")}, ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

function iniciales(nombre: string): string {
  return (nombre || "?").trim().slice(0, 1).toUpperCase();
}

function TarjetaResena({
  resena,
  tonoMarca,
  codigo,
  onResuelta,
}: {
  resena: ResenaCRM;
  tonoMarca: TonoMarca;
  codigo: string;
  onResuelta: (id: number) => void;
}) {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(
    resena.respuestaSugerida || generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, 0),
  );
  const [saliendo, setSaliendo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [resultado, setResultado] = useState<"publicada" | "copiada" | null>(null);
  const [pendiente, startTransition] = useTransition();

  function regenerar() {
    const siguiente = intento + 1;
    setIntento(siguiente);
    setRespuesta(generarRespuestaSugerida(resena.autor, resena.estrellas, resena.texto, tonoMarca, siguiente));
  }

  function copiar() {
    navigator.clipboard.writeText(respuesta).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function aprobar() {
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("comercioId", resena.comercioId);
    fd.set("id", String(resena.id));
    fd.set("respuesta", respuesta);
    startTransition(async () => {
      const { publicada } = await accionAprobarResenaPortal(fd);
      if (!publicada) {
        navigator.clipboard.writeText(respuesta).catch(() => {});
      }
      setResultado(publicada ? "publicada" : "copiada");
      setTimeout(() => {
        setSaliendo(true);
        setTimeout(() => onResuelta(resena.id), 300);
      }, 1400);
    });
  }

  function descartar() {
    const fd = new FormData();
    fd.set("codigo", codigo);
    fd.set("comercioId", resena.comercioId);
    fd.set("id", String(resena.id));
    startTransition(async () => {
      await accionDescartarResenaPortal(fd);
      setSaliendo(true);
      setTimeout(() => onResuelta(resena.id), 300);
    });
  }

  return (
    <div
      className={`rounded-3xl border border-white/60 bg-white/65 p-5 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl transition-all duration-300 ${
        saliendo ? "-translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
            {iniciales(resena.autor)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{resena.autor}</div>
            {/* suppressHydrationWarning: toLocaleDateString/toLocaleTimeString pueden
                usar un espacio distinto antes de "a. m./p. m." según la versión de
                ICU del motor (Node del server vs. el navegador) — mismo texto visible,
                pero React lo marca como mismatch y re-renderiza el árbol entero. */}
            <div className="text-xs text-slate-400" suppressHydrationWarning>
              {fechaConHora(resena)}
            </div>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[resena.estrellas]}`}>
          {"★".repeat(resena.estrellas)}
          <span className="text-slate-200">{"★".repeat(5 - resena.estrellas)}</span>
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{resena.texto}</p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Respuesta sugerida — editala si querés
          </span>
          <button
            type="button"
            onClick={regenerar}
            className="text-[11px] font-medium text-brand-fg hover:underline"
          >
            Regenerar
          </button>
        </div>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none"
        />
      </div>

      {resultado ? (
        <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">
          {resultado === "publicada"
            ? "✓ Publicada en tu ficha de Google."
            : "✓ Copiada al portapapeles — pegala vos como respuesta de la reseña en Google."}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={pendiente} onClick={aprobar} className={`${btnSuccess} !px-3.5 !py-1.5 !text-xs`}>
              <IconCheck size={13} /> Aprobar respuesta
            </button>
            <button type="button" onClick={copiar} className={`${btnSecondary} !px-3.5 !py-1.5 !text-xs`}>
              {copiado ? "¡Copiada!" : "Copiar texto"}
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={descartar}
              className={`${btnGhost} ml-auto !text-xs hover:!text-slate-900`}
            >
              Descartar
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Si ya tenemos acceso a tu ficha de Google, aprobar la publica directo. Si todavía no, la
            copiamos para que la pegues vos como respuesta de la reseña.
          </p>
        </>
      )}
    </div>
  );
}

export default function GestionResenas({
  resenasIniciales,
  tonoMarca,
  codigo,
}: {
  resenasIniciales: ResenaCRM[];
  tonoMarca: TonoMarca;
  codigo: string;
}) {
  const [pendientes, setPendientes] = useState(resenasIniciales);
  const [aprobandoTodas, startAprobarTodas] = useTransition();
  const [resumenBulk, setResumenBulk] = useState<{ publicadas: number; total: number } | null>(null);

  if (pendientes.length === 0) {
    return (
      <div className="rounded-3xl border border-white/60 bg-white/65 p-5 text-sm text-slate-500 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
        {resumenBulk ? (
          resumenBulk.publicadas === resumenBulk.total ? (
            <>✓ Se publicaron las {resumenBulk.total} respuestas directo en Google.</>
          ) : (
            <>
              ✓ Aprobadas las {resumenBulk.total}: {resumenBulk.publicadas} se publicaron directo en Google, el
              resto quedó guardado en el CRM para copiar y pegar a mano (todavía no tenemos acceso a esa ficha
              o no vinieron sincronizadas desde Google).
            </>
          )
        ) : (
          "No tenés reseñas pendientes de responder por ahora."
        )}
      </div>
    );
  }

  // Aprobar todas de una: usa la respuesta sugerida tal cual quedó para cada
  // una (la que ya trae generada, o la que se haya editado a mano en su
  // propia tarjeta no se ve reflejada acá — cada tarjeta mantiene su propio
  // estado de edición). Cada reseña se publica directo en Google si vino
  // sincronizada de ahí y la Reviews API ya está habilitada; el resto queda
  // guardado en el CRM para copiar y pegar a mano — resumenBulk le muestra
  // al dueño cuántas de cada.
  function aprobarTodas() {
    startAprobarTodas(async () => {
      const resultados = await Promise.all(
        pendientes.map((r) => {
          const fd = new FormData();
          fd.set("codigo", codigo);
          fd.set("comercioId", r.comercioId);
          fd.set("id", String(r.id));
          fd.set("respuesta", r.respuestaSugerida || generarRespuestaSugerida(r.autor, r.estrellas, r.texto, tonoMarca, 0));
          return accionAprobarResenaPortal(fd);
        }),
      );
      setResumenBulk({
        publicadas: resultados.filter((r) => r.publicada).length,
        total: resultados.length,
      });
      setPendientes([]);
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {pendientes.length} reseña{pendientes.length === 1 ? "" : "s"} esperando respuesta.
        </p>
        {pendientes.length > 1 && (
          <button
            type="button"
            disabled={aprobandoTodas}
            onClick={aprobarTodas}
            className={`${btnSuccess} !px-3.5 !py-1.5 !text-xs`}
          >
            <IconCheck size={13} /> {aprobandoTodas ? "Aprobando…" : "Aprobar todas"}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {pendientes.map((r) => (
          <TarjetaResena
            key={r.id}
            resena={r}
            tonoMarca={tonoMarca}
            codigo={codigo}
            onResuelta={(id) => setPendientes((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
