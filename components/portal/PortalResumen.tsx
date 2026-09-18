import type { ReactNode } from "react";
import { fmtNum } from "@/lib/format";
import RatingGauge from "@/components/RatingGauge";

// Piezas visuales propias del portal del cliente (no se comparten con
// /admin): chips de actividad con ícono de color y la card grande de
// calificación de Google. Van aparte de components/ui.tsx a propósito —
// ui.tsx es el sistema compartido de todo el panel interno y no debe
// cambiar de aspecto por un pedido que es solo para la cara que ve el
// cliente.

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

function IconEyeChip({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

function IconPhoneChip({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4.5 3.5h3.2l1.6 4-2 1.3a11.5 11.5 0 0 0 5.4 5.4l1.3-2 4 1.6v3.2a1.8 1.8 0 0 1-2 1.8C9.5 18.3 4.7 13.5 3.7 7A1.8 1.8 0 0 1 4.5 3.5z" />
    </IconBase>
  );
}

function IconDirectionsChip({ size, className }: { size?: number; className?: string }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4 4v7a4 4 0 0 0 4 4h11" />
      <path d="M14 11l5 4-5 4" />
    </IconBase>
  );
}

export {
  IconTrendingUp as IconCrecimiento,
  IconStarChip,
  IconEyeChip,
  IconPhoneChip,
  IconDirectionsChip,
};

/** Card chica: ícono de color + número grande + etiqueta. Fila de "de un
 * vistazo" arriba del todo, antes de entrar en el detalle de cada sección. */
export function StatChip({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  /** @deprecated ya no se usa — los chips son monocromáticos por diseño. */
  chipClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/60 bg-white/65 p-4 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
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
  hero = false,
}: {
  rating: number | null;
  totalResenas: number;
  deltaRating: number | null;
  deltaResenas: number | null;
  nombre: string;
  subtitulo: string;
  /** Card "hero" (fondo negro, gauge blanco) — el local activo en la grilla
   * de Rendimiento. El resto de las cards usa la variante clara. */
  hero?: boolean;
}) {
  if (rating === null) return null;
  const full = Math.round(rating);

  return (
    <div
      className={`rounded-3xl border p-6 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl ${
        hero ? "border-slate-900 bg-slate-900 text-white" : "border-white/60 bg-white/65"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          hero ? "text-white/60" : "text-slate-500"
        }`}
      >
        <IconPin size={13} className={hero ? "text-white/50" : "text-slate-400"} />
        Calificación Google
      </div>

      <div className="mt-4 flex items-center gap-5">
        <RatingGauge rating={rating} size={92} dark={hero} />
        <div className="min-w-0">
          <div className="text-sm" aria-hidden>
            <span className={hero ? "text-white" : "text-slate-900"}>{"★".repeat(full)}</span>
            <span className={hero ? "text-white/25" : "text-slate-200"}>{"★".repeat(5 - full)}</span>
          </div>
          <p className={`mt-1 text-xs ${hero ? "text-white/60" : "text-slate-500"}`}>{fmtNum(totalResenas)} reseñas</p>

          {deltaRating !== null && deltaResenas !== null && (
            <div className={`mt-3 border-t pt-3 ${hero ? "border-white/15" : "border-slate-100"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${hero ? "text-white/40" : "text-slate-400"}`}>
                Desde que usás MetricsField
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                <span className={deltaRating >= 0 ? (hero ? "text-white" : "text-slate-900") : hero ? "text-white/40" : "text-slate-400"}>
                  {deltaRating >= 0 ? "+" : ""}
                  {deltaRating.toFixed(1)}★
                </span>
                <span className={deltaResenas >= 0 ? (hero ? "text-white" : "text-slate-900") : hero ? "text-white/40" : "text-slate-400"}>
                  {deltaResenas >= 0 ? "+" : ""}
                  {fmtNum(deltaResenas)} reseñas
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      <p className={`mt-4 text-sm font-semibold ${hero ? "text-white" : "text-slate-800"}`}>{nombre}</p>
      <p className={`text-xs ${hero ? "text-white/60" : "text-slate-500"}`}>{subtitulo}</p>
    </div>
  );
}

