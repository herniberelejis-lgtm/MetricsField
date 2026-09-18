import type { Cliente } from "@/lib/types";
import type { TerminoFrecuente } from "@/lib/keywords";
import type { TapsPorHoraDia, TopPiezaSemana } from "@/lib/db";
import { fmtNum } from "@/lib/format";
import { IconWave, SectionHeading } from "@/components/ui";
import {
  StatChip,
  CalificacionGoogleCard,
  IconStarChip,
  IconCrecimiento,
  IconEyeChip,
  IconPhoneChip,
  IconDirectionsChip,
} from "@/components/portal/PortalResumen";
import { IconSearch } from "@/components/portal/PortalShell";
import SugerenciasRepetidas from "@/components/portal/SugerenciasRepetidas";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";
import TapsPorHoraSemanaChart from "@/components/TapsPorHoraSemanaChart";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import { heroDeCalificacion, hrefSucursal, hrefTodos } from "../_lib";
import SelectorSucursales from "./SelectorSucursales";

// Panel "Resumen": de un vistazo, para abrir el portal y entender el estado
// del negocio sin tener que entrar a ninguna otra sección todavía.
//
// El orden de las secciones no es casual — y no arranca con la calificación.
// Tu rating ya lo podés ver abriendo Google Maps vos mismo; no hace falta
// MetricsField para eso. Lo primero acá tiene que ser lo que SOLO nosotros
// te damos: qué se queja la gente y cuánto de eso es grave — inteligencia
// que no existe en ningún lado de Google. Recién después viene la
// calificación (tier 2), el alcance real en Google (tier 3, depende de que
// el cliente conecte su cuenta) y por último la actividad cruda del cartel
// (tier 4 — un tap solo no dice nada sin el contexto de arriba). "Necesita
// tu atención" se sacó de acá: ahora vive en la barra lateral (PortalShell),
// visible en cualquier pestaña, no compitiendo con esta información.
export default function PanelResumen({
  mensajeGoogle,
  modoTodos,
  totalTapsHistorico,
  resenasHoy,
  resenasNuevasMes,
  resenasTotales,
  resenasNegativas,
  horasSemana,
  piezaMasUsada,
  posicionCompetencia,
  visitasPerfil,
  llamadas,
  comoLlegar,
  conexionGoogle,
  ubicaciones,
  activoId,
  activoNombre,
  codigoAcceso,
  diasConTaps,
  labelsTaps,
  nfcPorDia,
  qrPorDia,
  tieneSoporteQr,
  temasRecurrentes,
}: {
  mensajeGoogle: { texto: string; tono: "ok" | "error" } | null;
  /** true = viendo el combinado de todos los locales (default con >1 local); false = un local puntual elegido. */
  modoTodos: boolean;
  totalTapsHistorico: number;
  resenasHoy: number;
  resenasNuevasMes: number;
  resenasTotales: number;
  /** Reseñas de 3★ o menos — la métrica que dispara la sección de arriba. */
  resenasNegativas: number;
  /** Grilla día×hora de taps de los últimos 7 días — heatmap de "a qué hora te tocan el cartel". */
  horasSemana: TapsPorHoraDia[];
  /** El dispositivo con más taps de la semana — null si no hubo actividad. `local`
   * solo viene cargado en modo combinado, para desambiguar si dos locales usan
   * la misma etiqueta (ej. "Mostrador" en ambos). */
  piezaMasUsada: (TopPiezaSemana & { local?: string }) | null;
  /** null si no aplica: en modo combinado, sin rating, o sin competidores cargados con rating. */
  posicionCompetencia: { puesto: number; total: number } | null;
  /** Business Profile Performance API — visitas/llamadas/cómo llegar del mes
   * en curso, de la cuenta de Google que el propio cliente conectó (suma de
   * todos los locales en modo combinado). Solo tiene sentido mostrarlo si
   * `conexionGoogle` es true — sin conectar, es siempre 0 y confunde más de
   * lo que informa. */
  visitasPerfil: number;
  llamadas: number;
  comoLlegar: number;
  /** true si el local activo (o, en combinado, al menos uno de los locales) tiene su Google conectado. */
  conexionGoogle: boolean;
  ubicaciones: Cliente[];
  activoId: string;
  activoNombre: string;
  codigoAcceso: string;
  diasConTaps: string[];
  labelsTaps: string[];
  nfcPorDia: number[];
  qrPorDia: number[];
  tieneSoporteQr: boolean;
  temasRecurrentes: TerminoFrecuente[];
}) {
  const hayVarios = ubicaciones.length > 1;
  return (
    <>
      {mensajeGoogle && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            mensajeGoogle.tono === "ok" ? "bg-slate-100 text-slate-800" : "border border-slate-300 text-slate-700"
          }`}
        >
          {mensajeGoogle.texto}
        </div>
      )}

      {/* Con más de un local: selector arriba de todo para poder saltar de
          uno a otro sin ir a la pestaña Sucursales (elegir un local ahí
          te trae de vuelta acá, a SU resumen — ver hrefSucursal en
          _lib.tsx). Decir explícitamente qué se está mirando — el
          combinado de todos, o el detalle de uno puntual — evita el
          problema de siempre: no saber si el número de abajo es "todo" o
          "solo este local". */}
      {hayVarios && (
        <div className="mb-4">
          <div className="mb-2">
            <SelectorSucursales
              ubicaciones={ubicaciones}
              activoId={activoId}
              modoTodos={modoTodos}
              codigoAcceso={codigoAcceso}
            />
          </div>
          <p className="text-sm text-slate-500">
            Viendo:{" "}
            <span className="font-semibold text-slate-800">
              {modoTodos ? `todos tus locales (${ubicaciones.length})` : activoNombre}
            </span>
            {!modoTodos && (
              <>
                {" — "}
                <a href={hrefTodos(codigoAcceso)} className="font-medium text-brand-fg hover:underline">
                  ver todos combinados
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {/* TIER 1 — lo que Google no te muestra: de qué se queja la gente, y
          cómo usan tu cartel. Ninguna de las dos cosas existe en Google —
          es la razón de ser de MetricsField (no somos un espejo de tu ficha
          de Google, somos el análisis y el hardware arriba de eso) — por
          eso va primero, antes que la calificación. El detalle completo de
          reseñas (responder cada una, ver todas) vive en la pestaña Reseñas
          — acá va compacto, con el link para saltar para allá. */}
      <SectionHeading
        title="Lo que Google no te muestra"
        subtitle="de qué se queja la gente, y cómo usan tu cartel"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(resenasHoy)}
            label="Reseñas hoy"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(resenasNegativas)}
            label="Reseñas negativas (≤3★)"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconWave size={18} className="text-slate-700" />}
            value={fmtNum(totalTapsHistorico)}
            label="Taps del cartel"
          />
        </div>
        {piezaMasUsada && (
          <div className="min-w-[150px] max-w-[220px] flex-1">
            <StatChip
              icon={<IconWave size={18} className="text-slate-700" />}
              value={fmtNum(piezaMasUsada.taps)}
              label={`Pieza más usada esta semana: ${piezaMasUsada.etiqueta}${
                piezaMasUsada.local ? ` (${piezaMasUsada.local})` : ""
              }`}
            />
          </div>
        )}
      </div>

      <SugerenciasRepetidas temas={temasRecurrentes} apiHabilitada={resenasApiHabilitada()} />

      <div className="mt-4">
        <TapsPorHoraSemanaChart dias={horasSemana} />
      </div>

      <a
        href="#resenas"
        className="mt-3 block rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-brand-fg transition hover:border-slate-300 hover:bg-white"
      >
        Ver y responder todas tus reseñas →
      </a>

      {/* TIER 2 — tu calificación: la prueba de resultado, pero ya no
          arranca la página — la podés ver vos mismo en Google Maps sin
          nosotros. Sigue siendo clave (el "Desde que usás MetricsField" de
          cada tarjeta), solo que no es lo primero. */}
      <SectionHeading title="Tu calificación" subtitle="tu progreso desde que usás MetricsField" />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(resenasHoy)}
            label="Reseñas hoy"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconStarChip size={17} className="text-slate-700" />}
            value={fmtNum(resenasNuevasMes)}
            label="Reseñas este mes"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconCrecimiento size={18} className="text-slate-700" />}
            value={fmtNum(resenasTotales)}
            label="Reseñas totales"
          />
        </div>
        {posicionCompetencia && (
          <div className="min-w-[150px] max-w-[220px] flex-1">
            <StatChip
              icon={<IconSearch size={17} className="text-slate-700" />}
              value={`#${posicionCompetencia.puesto} de ${posicionCompetencia.total}`}
              label="Posición vs. competencia"
            />
          </div>
        )}
      </div>

      {/* Rendimiento: una tarjeta por local, siempre (aunque sea uno solo)
          — mismo formato en toda la cartera. Flexbox con wrap, no grid: a
          diferencia de un grid de columnas fijas, acá cada fila reparte el
          espacio sobrante entre lo que tiene — así una última fila con
          menos tarjetas que columnas nunca queda con una tarjeta angosta
          flotando sola en medio de espacio vacío (pasaba con 5 locales a
          xl:grid-cols-4: 4 en la primera fila + 1 sola al 25% de ancho).
          Cada tarjeta es el drill-down a ese local puntual; ninguna se
          marca "hero" en modo combinado, porque ahí no hay uno activo. */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rendimiento · {ubicaciones.length} local{ubicaciones.length === 1 ? "" : "es"}
        </p>
        <div className="flex flex-wrap gap-4">
          {ubicaciones.map((s) => {
            const activa = !modoTodos && s.id === activoId;
            const heroData = heroDeCalificacion(s);
            const tarjeta =
              heroData.rating !== null ? (
                <CalificacionGoogleCard
                  rating={heroData.rating}
                  totalResenas={heroData.totalResenas}
                  deltaRating={heroData.deltaRating}
                  deltaResenas={heroData.deltaResenas}
                  nombre={s.nombre}
                  subtitulo={`${s.zona}${activa ? " · viendo ahora" : ""}`}
                  hero={activa}
                />
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">{s.nombre}</p>
                  <p className="text-xs text-slate-500">{s.zona}</p>
                  <p className="mt-3 text-xs text-slate-400">Sin datos de Google todavía.</p>
                </div>
              );
            if (!hayVarios) return <div key={s.id} className="min-w-[240px] max-w-sm flex-1">{tarjeta}</div>;
            return (
              <a
                key={s.id}
                href={hrefSucursal(codigoAcceso, s)}
                title={`Ver el detalle de ${s.nombre}`}
                className={`block min-w-[240px] max-w-sm flex-1 rounded-3xl transition ${
                  activa ? "" : "hover:-translate-y-0.5"
                }`}
              >
                {tarjeta}
              </a>
            );
          })}
        </div>
      </div>

      {/* TIER 3 — alcance real en Google (Business Profile Performance API):
          cuánta gente te vio, te llamó o pidió cómo llegar. Solo existe si
          el propio cliente conectó su cuenta desde acá — sin conexión activa
          no hay nada honesto que mostrar: mejor la invitación a conectar que
          un 0 fijo que confunde. */}
      <SectionHeading
        title="Alcance en Google"
        subtitle="cuánta gente te vio, te llamó o pidió cómo llegar este mes"
      />

      {conexionGoogle ? (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-[150px] max-w-[220px] flex-1">
            <StatChip
              icon={<IconEyeChip size={18} className="text-slate-700" />}
              value={fmtNum(visitasPerfil)}
              label="Visitas al perfil"
            />
          </div>
          <div className="min-w-[150px] max-w-[220px] flex-1">
            <StatChip
              icon={<IconPhoneChip size={17} className="text-slate-700" />}
              value={fmtNum(llamadas)}
              label="Llamadas"
            />
          </div>
          <div className="min-w-[150px] max-w-[220px] flex-1">
            <StatChip
              icon={<IconDirectionsChip size={18} className="text-slate-700" />}
              value={fmtNum(comoLlegar)}
              label="Cómo llegar"
            />
          </div>
        </div>
      ) : (
        <a
          href="#rating"
          className="mb-4 block rounded-3xl border border-dashed border-slate-300 bg-white/50 p-4 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-white"
        >
          Conectá tu Google Business Profile para ver cuánta gente te vio, te llamó o pidió cómo llegar. →
        </a>
      )}

      {/* TIER 4 — NFC vs. QR por día: la más barata de las cuatro secciones
          (el total de taps y su patrón horario ya se contaron en el tier 1)
          — esto es el desglose por canal, día a día, para el final. */}
      <SectionHeading title="Tu cartel" subtitle="taps por día, NFC vs. QR" />

      {diasConTaps.length > 0 ? (
        <TapsPorSoporteChart
          labels={labelsTaps}
          fechas={diasConTaps}
          nfc={nfcPorDia}
          qr={qrPorDia}
          mostrarQr={tieneSoporteQr}
          codigo={codigoAcceso}
          comercioId={activoId}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Escaneos</p>
          <p className="mt-2 text-sm text-slate-500">Todavía no hay actividad del cartel.</p>
        </div>
      )}
    </>
  );
}
