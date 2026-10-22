"use client";

import { useState, useTransition } from "react";
import type { ResenaCRM, TonoMarca } from "@/lib/types";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { accionAprobarResenaPortal, accionDescartarResenaPortal } from "@/app/portal/actions";
import { btnPortal, btnPortalSec, btnPortalGhost, IconCheck } from "@/components/ui";

// Gestión de reseñas desde el portal del cliente: el dueño ve sus reseñas
// pendientes, edita/regenera la respuesta sugerida (gratis, sin IA paga —
// mismo generador por reglas que usa el equipo interno) y la aprueba.
// "Aprobar" intenta publicar directo en la ficha de Google (requiere que la
// reseña haya venido del sync y que la Reviews API ya esté habilitada); si
// falta cualquiera de las dos, cae a copiar la respuesta al portapapeles
// para que el dueño la pegue él mismo — nunca se promete una publicación
// que no pasó de verdad.

// Pastillas de calificación: "para mejorar" (durazno) para 1-2★, neutra para
// 3★ y "bien" (verde) para 4-5★ (DESIGN.md §2).
const COLOR_BADGE: Record<number, string> = {
  1: "bg-[#FFF4E8] text-[#8A3F00]",
  2: "bg-[#FFF4E8] text-[#8A3F00]",
  3: "bg-slate-100 text-slate-700",
  4: "bg-[#EAF7F0] text-[#0B5E40]",
  5: "bg-[#EAF7F0] text-[#0B5E40]",
};

const POR_PAGINA = 10;

const FILTROS = [
  { id: "todas", etiqueta: "Todas", pasa: () => true },
  { id: "mejorar", etiqueta: "Para mejorar (1–3★)", pasa: (r: ResenaCRM) => r.estrellas <= 3 },
  { id: "buenas", etiqueta: "Buenas (4–5★)", pasa: (r: ResenaCRM) => r.estrellas >= 4 },
] as const;

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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    startTransition(async () => {
      // Sin este try, un error del servidor (límite de intentos, sesión
      // vencida) quedaba sin capturar y tumbaba el panel entero.
      let publicada: boolean;
      try {
        ({ publicada } = await accionAprobarResenaPortal(fd));
      } catch {
        setError("No se pudo guardar la respuesta. Probá de nuevo en un rato.");
        return;
      }
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
    setError(null);
    startTransition(async () => {
      try {
        await accionDescartarResenaPortal(fd);
      } catch {
        setError("No se pudo descartar la reseña. Probá de nuevo en un rato.");
        return;
      }
      setSaliendo(true);
      setTimeout(() => onResuelta(resena.id), 300);
    });
  }

  return (
    <div
      className={`rounded-2xl border border-[#E4E6EA] bg-white p-5 transition-all duration-300 ${
        saliendo ? "-translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEF4FB] text-sm font-semibold text-[#1F4E80]">
            {iniciales(resena.autor)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{resena.autor}</div>
            {/* suppressHydrationWarning: toLocaleDateString/toLocaleTimeString pueden
                usar un espacio distinto antes de "a. m./p. m." según la versión de
                ICU del motor (Node del server vs. el navegador) — mismo texto visible,
                pero React lo marca como mismatch y re-renderiza el árbol entero. */}
            <div className="text-xs text-slate-600" suppressHydrationWarning>
              {fechaConHora(resena)}
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR_BADGE[resena.estrellas]}`}
          aria-label={`${resena.estrellas} de 5 estrellas`}
        >
          {"★".repeat(resena.estrellas)}
          <span className="opacity-30">{"★".repeat(5 - resena.estrellas)}</span>
        </span>
      </div>

      {resena.texto ? (
        <p className="mt-3 rounded-lg bg-[#F7F9FC] px-3 py-2 text-sm leading-relaxed text-slate-800">{resena.texto}</p>
      ) : (
        <p className="mt-3 text-xs text-slate-600">Dejó solo la calificación, sin texto.</p>
      )}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600">
            Respuesta sugerida — editala si querés
          </span>
          <button
            type="button"
            onClick={regenerar}
            className="min-h-[32px] px-1 text-xs font-medium text-[#1F4E80] hover:underline"
          >
            Regenerar
          </button>
        </div>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm leading-relaxed text-slate-800 focus:border-[#4F7AA8] focus:outline-none"
        />
      </div>

      {resultado ? (
        <p className="mt-3 rounded-lg bg-[#EAF7F0] px-3 py-2 text-xs font-medium text-[#0B5E40]">
          {resultado === "publicada"
            ? "✓ Publicada en tu ficha de Google."
            : "✓ Copiada al portapapeles — pegala vos como respuesta de la reseña en Google."}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={pendiente} onClick={aprobar} className={btnPortal}>
              <IconCheck size={13} /> Aprobar respuesta
            </button>
            <button type="button" onClick={copiar} className={btnPortalSec}>
              {copiado ? "¡Copiada!" : "Copiar texto"}
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={descartar}
              className={`${btnPortalGhost} ml-auto`}
            >
              Descartar
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-[#8A3F00]">{error}</p>}
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
  // Con cientos de reseñas la página se volvía interminable: de a 10, con
  // filtro por calificación (las que piden atención primero a mano).
  const [filtro, setFiltro] = useState<"todas" | "mejorar" | "buenas">("todas");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [aprobandoTodas, startAprobarTodas] = useTransition();
  const [resumenBulk, setResumenBulk] = useState<{ publicadas: number; total: number } | null>(null);

  if (pendientes.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5 text-sm text-slate-600">
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

  const filtradas = pendientes.filter(FILTROS.find((f) => f.id === filtro)!.pasa);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700">
          <span className="font-semibold tabular-nums text-slate-900">{pendientes.length}</span> reseña
          {pendientes.length === 1 ? "" : "s"} esperando respuesta
        </p>
        {pendientes.length > 1 && (
          <button
            type="button"
            disabled={aprobandoTodas}
            onClick={aprobarTodas}
            className={btnPortal}
          >
            <IconCheck size={13} /> {aprobandoTodas ? "Aprobando…" : "Aprobar todas"}
          </button>
        )}
      </div>
      <div role="group" aria-label="Filtrar por calificación" className="mb-3 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const n = pendientes.filter(f.pasa).length;
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={activo}
              onClick={() => {
                setFiltro(f.id);
                setVisibles(POR_PAGINA);
              }}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                activo
                  ? "bg-[#EEF4FB] font-semibold text-[#1F4E80] ring-1 ring-[#A9C5E6]"
                  : "bg-white text-slate-700 ring-1 ring-[#E4E6EA] hover:bg-[#F7F9FC]"
              }`}
            >
              {f.etiqueta}
              <span className="tabular-nums text-slate-600">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {filtradas.length === 0 && (
          <p className="rounded-2xl border border-[#E4E6EA] bg-white p-5 text-sm text-slate-600">
            No hay reseñas de este tipo esperando respuesta.
          </p>
        )}
        {filtradas.slice(0, visibles).map((r) => (
          <TarjetaResena
            key={r.id}
            resena={r}
            tonoMarca={tonoMarca}
            codigo={codigo}
            onResuelta={(id) => setPendientes((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
      {filtradas.length > visibles && (
        <div className="mt-4 flex flex-col items-center gap-1">
          <button type="button" onClick={() => setVisibles((v) => v + POR_PAGINA)} className={btnPortalSec}>
            Ver {Math.min(POR_PAGINA, filtradas.length - visibles)} más
          </button>
          <span className="text-xs tabular-nums text-slate-600">
            Mostrando {visibles} de {filtradas.length}
          </span>
        </div>
      )}
    </div>
  );
}
