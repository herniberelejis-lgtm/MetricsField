import type { Metadata } from "next";
import Link from "next/link";
import { cargarEntradasLaboratorio } from "@/lib/db";
import { asegurarAdminPagina } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import {
  cruceGlobal,
  fmtCambio,
  fmtPuntos,
  laboratorioComercio,
  type BarraLab,
  type Cruce,
  type Unidad,
  type Veredicto,
} from "@/lib/laboratorio";

export const metadata: Metadata = { title: "Laboratorio" };
export const dynamic = "force-dynamic";

// Laboratorio de cruces: solo para el equipo. Sirve para ver con datos
// reales si las reseñas y el cartel se asocian a más vistas y más "cómo
// llegar" ANTES de mostrarle algo así a un cliente (lib/laboratorio.ts).

const VEREDICTOS: Record<Veredicto, { texto: string; clase: string }> = {
  fuerte: { texto: "Señal fuerte", clase: "bg-[#EAF7F0] text-[#0B5E40]" },
  debil: { texto: "Señal débil", clase: "bg-[#EEF4FB] text-[#1F4E80]" },
  sin_senal: { texto: "Sin relación clara", clase: "bg-slate-100 text-slate-700" },
  en_contra: { texto: "Al revés", clase: "bg-[#FFF4E8] text-[#8A3F00]" },
  pocos_datos: { texto: "Pocos datos", clase: "border border-[#E4E6EA] text-slate-600" },
};

const CORTOS: Record<Cruce["id"], string> = {
  semanas: "Semanas",
  anual: "Año vs. año",
  cartel: "Cartel",
  cadena: "Cadena",
  frescas: "Conversión",
  global: "Global",
};

function Insignia({ v }: { v: Veredicto }) {
  const { texto, clase } = VEREDICTOS[v];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>;
}

function fmtValor(v: number | null, unidad: Unidad): string {
  if (v === null) return "—";
  if (unidad === "cambio") return fmtCambio(v);
  if (unidad === "puntos") return fmtPuntos(v);
  return v.toLocaleString("es-AR", { maximumFractionDigits: unidad === "cada100" ? 1 : v < 10 ? 1 : 0 });
}

function Barras({ barras, unidad }: { barras: BarraLab[]; unidad: Unidad }) {
  const max = Math.max(0, ...barras.map((b) => Math.abs(b.valor ?? 0)));
  if (barras.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {barras.map((b) => {
        const p = b.valor === null || max === 0 ? 0 : (Math.abs(b.valor) / max) * 100;
        const conSigno = unidad === "cambio" || unidad === "puntos";
        // Lo que redondea a cero no es ni bueno ni malo.
        const cero = /^[−+]?0(%|,0)?$/.test(fmtValor(b.valor, unidad));
        const color = !conSigno ? "bg-[#7FA7D3]" : cero ? "bg-[#D3D9E2]" : (b.valor ?? 0) < 0 ? "bg-[#F4B886]" : "bg-[#8FD1AE]";
        return (
          <li key={b.etiqueta} className="grid grid-cols-[minmax(0,10.5rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="leading-tight text-slate-700">
              {b.etiqueta}
            </span>
            <span className="h-2.5 rounded-full bg-[#EEF0F3]">
              <span className={`block h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(p, b.valor ? 2 : 0)}%` }} />
            </span>
            <span className="whitespace-nowrap text-right tabular-nums text-slate-900">
              {fmtValor(b.valor, unidad)}
              {b.n !== null && <span className="ml-1 text-xs text-slate-600">({b.n})</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TarjetaCruce({ c }: { c: Cruce }) {
  const e = c.estadistica;
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-slate-900">{c.titulo}</h3>
        <Insignia v={c.veredicto} />
      </div>
      <p className="text-sm font-medium leading-relaxed text-slate-800">{c.lectura}</p>
      <Barras barras={c.barras} unidad={c.unidad} />
      {c.tabla && c.tabla.filas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-[#EEF0F3] text-left text-xs text-slate-600">
                {c.tabla.columnas.map((col, i) => (
                  <th key={col} className={`py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.tabla.filas.map((f) => (
                <tr key={f[0]} className="border-b border-[#EEF0F3] last:border-0">
                  {f.map((v, i) => (
                    <td key={i} className={`py-2 ${i > 0 ? "text-right" : ""} text-slate-800`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {e && (
          <span className="tabular-nums">
            r = {e.r.toLocaleString("es-AR", { maximumFractionDigits: 2 })} · {e.n} casos
            {Math.round(e.nEfectivo) < e.n && ` (≈ ${Math.round(e.nEfectivo)} independientes)`} · t ={" "}
            {e.t.toLocaleString("es-AR", { maximumFractionDigits: 1 })}
          </span>
        )}
        {c.unidad !== "cantidad" && c.barras.some((b) => b.n !== null) && (
          <span>Entre paréntesis, los casos de cada barra.</span>
        )}
      </div>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer select-none font-medium text-slate-700">Cómo lo calculamos</summary>
        <p className="mt-2 leading-relaxed">{c.comoLoCalculamos}</p>
      </details>
    </Card>
  );
}

export default async function LaboratorioPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await asegurarAdminPagina();
  const { c: elegidoParam } = await searchParams;
  const entradas = await cargarEntradasLaboratorio();
  const global = cruceGlobal(entradas);
  const labs = entradas
    .filter((e) => e.diarias.length > 0 || e.toques.length > 0)
    .map(laboratorioComercio)
    .sort((a, b) => b.diasConDatos - a.diasConDatos || a.nombre.localeCompare(b.nombre));
  const elegido = labs.find((l) => l.id === elegidoParam) ?? labs[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laboratorio"
        subtitle="Cruces de las reseñas y los toques al cartel con lo que Google informa de cada ficha. Solo para el equipo: para ver si la señal existe antes de mostrársela a un cliente."
      />

      <Card className="text-sm leading-relaxed text-slate-700">
        Todo esto es <strong>asociación, no causa</strong>: influyen la temporada, los feriados y la competencia. Cada
        cruce dice con cuántos casos se armó y, si no alcanzan, lo dice. Antes de llevar una frase al portal, que el
        cruce dé <Insignia v="fuerte" /> en varios comercios y que la lectura tenga sentido para alguien que conoce el
        local.
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-900">Todos los comercios juntos</h2>
        <TarjetaCruce c={global} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-900">Por comercio</h2>
        {labs.length === 0 ? (
          <Card className="text-sm text-slate-600">
            Todavía no hay comercios con datos de Google o toques al cartel.
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[#EEF0F3] text-left text-xs text-slate-600">
                  <th className="px-4 py-3 font-medium">Comercio</th>
                  <th className="px-3 py-3 text-right font-medium">Días de Google</th>
                  <th className="px-3 py-3 text-right font-medium">Reseñas</th>
                  <th className="px-3 py-3 text-right font-medium">Toques</th>
                  {labs[0].cruces.map((c) => (
                    <th key={c.id} className="px-2 py-3 font-medium">
                      {CORTOS[c.id]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labs.map((l) => (
                  <tr
                    key={l.id}
                    className={`border-b border-[#EEF0F3] last:border-0 ${l.id === elegido?.id ? "bg-[#F4F7FB]" : ""}`}
                  >
                    <td className="min-w-[11rem] px-4 py-2.5">
                      <Link
                        href={`/admin/laboratorio?c=${encodeURIComponent(l.id)}#detalle`}
                        className="font-medium text-[#1F4E80] hover:underline"
                        aria-current={l.id === elegido?.id ? "true" : undefined}
                      >
                        {l.nombre}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-800">{l.diasConDatos}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800">{l.resenasGoogle}</td>
                    <td className="px-3 py-2.5 text-right text-slate-800">{l.toques}</td>
                    {l.cruces.map((c) => (
                      <td key={c.id} className="px-2 py-2.5">
                        <Insignia v={c.veredicto} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {elegido && (
        <section id="detalle" className="flex scroll-mt-6 flex-col gap-3">
          <h2 className="text-base font-semibold text-slate-900">{elegido.nombre}</h2>
          <p className="text-sm text-slate-600">
            {elegido.diasConDatos} días de Google ({elegido.semanasCompletas} semanas completas) ·{" "}
            {elegido.resenasGoogle} reseñas de Google · {elegido.toques} toques al cartel
          </p>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {elegido.cruces.map((c) => (
              <TarjetaCruce key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
