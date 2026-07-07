import type { Metadata } from "next";
import { getClientes, getCobrosConComercio } from "@/lib/db";
import type { Cobro } from "@/lib/types";
import { fmtARS, fmtMes } from "@/lib/format";
import { Card, Kpi, PageHeader, PlanBadge } from "@/components/ui";
import {
  accionRegistrarCobro,
  accionMarcarPagado,
  accionEliminarCobro,
} from "./actions";

export const metadata: Metadata = { title: "Finanzas" };
export const dynamic = "force-dynamic";

const HOY = new Date().toISOString().slice(0, 10);
const MES_ACTUAL = new Date().toISOString().slice(0, 7);

type EstadoCobranza = "pagado" | "pendiente" | "vencido" | "sin-generar";

// El estado que se muestra deriva del cobro (no se persiste "vencido"):
// pagado si está pagado; vencido si sigue pendiente y ya pasó su
// vencimiento; pendiente si no; sin-generar si no hay cobro del período.
function estadoDe(cobro: Cobro | undefined): EstadoCobranza {
  if (!cobro) return "sin-generar";
  if (cobro.estado === "pagado") return "pagado";
  if (cobro.venceEl && cobro.venceEl < HOY) return "vencido";
  return "pendiente";
}

const BADGE: Record<EstadoCobranza, { label: string; cls: string }> = {
  pagado: { label: "Pagado", cls: "bg-emerald-50 text-emerald-700" },
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700" },
  vencido: { label: "Vencido", cls: "bg-rose-50 text-rose-700" },
  "sin-generar": { label: "Sin generar", cls: "bg-slate-100 text-slate-500" },
};

function Badge({ estado }: { estado: EstadoCobranza }) {
  const b = BADGE[estado];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>
      {b.label}
    </span>
  );
}

function fechaCorta(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("es-AR") : "—";
}

export default async function FinanzasPage() {
  const [clientes, cobros] = await Promise.all([
    getClientes(),
    getCobrosConComercio(),
  ]);
  const activos = clientes.filter((c) => c.estado === "activo");

  // Cobro del abono del mes actual por comercio (para el monitor).
  const abonoDelMes = new Map<string, Cobro>();
  for (const co of cobros) {
    if (co.periodo === MES_ACTUAL && co.concepto === "abono" && !abonoDelMes.has(co.comercioId)) {
      abonoDelMes.set(co.comercioId, co);
    }
  }

  const cobradoMes = cobros
    .filter((c) => c.periodo === MES_ACTUAL && c.estado === "pagado")
    .reduce((a, c) => a + c.monto, 0);
  const pendienteMes = cobros
    .filter((c) => c.periodo === MES_ACTUAL && c.estado === "pendiente")
    .reduce((a, c) => a + c.monto, 0);
  const mrr = activos.reduce((a, c) => a + c.fee, 0);

  return (
    <div>
      <PageHeader
        title="Finanzas"
        subtitle={`Cobranza y suscripciones · ${fmtMes(MES_ACTUAL)}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ingreso recurrente (MRR)" value={fmtARS(mrr)} hint="abonos de activos" />
        <Kpi label="Cobrado este mes" value={fmtARS(cobradoMes)} hint="cobros pagados" />
        <Kpi label="Pendiente este mes" value={fmtARS(pendienteMes)} hint="cobros sin pagar" />
        <Kpi label="Clientes activos" value={String(activos.length)} hint="con suscripción" />
      </div>

      {/* Monitor de cobranza del mes + suscripción por cliente */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Estado de cobranza — {fmtMes(MES_ACTUAL)}
      </h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Suscripción</th>
              <th className="px-4 py-3 font-medium">Abono</th>
              <th className="px-4 py-3 font-medium">Este mes</th>
              <th className="px-4 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {activos.map((c) => {
              const cobro = abonoDelMes.get(c.id);
              const estado = estadoDe(cobro);
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={c.plan} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{fmtARS(c.fee)}</td>
                  <td className="px-4 py-3">
                    <Badge estado={estado} />
                  </td>
                  <td className="px-4 py-3">
                    {estado === "sin-generar" ? (
                      <form action={accionRegistrarCobro}>
                        <input type="hidden" name="comercioId" value={c.id} />
                        <input type="hidden" name="periodo" value={MES_ACTUAL} />
                        <input type="hidden" name="concepto" value="abono" />
                        <input type="hidden" name="monto" value={c.fee} />
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                        >
                          Generar abono
                        </button>
                      </form>
                    ) : cobro && estado !== "pagado" ? (
                      <form action={accionMarcarPagado}>
                        <input type="hidden" name="id" value={cobro.id} />
                        <input type="hidden" name="pagado" value="true" />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Marcar pagado
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">
                        cobrado {fechaCorta(cobro?.pagadoEl ?? null)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {activos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No hay clientes activos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Registrar un cobro (cualquier concepto/período) */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Registrar cobro</h2>
      <Card>
        <form action={accionRegistrarCobro} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">
            Comercio
            <select
              name="comercioId"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            >
              <option value="">Elegí…</option>
              {clientes
                .filter((c) => c.estado !== "baja")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Período (mes)
            <input
              type="month"
              name="periodo"
              defaultValue={MES_ACTUAL}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Concepto
            <select
              name="concepto"
              defaultValue="abono"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            >
              <option value="abono">Abono mensual</option>
              <option value="nfc">Producto NFC</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Monto (ARS)
            <input
              type="number"
              name="monto"
              min="0"
              step="1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Vence el
            <input
              type="date"
              name="venceEl"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Método
            <input
              type="text"
              name="metodo"
              placeholder="Transferencia, efectivo…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-2">
            <input type="checkbox" name="pagado" className="h-4 w-4 rounded border-slate-300" />
            Ya está pagado
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Registrar
            </button>
          </div>
        </form>
      </Card>

      {/* Historial completo */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Historial de cobros</h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Pagado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobros.map((co) => {
              const estado = estadoDe(co);
              return (
                <tr key={co.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 tabular-nums text-slate-700">{fmtMes(co.periodo)}</td>
                  <td className="px-4 py-3 text-slate-700">{co.comercioNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{co.concepto}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{fmtARS(co.monto)}</td>
                  <td className="px-4 py-3">
                    <Badge estado={estado} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{fechaCorta(co.pagadoEl)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <form action={accionMarcarPagado}>
                        <input type="hidden" name="id" value={co.id} />
                        <input type="hidden" name="pagado" value={co.estado === "pagado" ? "false" : "true"} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          {co.estado === "pagado" ? "Marcar pendiente" : "Marcar pagado"}
                        </button>
                      </form>
                      <form action={accionEliminarCobro}>
                        <input type="hidden" name="id" value={co.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-rose-600 hover:text-rose-800"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {cobros.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  Todavía no hay cobros registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
