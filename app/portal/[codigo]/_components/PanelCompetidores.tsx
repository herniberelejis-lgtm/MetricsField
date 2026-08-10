import type { BenchmarkMes } from "@/lib/types";
import BenchmarkCompetencia, { type CrecimientoVsCompetencia } from "@/components/BenchmarkCompetencia";

// Panel "Competidores": cómo está parado el local frente a la competencia
// de su zona, mes a mes — se actualiza solo, todos los días.
export default function PanelCompetidores({
  benchmark,
  crecimientoVsCompetencia,
}: {
  benchmark: BenchmarkMes[];
  crecimientoVsCompetencia: CrecimientoVsCompetencia | null;
}) {
  return (
    <>
      <p className="mb-4 text-sm text-slate-500">
        Cómo estás parado frente a los locales de tu zona — se actualiza solo, todos los días.
      </p>
      <BenchmarkCompetencia meses={benchmark} crecimiento={crecimientoVsCompetencia} />
    </>
  );
}
