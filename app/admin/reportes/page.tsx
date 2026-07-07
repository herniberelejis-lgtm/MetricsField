import type { Metadata } from "next";
import Link from "next/link";
import { getClientes } from "@/lib/db";
import { metricaActual } from "@/lib/types";
import { Card, PageHeader, PlanBadge } from "@/components/ui";
import { fmtMes } from "@/lib/format";

export const metadata: Metadata = { title: "Reportes" };
export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const clientes = await getClientes();
  const activos = clientes.filter((c) => c.estado === "activo");
  const conDatos = activos.find((c) => c.historico.length > 0);
  const mesRef = conDatos ? metricaActual(conDatos)?.mes : undefined;

  return (
    <div>
      <PageHeader
        title="Reportes mensuales"
        subtitle={
          mesRef
            ? `Generá el reporte del cliente · ${fmtMes(mesRef)}`
            : "Generá el reporte del cliente"
        }
      />

      <p className="mb-6 max-w-2xl text-sm text-slate-500">
        Cada reporte sigue el formato del proyecto: 1–2 páginas, 3 métricas
        clave y una recomendación concreta para el mes siguiente. Abrí el
        reporte y usá “Imprimir / PDF” para enviarlo por WhatsApp.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {activos.map((c) => (
          <Link key={c.id} href={`/admin/reportes/${c.id}`}>
            <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
              <div>
                <div className="font-medium text-slate-900">{c.nombre}</div>
                <div className="text-xs text-slate-500">
                  {c.rubro} · {c.zona}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PlanBadge plan={c.plan} />
                <span className="text-sm text-brand-fg">Ver reporte →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
