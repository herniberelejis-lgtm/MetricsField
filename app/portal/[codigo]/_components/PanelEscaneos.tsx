import { Card, IconWave } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";

// Panel "Escaneos": total de taps del cartel y su evolución diaria — se
// actualiza solo, apenas pasa, nadie tiene que cargar nada.
export default function PanelEscaneos({
  totalTapsHistorico,
  tieneSoporteQr,
  totalTapsNfc,
  totalTapsQr,
  diasConTaps,
  labelsTaps,
  nfcPorDia,
  qrPorDia,
  codigoAcceso,
  comercioId,
}: {
  totalTapsHistorico: number;
  tieneSoporteQr: boolean;
  totalTapsNfc: number;
  totalTapsQr: number;
  diasConTaps: string[];
  labelsTaps: string[];
  nfcPorDia: number[];
  qrPorDia: number[];
  codigoAcceso: string;
  comercioId: string;
}) {
  return (
    <>
      <p className="mb-4 text-sm text-slate-500">Esto se actualiza solo, apenas pasa — nadie tiene que cargar nada.</p>
      <Card variant="glass" className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Taps del cartel</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {fmtNum(totalTapsHistorico)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">veces que alguien tocó o escaneó tu cartel desde que se instaló</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-fg" aria-hidden>
            <IconWave size={22} />
          </span>
        </div>
        {tieneSoporteQr && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">{fmtNum(totalTapsNfc)}</span>
              vía NFC
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">{fmtNum(totalTapsQr)}</span>
              vía QR (aprox.)
            </span>
          </div>
        )}
      </Card>

      {diasConTaps.length > 0 ? (
        <TapsPorSoporteChart
          labels={labelsTaps}
          fechas={diasConTaps}
          nfc={nfcPorDia}
          qr={qrPorDia}
          mostrarQr={tieneSoporteQr}
          codigo={codigoAcceso}
          comercioId={comercioId}
        />
      ) : (
        <Card variant="glass">
          <p className="text-sm text-slate-600">
            Todavía no hay actividad del cartel. En cuanto alguien lo toque por primera vez,
            vas a ver acá el total de taps.
          </p>
        </Card>
      )}
    </>
  );
}
