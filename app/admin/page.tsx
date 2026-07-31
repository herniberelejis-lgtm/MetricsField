import type { Metadata } from "next";
import Link from "next/link";
import {
  getCuentas,
  getResenasResumenPortfolio,
  getTapsResumenPortfolio,
  getVisitasPerfilPortfolio,
} from "@/lib/db";
import { metricaActual, type Cliente } from "@/lib/types";
import { fmtARS, fmtNum } from "@/lib/format";
import {
  Card,
  Kpi,
  PageHeader,
  PlanBadge,
  EstadoBadge,
  Stars,
  Sparkline,
} from "@/components/ui";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

// Panel único: antes "Panel" y "Analytics" repetían buena parte de los
// mismos números (reseñas, visitas) con dos fuentes de verdad distintas.
// Ahora hay una sola: las métricas clave de la cartera, con un selector de
// período que controla todo lo que tiene sentido mirar en rangos de
// tiempo. MRR y clientes activos son estado actual (no dependen del
// período); reseñas/taps/vistas sí.
type PeriodoKey = "hoy" | "semana" | "mes" | "anio" | "todo";
const PERIODOS: { key: PeriodoKey; label: string; dias: number | null }[] = [
  { key: "hoy", label: "Hoy", dias: 0 },
  { key: "semana", label: "7 días", dias: 7 },
  { key: "mes", label: "Último mes", dias: 30 },
  { key: "anio", label: "Último año", dias: 365 },
  { key: "todo", label: "Todo", dias: null },
];

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoParam } = await searchParams;
  const periodo = PERIODOS.find((p) => p.key === periodoParam) ?? PERIODOS[2];

  const hoy = new Date();
  const hasta = fechaISO(hoy);
  const desde =
    periodo.dias === null
      ? "2000-01-01"
      : fechaISO(new Date(hoy.getTime() - periodo.dias * 86_400_000));
  // Vistas al perfil solo existe como dato mensual (metricas_mensuales, carga
  // a mano) — no hay granularidad diaria. Un período de menos de un mes cae
  // igual en el mes que lo contiene; se avisa en el hint del KPI.
  const mesDesde = desde.slice(0, 7);
  const mesHasta = hasta.slice(0, 7);

  const [clientes, resenasResumen, tapsResumen, visitas] = await Promise.all([
    getCuentas(),
    getResenasResumenPortfolio(desde, hasta),
    getTapsResumenPortfolio(desde, hasta),
    getVisitasPerfilPortfolio(mesDesde, mesHasta),
  ]);

  const activos = clientes.filter((c) => c.estado === "activo");
  const mrr = sum(activos.map((c) => c.fee));
  const tapsTotal = tapsResumen.nfc + tapsResumen.qr;
  const visitasPorCliente = new Map(visitas.porCliente.map((v) => [v.comercioId, v.visitas]));
  const maxEstrellas = Math.max(...Object.values(resenasResumen.porEstrellas), 1);

  return (
    <div>
      <PageHeader
        title="Panel"
        subtitle="Métricas clave de la cartera"
        actions={
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
            {PERIODOS.map((p) => (
              <Link
                key={p.key}
                href={`/admin?periodo=${p.key}`}
                aria-current={p.key === periodo.key ? "true" : undefined}
                className={
                  p.key === periodo.key
                    ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                }
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ingreso recurrente (MRR)" value={fmtARS(mrr)} hint="abonos activos, hoy" />
        <Kpi label="Clientes activos" value={fmtNum(activos.length)} hint="de la cartera, hoy" />
        <Kpi
          label="Reseñas totales"
          value={fmtNum(resenasResumen.total)}
          hint={periodo.label.toLowerCase()}
        />
        <Kpi
          label="Reseñas negativas"
          value={fmtNum(resenasResumen.negativas)}
          hint="3★ o menos"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Taps del cartel (NFC + QR)"
          value={fmtNum(tapsTotal)}
          hint={`${fmtNum(tapsResumen.nfc)} NFC · ${fmtNum(tapsResumen.qr)} QR`}
        />
        <Kpi
          label="Vistas al perfil"
          value={fmtNum(visitas.total)}
          hint="dato mensual, no diario"
        />
        <Kpi
          label="Rating promedio cartera"
          value={(
            sum(activos.map((c) => metricaActual(c)?.ratingPromedio ?? 0)) /
            (activos.length || 1)
          ).toFixed(2)}
          hint="estrellas Google, hoy"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Reseñas por cantidad de estrellas · {periodo.label.toLowerCase()}
      </h2>
      <Card>
        {resenasResumen.total === 0 ? (
          <p className="text-sm text-slate-500">No hay reseñas cargadas en este período.</p>
        ) : (
          <div className="space-y-2.5">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const cantidad = resenasResumen.porEstrellas[n];
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-xs text-slate-500">{n}★</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${n <= 3 ? "bg-rose-500" : "bg-emerald-600"}`}
                      style={{ width: cantidad ? `${Math.max(4, (cantidad / maxEstrellas) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                    {cantidad}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Detalle por cliente: nada de arriba se filtra por plan — acá se
          puede discriminar el dato de cada uno individualmente. */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Detalle por cliente</h2>
      {/* overflow-x-auto y no overflow-hidden: en mobile la tabla es más ancha
          que la pantalla y con hidden las últimas columnas se perdían. */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Vistas al perfil</th>
              <th className="px-4 py-3 font-medium">Reseñas (histórico)</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <Row key={c.id} c={c} visitas={visitasPorCliente.get(c.id) ?? 0} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Row({ c, visitas }: { c: Cliente; visitas: number }) {
  const m = metricaActual(c);
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link
          href={`/admin/clientes/${c.id}`}
          className="font-medium text-slate-900 hover:text-brand-fg"
        >
          {c.nombre}
        </Link>
        <div className="text-xs text-slate-500">
          {c.rubro} · {c.zona}
        </div>
      </td>
      <td className="px-4 py-3">
        <PlanBadge plan={c.plan} />
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estado={c.estado} />
      </td>
      <td className="px-4 py-3">
        {m ? <Stars rating={m.ratingPromedio} /> : "—"}
      </td>
      <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
        {c.estado === "activo" ? fmtNum(visitas) : "—"}
      </td>
      <td className="px-4 py-3">
        <Sparkline values={c.historico.map((h) => h.resenasTotal)} />
      </td>
    </tr>
  );
}
