import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import { accionRegenerarCodigo } from "@/app/actions";
import {
  metricaActual,
  metricaAnterior,
  citasIA,
  ingresoNFC,
} from "@/lib/types";
import { fmtARS, fmtNum, fmtMes, delta } from "@/lib/format";
import {
  Card,
  Kpi,
  PageHeader,
  PlanBadge,
  EstadoBadge,
  Stars,
  Sparkline,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCliente(id);
  if (!c) notFound();

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  const esPremium = c.plan === "Premium";

  const dResenas = delta(m?.resenasNuevas ?? 0, prev?.resenasNuevas ?? 0);
  const dMaps = delta(m?.posicionMaps ?? 0, prev?.posicionMaps ?? 0);
  const dVisitas = delta(m?.visitasPerfil ?? 0, prev?.visitasPerfil ?? 0);
  const dCitas = delta(citasIA(m), citasIA(prev));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href="/admin/clientes" className="text-slate-500 hover:text-brand-fg">
          ← Clientes
        </Link>
      </div>

      <PageHeader
        title={c.nombre}
        subtitle={`${c.rubro} · ${c.zona} · alta ${new Date(c.fechaAlta).toLocaleDateString("es-AR")}`}
        actions={
          <div className="flex items-center gap-2">
            <EstadoBadge estado={c.estado} />
            <PlanBadge plan={c.plan} />
          </div>
        }
      />

      {/* Acciones */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/admin/clientes/${c.id}/metricas`}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Cargar métricas
        </Link>
        <Link
          href={`/admin/clientes/${c.id}/editar`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        >
          Editar / Venta NFC
        </Link>
        <Link
          href={`/admin/clientes/${c.id}/links`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        >
          Links NFC
        </Link>
        <Link
          href={`/admin/reportes/${c.id}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
        >
          Ver reporte mensual
        </Link>
      </div>

      {/* Acceso del cliente a su portal */}
      <div className="mb-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-fg">
              Portal del cliente
            </div>
            <div className="mt-1 text-sm text-slate-700">
              Código de acceso:{" "}
              <code className="rounded bg-white px-2 py-0.5 font-mono text-sm font-semibold text-slate-900">
                {c.codigoAcceso}
              </code>
              <span className="ml-3 text-slate-500">
                Link:{" "}
                <Link
                  href={`/portal/${c.codigoAcceso}`}
                  className="font-medium text-brand-fg hover:underline"
                  target="_blank"
                >
                  /portal/{c.codigoAcceso}
                </Link>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Compartile este link por WhatsApp: ve solo sus datos, su evolución
              y las recomendaciones del mes.
            </p>
          </div>
          <form action={accionRegenerarCodigo}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400"
            >
              Regenerar código
            </button>
          </form>
        </div>
      </div>

      {/* Ficha */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Contacto
          </div>
          <div className="mt-1 text-sm text-slate-800">{c.contacto}</div>
          <a
            href={c.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-brand-fg hover:underline"
          >
            Link de reseñas (NFC) ↗
          </a>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Búsqueda clave
          </div>
          <div className="mt-1 text-sm text-slate-800">“{c.busquedaClave}”</div>
          <div className="mt-2 text-xs text-slate-500">
            Posición actual en Maps:{" "}
            <span className="font-medium text-slate-700">
              #{m?.posicionMaps ?? "—"}
            </span>
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Facturación
          </div>
          <div className="mt-1 text-sm text-slate-800">
            Abono mensual {fmtARS(c.fee)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Producto NFC vendido: {fmtARS(ingresoNFC(c))}
          </div>
        </Card>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Reseñas nuevas"
          value={fmtNum(m?.resenasNuevas ?? 0)}
          hint={`total ${m?.resenasTotal ?? 0}`}
          delta={{
            dir: dResenas.dir,
            text: `${dResenas.valor >= 0 ? "+" : ""}${dResenas.valor} vs mes previo`,
            good: dResenas.dir === "up",
          }}
        />
        <Kpi
          label="Posición en Maps"
          value={`#${m?.posicionMaps ?? "—"}`}
          delta={{
            // menos es mejor: bajar la posición (dir down) es bueno
            dir: dMaps.dir,
            text: `${dMaps.valor >= 0 ? "+" : ""}${dMaps.valor} vs mes previo`,
            good: dMaps.dir === "down",
          }}
        />
        <Kpi
          label="Visitas al perfil"
          value={fmtNum(m?.visitasPerfil ?? 0)}
          delta={{
            dir: dVisitas.dir,
            text:
              dVisitas.pct !== null
                ? `${dVisitas.valor >= 0 ? "+" : ""}${dVisitas.pct.toFixed(0)}%`
                : `${dVisitas.valor}`,
            good: dVisitas.dir === "up",
          }}
        />
        <Kpi
          label={esPremium ? "Citaciones en IA" : "Llamadas"}
          value={fmtNum(esPremium ? citasIA(m) : (m?.llamadas ?? 0))}
          delta={
            esPremium
              ? {
                  dir: dCitas.dir,
                  text: `${dCitas.valor >= 0 ? "+" : ""}${dCitas.valor} vs mes previo`,
                  good: dCitas.dir === "up",
                }
              : undefined
          }
          hint={esPremium ? "ChatGPT+Copilot+Perplexity" : "vía Google Maps"}
        />
      </div>

      {/* Evolución */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Evolución
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Reseñas acumuladas
            </span>
            <Stars rating={m?.ratingPromedio ?? 0} />
          </div>
          <Sparkline
            values={c.historico.map((h) => h.resenasTotal)}
            width={280}
            height={60}
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Posición en Google Maps
            </span>
            <span className="text-xs text-slate-400">menos es mejor</span>
          </div>
          <Sparkline
            values={c.historico.map((h) => h.posicionMaps)}
            width={280}
            height={60}
            invert
          />
        </Card>
      </div>

      {/* Tabla histórica */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Detalle mensual
      </h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Mes</th>
              <th className="px-4 py-3 font-medium">Reseñas nuevas</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Maps</th>
              <th className="px-4 py-3 font-medium">Visitas</th>
              <th className="px-4 py-3 font-medium">Llamadas</th>
              {esPremium && <th className="px-4 py-3 font-medium">Citas IA</th>}
            </tr>
          </thead>
          <tbody>
            {[...c.historico].reverse().map((h) => (
              <tr
                key={h.mes}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {fmtMes(h.mes)}
                </td>
                <td className="px-4 py-3">{fmtNum(h.resenasNuevas)}</td>
                <td className="px-4 py-3">{fmtNum(h.resenasTotal)}</td>
                <td className="px-4 py-3">{h.ratingPromedio.toFixed(1)}</td>
                <td className="px-4 py-3">#{h.posicionMaps}</td>
                <td className="px-4 py-3">{fmtNum(h.visitasPerfil)}</td>
                <td className="px-4 py-3">{fmtNum(h.llamadas)}</td>
                {esPremium && (
                  <td className="px-4 py-3">{fmtNum(citasIA(h))}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
