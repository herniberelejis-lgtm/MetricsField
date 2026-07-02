import Link from "next/link";
import { getClientes } from "@/lib/db";
import { metricaActual, citasIA, ingresoNFC } from "@/lib/types";
import { fmtARS } from "@/lib/format";
import {
  Card,
  PageHeader,
  PlanBadge,
  EstadoBadge,
  Stars,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ClientesPage() {
  const clientes = getClientes();
  const ordenados = [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cuentas en cartera`}
        actions={
          <Link
            href="/admin/clientes/nuevo"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Nuevo cliente
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordenados.map((c) => {
          const m = metricaActual(c);
          return (
            <Link key={c.id} href={`/admin/clientes/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{c.nombre}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {c.rubro} · {c.zona}
                    </div>
                  </div>
                  <PlanBadge plan={c.plan} />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {m ? <Stars rating={m.ratingPromedio} /> : <span className="text-xs text-slate-400">sin datos</span>}
                  <EstadoBadge estado={c.estado} />
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <dt className="text-[11px] uppercase text-slate-400">Reseñas</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {m?.resenasTotal ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-slate-400">Maps</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {m ? `#${m.posicionMaps}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase text-slate-400">IA</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {c.plan === "Premium" ? citasIA(m) : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Abono {fmtARS(c.fee)}</span>
                  <span>NFC {fmtARS(ingresoNFC(c))}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
