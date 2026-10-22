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
      <p className="mb-3 text-sm text-slate-600">
        Tocá &ldquo;Editar&rdquo; en cualquier dispositivo para cambiar a dónde manda — el cartel impreso no cambia,
        solo a dónde redirige.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-[#E4E6EA] bg-white">
        <DispositivosTabla
          links={linksConTaps}
          codigo={codigoAcceso}
          comercioId={comercioId}
          tieneSoporteQr={tieneSoporteQr}
          iconoDispositivo={
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F4F7FB] text-slate-600">
              <IconDevice size={16} />
            </span>
          }
        />
      </div>

      {linksConTaps.length > 1 && totalTapsHistorico > 0 && (
        <Card variant="glass" className="mt-4">
          <p className="text-[15px] font-bold text-slate-900">Toques por pieza</p>
          <p className="mt-0.5 text-xs text-slate-600">Desde que se instaló cada una</p>
          <div className="mt-3 space-y-2">
            {linksConTaps.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-slate-600">
                  {l.etiqueta}
                  {tieneSoporteQr && (
                    <span className="ml-1 text-[10px] text-slate-600">
                      · {l.tipo === "ambos" ? "NFC+QR" : l.tipo}
                    </span>
                  )}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
                  <div
                    className="h-full rounded-full bg-[#7FA7D3]"
                    style={{ width: totalTapsHistorico && l.taps ? `${Math.max(2, (l.taps / totalTapsHistorico) * 100)}%` : "0%" }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-slate-900">{l.taps}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
