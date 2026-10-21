import type { ReactNode } from "react";
import type { Conclusion, Conclusiones } from "@/lib/conclusiones";
import {
  miles,
  RANGOS,
  type ColorSegmento,
  type Delta,
  type Rango,
  type Tablero as DatosTablero,
  type Torta,
} from "@/lib/tablero";
import GraficoMetricas from "./GraficoMetricas";

// El Resumen del portal como tablero (estilo Google Analytics): métricas del
// período con su gráfico, las conclusiones al costado, tortas, mapa de calor
// del cartel, lo que dicen los clientes, el equipo, las reseñas, la
// competencia, las búsquedas y las piezas. Cada bloque aparece solo si hay
// datos para llenarlo (lib/tablero.ts); si no, dice qué falta.

/** Mapa de la zona: imagen de Google Maps Static API (lib/mapa.ts). */
export interface MapaZona {
  url: string;
  marcadores: { etiqueta: string | null; nombre: string; propio: boolean }[];
}

function Mapa({ mapa }: { mapa: MapaZona }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapa.url}
        alt={`Mapa de tu zona: vos y ${mapa.marcadores.length - 1} competidor${mapa.marcadores.length === 2 ? "" : "es"}`}
        width={640}
        height={320}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block aspect-[2/1] h-auto w-full rounded-xl bg-[#EEF1F4] object-cover"
      />
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-700">
        {mapa.marcadores.map((m) => (
          <span key={`${m.etiqueta}-${m.nombre}`} className="flex items-center gap-1.5">
            <span
              className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-slate-800 ${m.propio ? "bg-[#B7A6E6]" : "bg-[#7FA7D3]"}`}
              aria-hidden="true"
            >
              {m.propio ? "•" : (m.etiqueta ?? "·")}
            </span>
            {m.nombre}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

const TARJETA = "min-w-0 rounded-2xl border border-[#E4E6EA] bg-white";

const COLOR: Record<ColorSegmento, string> = {
  fuerte: "#7FA7D3",
  medio: "#A9C5E6",
  suave: "#D9E6F4",
  negro: "#B7A6E6",
  gris: "#D3D9E2",
  verde: "#8FD1AE",
  naranja: "#F4B886",
};

const NIVEL = ["#F3F6FA", "#DCE7F3", "#C3D6EC", "#A7C3E2", "#8AAFD6"];

const TEMA_CONCLUSION: Record<string, string> = {
  cartel: "Cartel",
  piezas: "Cartel",
  efecto: "Cartel",
  equipo: "Equipo",
  temas: "Reseñas",
  alerta: "Reseñas",
  zona: "Competencia",
  dias: "Horarios",
  busquedas: "Búsquedas",
};

function Encabezado({ titulo, sub, extra }: { titulo: string; sub?: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-bold text-slate-900">{titulo}</h3>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      {extra}
    </div>
  );
}

function Nota({ children, tono = "info" }: { children: ReactNode; tono?: "info" | "alerta" }) {
  return (
    <p
      className={`rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-700 ${tono === "alerta" ? "bg-[#FFF4E5]" : "bg-[#F4F7FB]"}`}
    >
      {children}
    </p>
  );
}

function Barra({ proporcion, color }: { proporcion: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F3]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(2, Math.round(proporcion * 100))}%`, background: color }}
      />
    </div>
  );
}

function Pastilla({ children, tono }: { children: ReactNode; tono: "bien" | "mal" | "neutro" }) {
  const c =
    tono === "bien"
      ? "bg-[#E8F5EF] text-[#0B5E40]"
      : tono === "mal"
        ? "bg-[#FFF4E5] text-[#8A3F00]"
        : "bg-[#F1F1EE] text-slate-700";
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${c}`}>{children}</span>;
}

// ---------- conclusiones (panel lateral) ----------

function MiniGrafico({ c }: { c: Conclusion }) {
  const barras = c.barras.slice(0, 8);
  if (!barras.length) return null;
  return (
    <div className="flex h-7 items-end gap-[3px]" aria-hidden="true">
      {barras.map((b, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[3px]"
          style={{
            height: `${Math.max(10, Math.round(b.proporcion * 100))}%`,
            background: b.tono === "mal" ? "#F4B886" : b.tono === "bien" ? "#7FA7D3" : "#D9E6F4",
          }}
        />
      ))}
    </div>
  );
}

function PanelConclusiones({ datos }: { datos: Conclusiones | null }) {
  const lista = datos
    ? [...datos.cuesta.map((c) => ({ c, bien: false })), ...datos.funciona.map((c) => ({ c, bien: true }))]
    : [];
  const enCamino = datos?.pendientes.filter((p) => p.tipo === "en_camino") ?? [];
  return (
    <section aria-label="Conclusiones" className={`${TARJETA} flex flex-col gap-4 p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-extrabold text-slate-900">Conclusiones</h3>
          <p className="text-xs leading-snug text-slate-500">
            Lo que Google no te muestra: cruces de tu cartel, tus reseñas, tus horarios y tu competencia
          </p>
        </div>
        {lista.length > 0 && (
          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">{lista.length}</span>
        )}
      </div>

      {lista.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.slice(0, 6).map(({ c, bien }) => (
            <article key={c.id} className="flex flex-col gap-2 rounded-xl border border-[#ECEEF1] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-[#E8EFF6] px-2 py-0.5 text-[11px] font-bold text-[#123A63]">
                  {TEMA_CONCLUSION[c.id] ?? "Análisis"}
                </span>
                <span className={`text-[11px] font-semibold ${bien ? "text-[#0B5E40]" : "text-[#8A3F00]"}`}>
                  {bien ? "Va bien" : "Para mejorar"}
                </span>
              </div>
              <p className="text-[13.5px] font-bold leading-snug text-slate-900">{c.titulo}</p>
              <MiniGrafico c={c} />
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">{c.cruce}</span>
                <a href="#conclusiones" className="shrink-0 font-semibold text-[#1F4E80] hover:underline">
                  Ver más
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {lista.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-700">
            Todavía ninguna tiene datos suficientes para ser cierta. Aparecen solas apenas los tengan:
          </p>
          {enCamino.slice(0, 4).map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-slate-800">{p.titulo}</span>
              {p.progreso !== null && <Barra proporcion={p.progreso} color="#A9C5E6" />}
            </div>
          ))}
        </div>
      )}

      <a href="#conclusiones" className="pt-0.5 text-[13px] font-bold text-[#1F4E80] hover:underline">
        {lista.length > 6 ? `Ver las ${lista.length} conclusiones y cómo se calculan →` : "Ver el detalle y cómo se calculan →"}
      </a>
    </section>
  );
}

// ---------- tortas ----------

function TortaCard({ t }: { t: Torta }) {
  let acumulado = 0;
  return (
    <section className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
      <Encabezado titulo={t.titulo} sub={t.sub} />
      <div className="flex items-center gap-4">
        <svg
          width="112"
          height="112"
          viewBox="0 0 42 42"
          role="img"
          aria-label={`${t.titulo}: ${t.segmentos.map((s) => `${s.label} ${s.pct}%`).join(", ")}`}
          className="shrink-0"
        >
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#EEF0F3" strokeWidth="6" />
          {t.segmentos.map((s) => {
            const offset = 25 - acumulado;
            acumulado += s.pct;
            return s.pct > 0 ? (
              <circle
                key={s.label}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={COLOR[s.color]}
                strokeWidth="6"
                strokeDasharray={`${s.pct} ${100 - s.pct}`}
                strokeDashoffset={offset}
              />
            ) : null;
          })}
          <text x="21" y="21" textAnchor="middle" fontSize="7" fontWeight="800" fill="#1A1A1A">
            {t.total}
          </text>
          <text x="21" y="27" textAnchor="middle" fontSize="3.4" fill="#5B6170">
            {t.totalLabel}
          </text>
        </svg>
        <ul className="flex min-w-0 flex-1 flex-col gap-2.5 text-[12.5px]">
          {t.segmentos.map((s) => (
            <li key={s.label} className="flex flex-col">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: COLOR[s.color] }} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="pl-4">
                <strong className="text-[15px] text-slate-900">{s.pct}%</strong>{" "}
                <span className="text-slate-500">· {miles(s.valor)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Nota>{t.nota}</Nota>
    </section>
  );
}

// ---------- tus locales (vista "Todos") ----------

/** Adelanto de un local en el combinado: sus números clave y su conclusión
 * principal, con el link a su tablero completo. */
export interface ResumenLocal {
  id: string;
  nombre: string;
  href: string;
  calificacion: string | null;
  totalResenas: number | null;
  metricas: { label: string; valor: string | null; delta: Delta | null }[];
  /** 0 a 1: su parte de los toques de todos los locales en el período. */
  parteToques: number | null;
  conclusion: { titulo: string; bien: boolean } | null;
  enCamino: number;
}

function DeltaTexto({ d }: { d: Delta | null }) {
  if (!d) return null;
  const c = d.tono === "sube" ? "text-[#0B5E40]" : d.tono === "baja" ? "text-[#8A3F00]" : "text-slate-600";
  return (
    <span className={`text-[11px] font-bold ${c}`}>
      {d.tono === "sube" ? "▲" : d.tono === "baja" ? "▼" : "="} {d.texto}
    </span>
  );
}

function TusLocales({ locales, dias }: { locales: ResumenLocal[]; dias: number }) {
  return (
    <section aria-label="Tus locales" className={`${TARJETA} flex flex-col gap-4 p-5`}>
      <Encabezado
        titulo="Tus locales"
        sub={`Un adelanto de cada uno en los últimos ${dias} días. Tocá un local para ver su tablero completo.`}
      />
      <div className={`grid grid-cols-1 gap-3.5 sm:grid-cols-2 ${locales.length >= 3 ? "2xl:grid-cols-3" : ""}`}>
        {locales.map((l) => (
          <a
            key={l.id}
            href={l.href}
            className="group flex flex-col gap-3.5 rounded-xl border border-[#ECEEF1] bg-white p-4 transition hover:border-[#A9C5E6] hover:bg-[#F8FAFD]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold leading-snug text-slate-900">{l.nombre}</span>
              <span className="text-xs text-slate-500">
                {l.calificacion ?? "Sin calificación"}
                {l.totalResenas !== null ? ` · ${miles(l.totalResenas)} reseñas` : ""}
              </span>
              <span className="pt-0.5 text-xs font-semibold text-[#1F4E80] group-hover:underline">Ver su tablero →</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {l.metricas.map((m) => (
                <div key={m.label} className="flex flex-col">
                  <span className="text-[11px] text-slate-500">{m.label}</span>
                  <span className="flex items-baseline gap-1.5">
                    <strong className="text-lg text-slate-900">{m.valor ?? "—"}</strong>
                    <DeltaTexto d={m.delta} />
                  </span>
                </div>
              ))}
            </div>
            {l.parteToques !== null && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">
                  {Math.round(l.parteToques * 100)}% de los toques de todos tus locales
                </span>
                <Barra proporcion={l.parteToques} color="#A9C5E6" />
              </div>
            )}
            {l.conclusion ? (
              <p
                className={`rounded-lg px-3 py-2 text-[12.5px] leading-snug text-slate-800 ${l.conclusion.bien ? "bg-[#EAF7F0]" : "bg-[#FFF4E8]"}`}
              >
                <span className={`mr-1 font-bold ${l.conclusion.bien ? "text-[#0B5E40]" : "text-[#8A3F00]"}`}>
                  {l.conclusion.bien ? "Va bien:" : "Para mejorar:"}
                </span>
                {l.conclusion.titulo}
              </p>
            ) : (
              <p className="rounded-lg bg-[#F4F7FB] px-3 py-2 text-[12.5px] text-slate-600">
                {l.enCamino > 0
                  ? `${l.enCamino} conclusiones en camino: aparecen solas cuando tengan datos.`
                  : "Sin conclusiones todavía."}
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

// ---------- tablero ----------

export default function Tablero({
  datos,
  conclusiones,
  hrefRango,
  totalResenas,
  mapa = null,
  locales = null,
}: {
  datos: DatosTablero;
  conclusiones: Conclusiones | null;
  hrefRango: Record<Rango, string>;
  totalResenas: number | null;
  mapa?: MapaZona | null;
  /** Vista "Todos": el adelanto de cada local. Sin competencia ni
   * conclusiones (son de cada local). */
  locales?: ResumenLocal[] | null;
}) {
  const calificacion = datos.kpis.find((k) => k.id === "calificacion");
  const { loQueDicen, calor, equipo, competencia } = datos;

  return (
    <div className="flex flex-col gap-5">
      {/* Período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Últimos {datos.dias} días</span> · {datos.periodo} · contra los{" "}
          {datos.dias} anteriores
        </p>
        <nav aria-label="Período" className="flex rounded-xl border border-[#D6D9DE] bg-white p-1">
          {RANGOS.map((r) => (
            <a
              key={r}
              href={hrefRango[r]}
              aria-current={r === datos.dias ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${r === datos.dias ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {r} días
            </a>
          ))}
        </nav>
      </div>

      <GraficoMetricas kpis={datos.kpis} dias={datos.dias} />

      {locales && <TusLocales locales={locales} dias={datos.dias} />}

      {/* La zona y el cartel, bien arriba: lo que el dueño mira primero. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {!locales && (
          <section className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
            <Encabezado
              titulo="Tu competencia"
              sub={
                competencia
                  ? `Reseñas nuevas ${competencia.enCurso ? "de este mes (en curso)" : "del último mes cerrado"} en tu zona, y quién se lleva cada parte`
                  : undefined
              }
              extra={
                <a href="#competidores" className="text-xs font-semibold text-[#1F4E80] hover:underline">
                  {competencia ? "Ver competidores →" : "Sumar competidores →"}
                </a>
              }
            />
            {mapa && <Mapa mapa={mapa} />}
            {competencia ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px] border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th scope="col" className="px-1.5 py-2 font-semibold">
                          Comercio
                        </th>
                        <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                          Calif.
                        </th>
                        <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                          Nuevas
                        </th>
                        <th scope="col" className="w-[30%] px-1.5 py-2 font-semibold">
                          Parte
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {competencia.filas.map((f, i) => (
                        <tr key={`${f.nombre}-${i}`} className={`border-t border-[#EEF0F3] ${f.esPropio ? "bg-[#F4F7FB]" : ""}`}>
                          <td className="px-1.5 py-2.5 font-semibold text-slate-900">
                            {f.esPropio && f.nombre.toLowerCase() !== "vos" ? `${f.nombre} (vos)` : f.nombre}
                          </td>
                          <td className="px-1.5 py-2.5 text-right">
                            {f.rating !== null ? `${f.rating.toFixed(1).replace(".", ",")} ★` : "—"}
                          </td>
                          <td className="px-1.5 py-2.5 text-right font-bold">{f.nuevas}</td>
                          <td className="px-1.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Barra
                                  proporcion={f.parte / Math.max(1, competencia.filas[0].parte)}
                                  color={f.esPropio ? "#7FA7D3" : "#D3D9E2"}
                                />
                              </div>
                              <span className="w-9 text-right text-xs font-semibold">{f.parte}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {competencia.lectura && <Nota>{competencia.lectura}</Nota>}
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Sumá a tus competidores en la pestaña Competidores: al cerrar el primer mes vas a ver cuántas reseñas nuevas se
                lleva cada uno.
              </p>
            )}
          </section>
        )}
        <div className={locales ? "grid min-w-0 grid-cols-1 gap-5 lg:col-span-2 lg:grid-cols-2" : "flex min-w-0 flex-col gap-5"}>
          <section className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
            <Encabezado titulo="Horarios del cartel" sub="Toques por día y hora, últimas 8 semanas" />
            {calor ? (
              <>
                <div className="overflow-x-auto">
                  <div
                    className="flex min-w-[300px] flex-col gap-[3px]"
                    role="img"
                    aria-label={calor.lectura ?? "Mapa de calor de toques al cartel por día y hora"}
                  >
                    {calor.filas.map((f) => (
                      <div key={f.dia} className="flex items-center gap-[3px]">
                        <span className="w-8 shrink-0 text-[11px] text-slate-500">{f.dia}</span>
                        {f.celdas.map((c) => (
                          <span
                            key={c.hora}
                            title={`${f.dia} ${c.hora} h: ${c.toques} toque${c.toques === 1 ? "" : "s"}`}
                            className="h-6 flex-1 rounded-[3px]"
                            style={{ background: NIVEL[c.nivel] }}
                          />
                        ))}
                      </div>
                    ))}
                    <div className="flex gap-[3px] pl-[35px] text-[10px] text-slate-500">
                      {calor.horas.map((h) => (
                        <span key={h} className="flex-1 text-center">
                          {h % 4 === 0 ? `${h}h` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    Menos
                    {NIVEL.map((c) => (
                      <span key={c} className="h-2.5 w-3.5 rounded-sm" style={{ background: c }} />
                    ))}
                    Más
                  </div>
                  <span className="text-[11px] text-slate-500">{miles(calor.total)} toques</span>
                </div>
                {calor.lectura && <Nota>{calor.lectura}</Nota>}
              </>
            ) : (
              <p className="text-sm text-slate-600">Aparece con 10 toques al cartel en las últimas 8 semanas.</p>
            )}
          </section>
          <section className={`${TARJETA} flex flex-col gap-4 p-5`}>
            <Encabezado
              titulo="Qué hacen cuando te encuentran"
              sub={`Acciones en tu ficha de Google, últimos ${datos.dias} días`}
            />
            {datos.acciones.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {datos.acciones.map((a) => (
                    <div key={a.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-slate-800">{a.label}</span>
                        <span>
                          <strong>{miles(a.valor)}</strong>{" "}
                          {a.delta && (
                            <span
                              className={`text-[11px] font-bold ${a.delta.tono === "sube" ? "text-[#0B5E40]" : a.delta.tono === "baja" ? "text-[#8A3F00]" : "text-slate-600"}`}
                            >
                              {a.delta.tono === "sube" ? "▲" : a.delta.tono === "baja" ? "▼" : "="} {a.delta.texto}
                            </span>
                          )}
                        </span>
                      </div>
                      <Barra proporcion={a.proporcion} color="#7FA7D3" />
                    </div>
                  ))}
                </div>
                {datos.conversion && <p className="text-[12.5px] text-slate-700">{datos.conversion}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Llega cuando conectes tu Google: llamadas, pedidos de cómo llegar, clics a tu web y mensajes.
              </p>
            )}
          </section>
        </div>
      </div>

      <section aria-label="Lo que dicen tus clientes" className={`${TARJETA} flex flex-col gap-4 p-5 sm:px-6`}>
        <Encabezado
          titulo="Lo que dicen tus clientes"
          sub={
            loQueDicen
              ? `Temas de tus ${miles(loQueDicen.conTexto)} reseñas con texto, y el promedio de las reseñas que los nombran`
              : undefined
          }
          extra={
            <a href="#resenas" className="text-xs font-semibold text-[#1F4E80] hover:underline">
              Leer las reseñas →
            </a>
          }
        />
        {loQueDicen ? (
          <div className="grid gap-6 md:grid-cols-2">
            {(
              [
                ["Lo que más destacan", loQueDicen.destacan, true],
                ["Quejas frecuentes", loQueDicen.quejas, false],
              ] as const
            ).map(([titulo, temas, bien]) => (
              <div key={titulo} className="flex min-w-0 flex-col gap-3">
                <span className={`flex items-center gap-2 text-[13px] font-bold ${bien ? "text-[#0B5E40]" : "text-[#8A3F00]"}`}>
                  <span
                    className={`flex h-[26px] w-[26px] items-center justify-center rounded-full ${bien ? "bg-[#E8F5EF]" : "bg-[#FFF4E5]"}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d={
                          bien
                            ? "M7 10v11M3 11h4v10H3zM7 11l4-8a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7"
                            : "M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
                        }
                      />
                    </svg>
                  </span>
                  {titulo}
                </span>
                {temas.length === 0 && (
                  <p className="text-[13px] text-slate-500">
                    {bien ? "Todavía ningún tema se repite en las reseñas buenas." : "Ninguna queja se repite: buena señal."}
                  </p>
                )}
                {temas.map((t) => (
                  <div key={t.id} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-slate-900">{t.tema}</span>
                      <span className="text-slate-700">
                        {t.n} reseñas · <strong>{t.promedio} ★</strong>
                      </span>
                    </div>
                    <Barra proporcion={t.proporcion} color={bien ? "#8FD1AE" : "#F4B886"} />
                    {t.cita && <span className="text-xs italic text-slate-500">“{t.cita}”</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Aparece cuando haya al menos 5 reseñas con texto sincronizadas desde tu Google.
          </p>
        )}
      </section>

      {datos.tortas.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {datos.tortas.map((t) => (
            <TortaCard key={t.id} t={t} />
          ))}
        </div>
      )}

      {!locales && <PanelConclusiones datos={conclusiones} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className={`${TARJETA} flex flex-col gap-4 p-5`}>
          <Encabezado
            titulo="Reseñas"
            sub="Reseñas nuevas por mes"
            extra={
              <a href="#resenas" className="text-xs font-semibold text-[#1F4E80] hover:underline">
                Ver y responder →
              </a>
            }
          />
          <div className="flex flex-wrap gap-6">
            {calificacion?.valor && (
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{calificacion.valor}</span>
                {totalResenas !== null && <span className="text-xs text-slate-500">{miles(totalResenas)} reseñas en Google</span>}
              </div>
            )}
            {datos.respondidas && (
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{datos.respondidas.pct}%</span>
                <span className="text-xs text-slate-500">respondidas</span>
              </div>
            )}
          </div>
          {datos.meses.length > 0 && (
            <>
              <div
                className="flex h-32 items-end gap-2.5 border-b border-[#D6D9DE] pt-2"
                role="img"
                aria-label={`Reseñas nuevas por mes: ${datos.meses.map((m) => `${m.etiqueta} ${m.n ?? "sin dato"}`).join(", ")}`}
              >
                {(() => {
                  const max = Math.max(1, ...datos.meses.map((m) => m.n ?? 0));
                  return datos.meses.map((m) => (
                    <div key={m.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[11px] font-bold text-slate-900">{m.n ?? "—"}</span>
                      <div
                        className="w-full max-w-[44px] rounded-t-md"
                        style={{
                          height: `${Math.round(((m.n ?? 0) / max) * 85)}%`,
                          background: m.conCartel ? "#7FA7D3" : "#D9E6F4",
                          opacity: m.enCurso ? 0.6 : 1,
                        }}
                      />
                    </div>
                  ));
                })()}
              </div>
              <div className="-mt-2 flex gap-2.5 text-[11px] text-slate-500">
                {datos.meses.map((m) => (
                  <span key={m.mes} className="flex-1 text-center">
                    {m.etiqueta}
                    {m.enCurso ? "*" : ""}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {datos.meses.some((m) => m.conCartel) && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-[#7FA7D3]" />
                    con el cartel
                  </span>
                )}
                {datos.meses.some((m) => !m.conCartel) && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-[#D9E6F4]" />
                    antes del cartel
                  </span>
                )}
                {datos.meses.some((m) => m.enCurso) && <span>* mes en curso</span>}
              </div>
            </>
          )}
          {datos.estrellas && (
            <div className="flex flex-col gap-1.5">
              {datos.estrellas.filas.map((f) => (
                <div key={f.estrellas} className="flex items-center gap-2.5 text-xs">
                  <span className="w-6 text-slate-700">{f.estrellas}★</span>
                  <div className="flex-1">
                    <Barra proporcion={f.pct / 100} color={f.estrellas >= 4 ? "#7FA7D3" : "#F4B886"} />
                  </div>
                  <span className="w-9 text-right text-slate-500">{f.pct}%</span>
                </div>
              ))}
              <span className="text-[11px] text-slate-500">Sobre las {miles(datos.estrellas.total)} reseñas sincronizadas.</span>
            </div>
          )}
        </section>
        <div className="flex min-w-0 flex-col gap-5">
          <section className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
            <Encabezado
              titulo="Qué buscan para encontrarte"
              sub="Búsquedas en Google de los últimos 3 meses, y si tus reseñas lo nombran"
            />
            {datos.busquedas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[340px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-1.5 py-2 font-semibold">
                        Búsqueda
                      </th>
                      <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                        Veces
                      </th>
                      <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                        En reseñas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.busquedas.map((b) => (
                      <tr key={b.palabra} className="border-t border-[#EEF0F3]">
                        <td className="px-1.5 py-2.5 font-semibold text-slate-900">{b.palabra}</td>
                        <td className="px-1.5 py-2.5 text-right">{miles(b.veces)}</td>
                        <td className="px-1.5 py-2.5 text-right">
                          {b.menciones === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <Pastilla tono={b.menciones >= 5 ? "bien" : b.menciones <= 1 ? "mal" : "neutro"}>
                              {b.menciones === 0 ? "ninguna" : `${b.menciones} reseña${b.menciones === 1 ? "" : "s"}`}
                            </Pastilla>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Llega con tu Google conectado: Google informa las búsquedas del mes cerrado.
              </p>
            )}
          </section>
          <section className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
            <Encabezado
              titulo="Tu cartel, pieza por pieza"
              sub={`Toques de los últimos ${datos.dias} días y reseñas que llegaron hasta 30 minutos después`}
              extra={
                <a href="#dispositivos" className="text-xs font-semibold text-[#1F4E80] hover:underline">
                  Dispositivos →
                </a>
              }
            />
            {datos.piezas.length > 0 ? (
              <>
                {datos.piezas[0].resenas === null && (
                  <p className="text-[12.5px] text-slate-600">
                    Las reseñas de cada pieza aparecen cuando se sincronicen tus reseñas de Google.
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[340px] border-collapse text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th scope="col" className="px-1.5 py-2 font-semibold">
                          Pieza
                        </th>
                        <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                          Toques
                        </th>
                        <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                          Reseñas
                        </th>
                        <th scope="col" className="px-1.5 py-2 text-right font-semibold">
                          Rinde
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.piezas.map((p) => (
                        <tr key={p.pieza} className="border-t border-[#EEF0F3]">
                          <td className="px-1.5 py-2.5 font-semibold text-slate-900">{p.pieza}</td>
                          <td className="px-1.5 py-2.5 text-right">{miles(p.toques)}</td>
                          <td className="px-1.5 py-2.5 text-right">{p.resenas ?? <span className="text-slate-400">—</span>}</td>
                          <td className="px-1.5 py-2.5 text-right">
                            {p.resenas === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <Pastilla tono={p.tono}>{p.rinde}</Pastilla>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Sin toques en este período.</p>
            )}
          </section>
        </div>
      </div>

      {equipo.length > 0 && (
        <section aria-label="Tu equipo" className={`${TARJETA} flex flex-col gap-4 p-5`}>
          <Encabezado
            titulo="Tu equipo"
            sub="A quién nombran los clientes en sus reseñas, y cuántas llegaron por su tarjeta en los últimos 90 días"
          />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {equipo.map((p) => (
              <article
                key={p.nombre}
                className={`flex flex-col gap-3.5 rounded-xl border p-4 ${p.destacado ? "border-[#7FA7D3] bg-[#F4F7FB]" : "border-[#ECEEF1] bg-white"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-slate-800 ${
                      p.tono === "mal" ? "bg-[#F4B886]" : p.destacado ? "bg-[#A9C5E6]" : "bg-[#D9E6F4]"
                    }`}
                    aria-hidden="true"
                  >
                    {p.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-slate-900">{p.nombre}</span>
                    {p.etiqueta && (
                      <span
                        className={`text-[11px] font-bold ${p.tono === "mal" ? "text-[#8A3F00]" : p.tono === "bien" ? "text-[#0B5E40]" : "text-slate-500"}`}
                      >
                        {p.etiqueta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      [String(p.nombrado), "reseñas lo nombran"],
                      [p.promedio ? `${p.promedio} ★` : "—", "promedio de esas reseñas"],
                      [String(p.porTarjeta), `por su tarjeta (${p.toques} toques)`],
                    ] as const
                  ).map(([v, l]) => (
                    <div key={l} className="flex flex-col gap-0.5">
                      <strong className="whitespace-nowrap text-lg text-slate-900">{v}</strong>
                      <span className="text-[10.5px] leading-tight text-slate-500">{l}</span>
                    </div>
                  ))}
                </div>
                {p.temas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-slate-500">Lo que dicen de {p.nombre.split(/\s+/)[0]}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.temas.map((t) => (
                        <span
                          key={t.label}
                          className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${t.bien ? "bg-[#E8F5EF] text-[#0B5E40]" : "bg-[#FFF4E5] text-[#8A3F00]"}`}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          <p className="text-[11.5px] text-slate-500">
            "Lo nombran" busca el nombre en el texto de cada reseña: si un cliente se llama igual, puede sumar de más.
          </p>
        </section>
      )}

      <p className="text-[11.5px] leading-relaxed text-slate-500">
        Ninguna conclusión con menos de 5 casos. Lo atribuido al cartel es aproximado: decimos "desde que", nunca "gracias a".
        Visitas, búsquedas y acciones vienen de Google Business Profile, que las publica con 2 o 3 días de demora.
      </p>
    </div>
  );
}
