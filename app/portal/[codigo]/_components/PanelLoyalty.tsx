import { Card } from "@/components/ui";
import ValidarCanje from "@/components/portal/ValidarCanje";
import type { CanjeReciente, MetricasLoyalty, SocioLoyalty } from "@/lib/db/loyalty";

// Panel "Club de beneficios" (Loyalty): lo que el comercio nunca tuvo con
// Reviews — quiénes son sus clientes, cuántos vuelven, qué canjean — y la
// caja para validar canjes. Los datos personales de la lista los aceptó
// compartir cada cliente con ESTE comercio al registrarse.

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Cordoba" });
}

function Dato({ valor, etiqueta, detalle }: { valor: string; etiqueta: string; detalle?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      <p className="text-xs font-medium text-slate-600">{etiqueta}</p>
      {detalle && <p className="mt-0.5 text-[11px] text-slate-400">{detalle}</p>}
    </div>
  );
}

export default function PanelLoyalty({
  codigoAcceso,
  comercioId,
  nombreLocal,
  linkLanding,
  metricas,
  socios,
  canjes,
}: {
  codigoAcceso: string;
  comercioId: string;
  nombreLocal: string;
  linkLanding: string;
  metricas: MetricasLoyalty;
  socios: SocioLoyalty[];
  canjes: CanjeReciente[];
}) {
  const retorno =
    metricas.retorno30d.base > 0 ? `${Math.round((metricas.retorno30d.volvieron / metricas.retorno30d.base) * 100)}%` : "—";
  const aWallet =
    metricas.registros30d > 0 ? `${Math.round((metricas.clicsWallet30d / metricas.registros30d) * 100)}%` : "—";

  return (
    <div className="space-y-4">
      <Card variant="glass">
        <p className="text-sm font-semibold text-slate-900">Validar un canje</p>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">
          El cliente te muestra un código de 6 letras en su celular. Vence a los 15 minutos.
        </p>
        <ValidarCanje codigo={codigoAcceso} comercioId={comercioId} />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato valor={String(metricas.tarjetas)} etiqueta="Socios" detalle={`+${metricas.nuevas30d} en 30 días`} />
        <Dato valor={String(metricas.visitas30d)} etiqueta="Visitas" detalle="últimos 30 días" />
        <Dato
          valor={retorno}
          etiqueta="Volvieron"
          detalle={metricas.retorno30d.base > 0 ? `${metricas.retorno30d.volvieron} de ${metricas.retorno30d.base} socios` : "con 30 días de antigüedad"}
        />
        <Dato valor={String(metricas.canjes30d)} etiqueta="Canjes" detalle="últimos 30 días" />
      </div>
      <p className="text-xs text-slate-500">
        {metricas.tarjetasEnWallet} de {metricas.tarjetas} tarjetas emitidas en Google Wallet · {aWallet} de los que se
        registraron en 30 días tocaron &ldquo;Guardar en Google Wallet&rdquo;.
      </p>

      <Card variant="glass">
        <p className="text-sm font-semibold text-slate-900">Link del club</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Es lo que abre el cartel de fidelización de {nombreLocal}. Compartilo también por WhatsApp o redes.
        </p>
        <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700">{linkLanding}</p>
      </Card>

      <Card variant="glass" className="overflow-x-auto">
        <p className="text-sm font-semibold text-slate-900">Socios</p>
        {socios.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Todavía no se registró nadie.</p>
        ) : (
          <table className="mt-3 w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Nombre</th>
                <th className="pb-2 font-medium">Celular</th>
                <th className="pb-2 font-medium">Puntos</th>
                <th className="pb-2 font-medium">Última visita</th>
                <th className="pb-2 font-medium">Promos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {socios.map((s, i) => (
                <tr key={i}>
                  <td className="py-2 text-slate-900">{s.nombre}</td>
                  <td className="py-2 tabular-nums text-slate-600">{s.telefono}</td>
                  <td className="py-2 tabular-nums text-slate-900">{s.saldo}</td>
                  <td className="py-2 text-slate-600">{fecha(s.ultimaVisita)}</td>
                  <td className="py-2 text-slate-600">{s.aceptaMarketing ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          &ldquo;Promos&rdquo; = aceptó recibir promociones. A quien dijo que no, no le mandes publicidad. Nombre y
          teléfono los escribe cada cliente y no están verificados.
        </p>
      </Card>

      {canjes.length > 0 && (
        <Card variant="glass">
          <p className="text-sm font-semibold text-slate-900">Últimos canjes</p>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {canjes.map((c, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="text-slate-700">
                  {c.beneficio} · {c.cliente}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {fecha(c.validadoEn)} · −{c.costoPuntos}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
