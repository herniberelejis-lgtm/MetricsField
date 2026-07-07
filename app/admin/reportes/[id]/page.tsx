import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import { metricaActual, metricaAnterior, citasIA } from "@/lib/types";
import { fmtNum, fmtMes, delta } from "@/lib/format";
import { recomendacionDelMes } from "@/lib/recomendacion";
import { Stars } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `Reporte · ${c.nombre}` : "Reporte" };
}

function deltaTexto(actual: number, anterior: number, invertir = false): string {
  const d = delta(actual, anterior);
  if (d.dir === "flat") return "sin cambios";
  const signo = d.valor >= 0 ? "+" : "";
  const bueno = invertir ? d.dir === "down" : d.dir === "up";
  return `${signo}${d.valor} ${bueno ? "▲" : "▼"}`;
}

export default async function ReporteClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCliente(id);
  if (!c) notFound();

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  if (!m) notFound();

  const esPremium = c.plan === "Premium";
  const recomendacion = recomendacionDelMes(c, m, prev);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/admin/reportes" className="text-sm text-slate-500 hover:text-brand-fg">
          ← Reportes
        </Link>
        <span className="text-xs text-slate-400">
          Usá “Imprimir / Guardar como PDF” del navegador
        </span>
      </div>

      {/* Hoja del reporte */}
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-fg">
              Reporte mensual · {fmtMes(m.mes)}
            </div>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              {c.nombre}
            </h1>
            <div className="text-sm text-slate-500">
              {c.rubro} · {c.zona}
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Taply</div>
            <div>Córdoba</div>
          </div>
        </header>

        {/* 3 métricas clave */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          <Metrica
            label="Reseñas nuevas"
            valor={fmtNum(m.resenasNuevas)}
            sub={`total ${m.resenasTotal}`}
            cambio={prev ? deltaTexto(m.resenasNuevas, prev.resenasNuevas) : undefined}
          />
          <Metrica
            label="Visitas al perfil"
            valor={fmtNum(m.visitasPerfil)}
            sub="Google Business Profile"
            cambio={prev ? deltaTexto(m.visitasPerfil, prev.visitasPerfil) : undefined}
          />
          {esPremium ? (
            <Metrica
              label="Citaciones en IA"
              valor={fmtNum(citasIA(m))}
              sub="ChatGPT · Copilot · Perplexity"
              cambio={prev ? deltaTexto(citasIA(m), citasIA(prev)) : undefined}
            />
          ) : (
            <Metrica
              label="Contactos generados"
              valor={fmtNum(m.llamadas + m.clicsComoLlegar)}
              sub={`${m.llamadas} llamadas · ${m.clicsComoLlegar} “cómo llegar”`}
              cambio={
                prev
                  ? deltaTexto(
                      m.llamadas + m.clicsComoLlegar,
                      prev.llamadas + prev.clicsComoLlegar,
                    )
                  : undefined
              }
            />
          )}
        </section>

        {/* Reputación */}
        <section className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Reputación en Google</span>
          <Stars rating={m.ratingPromedio} />
        </section>

        {/* Detalle Premium */}
        {esPremium && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Tu negocio en la IA este mes
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>· ChatGPT te recomendó {fmtNum(m.citasChatGPT ?? 0)} veces</li>
              <li>· Copilot te recomendó {fmtNum(m.citasCopilot ?? 0)} veces</li>
              <li>· Perplexity te citó {fmtNum(m.citasPerplexity ?? 0)} veces</li>
            </ul>
          </section>
        )}

        {/* Recomendación */}
        <section className="mt-6 rounded-lg border border-brand/20 bg-brand/5 p-4">
          <h2 className="text-sm font-semibold text-brand-fg">
            Recomendación para el mes que viene
          </h2>
          <p className="mt-1 text-sm text-slate-700">{recomendacion}</p>
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Reporte generado automáticamente · métricas de Google Business
          Profile, Search Console{esPremium ? " y Bing Webmaster Tools (AI Performance)" : ""}.
        </footer>
      </div>
    </div>
  );
}

function Metrica({
  label,
  valor,
  sub,
  cambio,
}: {
  label: string;
  valor: string;
  sub: string;
  cambio?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{valor}</div>
      {cambio && <div className="text-xs text-slate-500">{cambio}</div>}
      <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{sub}</div>
    </div>
  );
}
