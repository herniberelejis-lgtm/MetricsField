import { Card } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";
import TiraMetricas from "@/components/portal/TiraMetricas";

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
  // Métricas arriba en una tira (components/portal/TiraMetricas.tsx): sin
  // íconos en círculos ni cifras de 48px.
  const porDia = nfcPorDia.map((n, i) => n + (qrPorDia[i] ?? 0));
  const enPeriodo = porDia.reduce((a, b) => a + b, 0);
  const mejor = porDia.reduce((m, v, i) => (v > (porDia[m] ?? -1) ? i : m), 0);
  const celdas: { etiqueta: string; valor: string; detalle: string }[] = [
    {
      etiqueta: "Desde que se instaló",
      valor: fmtNum(totalTapsHistorico),
      detalle: tieneSoporteQr ? `${fmtNum(totalTapsNfc)} NFC · ${fmtNum(totalTapsQr)} QR (aprox.)` : "toques al cartel",
    },
    ...(porDia.length > 0
      ? [
          { etiqueta: `Últimos ${porDia.length} días`, valor: fmtNum(enPeriodo), detalle: "toques" },
          {
            etiqueta: "Promedio por día",
            valor: (enPeriodo / porDia.length).toLocaleString("es-AR", { maximumFractionDigits: 1 }),
            detalle: "toques",
          },
          { etiqueta: "Mejor día", valor: fmtNum(porDia[mejor]), detalle: labelsTaps[mejor] ?? "" },
        ]
      : []),
  ];

  return (
    <>
      <p className="mb-4 text-sm text-slate-600">Se actualiza solo, apenas alguien toca o escanea tu cartel.</p>
      <TiraMetricas
        etiqueta="Toques al cartel"
        className="mb-5"
        celdas={celdas.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor, detalle: c.detalle }))}
      />

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
