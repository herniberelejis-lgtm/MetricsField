import type { ReactNode } from "react";
import type { ResenaCRM } from "@/lib/types";
import { fmtNum } from "@/lib/format";

// Piezas visuales propias del portal del cliente (no se comparten con
// /admin): chips de actividad con ícono de color, la card grande de
// calificación de Google y el listado de reseñas recientes con avatar. Van
// aparte de components/ui.tsx a propósito — ui.tsx es el sistema compartido
// de todo el panel interno y no debe cambiar de aspecto por un pedido que es
// solo para la cara que ve el cliente.

function IconBase({ children, size = 18, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconStarChip({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </IconBase>
  );
}

function IconEye({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

function IconTrendingUp({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </IconBase>
  );
}

function IconPin({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </IconBase>
  );
}

export { IconEye as IconVisitas, IconTrendingUp as IconCrecimiento, IconStarChip };

/** Card chica: ícono de color + número grande + etiqueta. Fila de "de un
 * vistazo" arriba del todo, antes de entrar en el detalle de cada sección. */
export function StatChip({
  icon,
  value,
  label,
  chipClass,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  chipClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${chipClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>
        <div className="text-xs leading-tight text-slate-500">{label}</div>
      </div>
    </div>
  );
}

/** Hero de la calificación de Google: el número que más importa, grande y
 * arriba de todo — con el progreso desde que el comercio usa MetricsField. */
export function CalificacionGoogleCard({
  rating,
  totalResenas,
  deltaRating,
  deltaResenas,
  nombre,
  subtitulo,
}: {
  rating: number | null;
  totalResenas: number;
  deltaRating: number | null;
  deltaResenas: number | null;
  nombre: string;
  subtitulo: string;
}) {
  if (rating === null) return null;
  const full = Math.round(rating);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <IconPin size={13} className="text-rose-400" />
        Calificación Google
      </div>
      <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
        {rating.toFixed(1)}
      </div>
      <div className="mt-1 text-sm text-amber-400" aria-hidden>
        {"★".repeat(full)}
        <span className="text-slate-200">{"★".repeat(5 - full)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{fmtNum(totalResenas)} reseñas</p>

      {deltaRating !== null && deltaResenas !== null && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Desde que usás MetricsField
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
            <span className={deltaRating >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {deltaRating >= 0 ? "+" : ""}
              {deltaRating.toFixed(1)}★
            </span>
            <span className={deltaResenas >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {deltaResenas >= 0 ? "+" : ""}
              {fmtNum(deltaResenas)} reseñas
            </span>
          </p>
        </div>
      )}

      <p className="mt-3 text-sm font-semibold text-slate-800">{nombre}</p>
      <p className="text-xs text-slate-500">{subtitulo}</p>
    </div>
  );
}

const COLORES_AVATAR = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
];

function inicial(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || "?";
}

/** `fecha` en `resenas` es DATE (sin hora, ver db/schema.sql) — todo lo que
 * viene de la base ya perdió la hora del día, así que acá solo trabajamos en
 * días completos. Nada de "hace 12 min": esa precisión no existe en el dato. */
function tiempoRelativo(fechaISO: string): string {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const dias = Math.round((hoyUTC - fecha.getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/** Últimas reseñas, de un vistazo — con avatar de inicial en vez de la fila
 * de texto plano que ya usan las secciones de gestión más abajo. Es la única
 * vista "para mirar y listo", sin acciones: responder sigue siendo en
 * Gestión de reseñas. */
export function ResenasRecientesCard({ resenas }: { resenas: ResenaCRM[] }) {
  if (resenas.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Reseñas recientes</p>
      <div className="mt-3.5 space-y-4">
        {resenas.map((r, i) => (
          <div key={r.id} className="flex gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${COLORES_AVATAR[i % COLORES_AVATAR.length]}`}
            >
              {inicial(r.autor)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="truncate text-sm font-medium text-slate-800">{r.autor}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{tiempoRelativo(r.fecha)}</span>
              </div>
              <span className="text-xs text-amber-400" aria-hidden>
                {"★".repeat(r.estrellas)}
                <span className="text-slate-200">{"★".repeat(5 - r.estrellas)}</span>
              </span>
              {r.texto.trim() && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">&ldquo;{r.texto}&rdquo;</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
