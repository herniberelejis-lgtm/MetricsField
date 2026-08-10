import type { LinkNFC } from "@/lib/types";
import { Card } from "@/components/ui";
import { IconDevice } from "@/components/portal/PortalShell";
import DispositivosTabla from "@/components/portal/DispositivosTabla";

// Panel "Dispositivos": tabla de todos los links NFC/QR del local activo,
// más el ranking de taps por cartel cuando hay más de uno.
export default function PanelDispositivos({
  linksConTaps,
  codigoAcceso,
  comercioId,
  tieneSoporteQr,
  totalTapsHistorico,
}: {
  linksConTaps: LinkNFC[];
  codigoAcceso: string;
  comercioId: string;
  tieneSoporteQr: boolean;
  totalTapsHistorico: number;
}) {
  if (linksConTaps.length === 0) {
    return (
      <Card variant="glass">
        <p className="text-sm text-slate-600">Todavía no tenés dispositivos asignados.</p>
      </Card>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        Tocá &ldquo;Editar&rdquo; en cualquier dispositivo para cambiar a dónde manda — el cartel impreso no cambia,
        solo a dónde redirige.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <DispositivosTabla
          links={linksConTaps}
          codigo={codigoAcceso}
          comercioId={comercioId}
          tieneSoporteQr={tieneSoporteQr}
          iconoDispositivo={
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
              <IconDevice size={16} />
            </span>
          }
        />
      </div>

      {linksConTaps.length > 1 && totalTapsHistorico > 0 && (
        <Card variant="glass" className="mt-4">
          <p className="text-sm font-medium text-slate-700">Taps por cartel</p>
          <p className="mt-0.5 text-xs text-slate-500">histórico total, desde que se instaló cada uno</p>
          <div className="mt-3 space-y-2">
            {linksConTaps.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-slate-600">
                  {l.etiqueta}
                  {tieneSoporteQr && (
                    <span className="ml-1 text-[10px] uppercase text-slate-400">
                      · {l.tipo === "ambos" ? "NFC+QR" : l.tipo}
                    </span>
                  )}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: totalTapsHistorico ? `${Math.max(4, (l.taps / totalTapsHistorico) * 100)}%` : "0%" }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">{l.taps}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
