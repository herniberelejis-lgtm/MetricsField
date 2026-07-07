import type { Metadata } from "next";
import Link from "next/link";
import { getClientes } from "@/lib/db";
import {
  metricaActual,
  metricaAnterior,
  citasIA,
  ingresoNFC,
  type Cliente,
} from "@/lib/types";
import { fmtARS, fmtNum, delta } from "@/lib/format";
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

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const clientes = await getClientes();
  const activos = clientes.filter((c) => c.estado === "activo");

  const mrr = sum(activos.map((c) => c.fee));
  const nfcTotal = sum(clientes.map(ingresoNFC));

  const resenasEsteMes = sum(
    activos.map((c) => metricaActual(c)?.resenasNuevas ?? 0),
  );
  const resenasMesPrevio = sum(
    activos.map((c) => metricaAnterior(c)?.resenasNuevas ?? 0),
  );
  const dResenas = delta(resenasEsteMes, resenasMesPrevio);

  const citasEsteMes = sum(activos.map((c) => citasIA(metricaActual(c))));
  const citasMesPrevio = sum(activos.map((c) => citasIA(metricaAnterior(c))));
  const dCitas = delta(citasEsteMes, citasMesPrevio);

  const premium = activos.filter((c) => c.plan === "Premium").length;

  return (
    <div>
      <PageHeader
        title="Panel general"
        subtitle="Resumen de la cartera de clientes · Jun 2026"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Clientes activos"
          value={fmtNum(activos.length)}
          hint={`${premium} Premium`}
        />
        <Kpi
          label="Ingreso recurrente (MRR)"
          value={fmtARS(mrr)}
          hint="abonos mensuales"
        />
        <Kpi
          label="Reseñas nuevas (mes)"
          value={fmtNum(resenasEsteMes)}
          delta={{
            dir: dResenas.dir,
            text:
              dResenas.pct !== null
                ? `${dResenas.valor >= 0 ? "+" : ""}${dResenas.pct.toFixed(0)}% vs mes previo`
                : `${dResenas.valor >= 0 ? "+" : ""}${dResenas.valor}`,
            good: dResenas.dir === "up",
          }}
        />
        <Kpi
          label="Citaciones en IA (mes)"
          value={fmtNum(citasEsteMes)}
          delta={{
            dir: dCitas.dir,
            text:
              dCitas.pct !== null
                ? `${dCitas.valor >= 0 ? "+" : ""}${dCitas.pct.toFixed(0)}% vs mes previo`
                : `${dCitas.valor >= 0 ? "+" : ""}${dCitas.valor}`,
            good: dCitas.dir === "up",
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Kpi
          label="Ingreso por NFC (histórico)"
          value={fmtARS(nfcTotal)}
          hint="producto físico"
        />
        <Kpi
          label="Prospectos"
          value={fmtNum(clientes.filter((c) => c.estado === "prospecto").length)}
          hint="a convertir a recurrente"
        />
        <Kpi
          label="Rating promedio cartera"
          value={(
            sum(activos.map((c) => metricaActual(c)?.ratingPromedio ?? 0)) /
            (activos.length || 1)
          ).toFixed(2)}
          hint="estrellas Google"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Clientes
      </h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Visitas</th>
              <th className="px-4 py-3 font-medium">Reseñas (5m)</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Row({ c }: { c: Cliente }) {
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
      <td className="px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums">
        {new Date(c.fechaAlta).toLocaleDateString("es-AR")}
      </td>
      <td className="px-4 py-3">
        {m ? <Stars rating={m.ratingPromedio} /> : "—"}
      </td>
      <td className="px-4 py-3">
        {m ? (
          <span className="font-medium text-slate-700">{m.visitasPerfil}</span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3">
        <Sparkline values={c.historico.map((h) => h.resenasTotal)} />
      </td>
    </tr>
  );
}
