import type { ReactNode } from "react";
import type { EstadoCliente, Plan } from "@/lib/types";

// Botones consistentes para todo lo que sea un CTA de verdad (no cada
// pantalla inventando su propio padding/radio) — foco visible siempre,
// para teclado y lectores de pantalla.
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
export const btnSuccess =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50";

/** Encabezado de sección reutilizable: título + descripción corta, mismo
 * peso tipográfico en toda la app en vez de que cada pantalla lo reinvente. */
export function SectionHeading({
  id,
  title,
  subtitle,
  action,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div id={id} className="mb-3 mt-9 scroll-mt-6 flex items-end justify-between gap-3 first:mt-0">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: { dir: "up" | "down" | "flat"; text: string; good?: boolean };
}) {
  const deltaColor =
    !delta || delta.dir === "flat"
      ? "text-slate-400"
      : delta.good
        ? "text-emerald-600"
        : "text-rose-600";
  const arrow =
    delta?.dir === "up" ? "▲" : delta?.dir === "down" ? "▼" : "→";
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span className={deltaColor}>
            {arrow} {delta.text}
          </span>
        )}
        {hint && <span className="text-slate-400">{hint}</span>}
      </div>
    </Card>
  );
}

/** Sparkline SVG simple, sin dependencias. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  invert = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  invert?: boolean; // true cuando "menos es mejor" para esta métrica
}) {
  if (values.length === 0) return null;
  if (values.length === 1) {
    // un solo dato: todavía no hay tendencia que dibujar — un punto
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <circle cx={width / 2} cy={height / 2} r={4} fill="#2a78d6" stroke="#ffffff" strokeWidth={2} />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const norm = (v - min) / range;
    const y = invert ? norm * height : height - norm * height;
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = values[values.length - 1] >= values[0];
  const good = invert ? !rising : rising;
  const stroke = good ? "#059669" : "#e11d48";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const cls =
    plan === "Premium"
      ? "bg-violet-100 text-violet-700"
      : "bg-sky-100 text-sky-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {plan}
    </span>
  );
}

const estadoStyles: Record<EstadoCliente, string> = {
  activo: "bg-emerald-100 text-emerald-700",
  pausado: "bg-amber-100 text-amber-700",
  prospecto: "bg-slate-100 text-slate-600",
  baja: "bg-rose-100 text-rose-700",
};

export function EstadoBadge({ estado }: { estado: EstadoCliente }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${estadoStyles[estado]}`}
    >
      {estado}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-400" aria-hidden>
        {"★".repeat(full)}
        <span className="text-slate-200">{"★".repeat(5 - full)}</span>
      </span>
      <span className="text-xs font-medium text-slate-600">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
