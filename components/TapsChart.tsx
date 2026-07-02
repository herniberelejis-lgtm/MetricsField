"use client";

import ChartCard from "@/components/charts/ChartCard";
import LineChart from "@/components/charts/LineChart";
import { SERIES } from "@/lib/palette";
import { fmtNum } from "@/lib/format";

// Wrapper cliente: un Server Component no puede pasarle una función (como
// fmtNum) como prop a un Client Component — cruzar ese límite solo admite
// datos serializables. Este componente importa fmtNum él mismo.
export default function TapsChart({
  labels,
  values,
  tabla,
}: {
  labels: string[];
  values: number[];
  tabla: string[][];
}) {
  return (
    <ChartCard
      title="Taps por día"
      subtitle="Últimos 14 días · todos los links de este comercio"
      table={{ head: ["Día", "Taps"], rows: tabla }}
    >
      <LineChart labels={labels} values={values} color={SERIES[0]} format={fmtNum} />
    </ChartCard>
  );
}
