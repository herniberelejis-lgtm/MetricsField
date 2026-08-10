import type { Cliente, ResenaCRM } from "@/lib/types";
import type { TerminoFrecuente } from "@/lib/keywords";
import { fmtNum } from "@/lib/format";
import { IconWave } from "@/components/ui";
import {
  StatChip,
  CalificacionGoogleCard,
  ResenasRecientesCard,
  IconStarChip,
  IconVisitas,
  IconCrecimiento,
} from "@/components/portal/PortalResumen";
import SugerenciasRepetidas from "@/components/portal/SugerenciasRepetidas";
import PrioridadesPanel, { type Prioridad } from "@/components/portal/PrioridadesPanel";
import TapsPorSoporteChart from "@/components/TapsPorSoporteChart";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import { heroDeCalificacion, hrefSucursal } from "../_lib";

// Panel "Resumen": de un vistazo, para abrir el portal y entender el
// estado del negocio sin tener que entrar a ninguna otra sección todavía.
export default function PanelResumen({
  mensajeGoogle,
  prioridades,
  totalTapsHistorico,
  resenasHoy,
  resenasNuevasMes,
  visitasPerfilMes,
  resenasTotales,
  ubicaciones,
  activoId,
  codigoAcceso,
  cuentaId,
  diasConTaps,
  labelsTaps,
  nfcPorDia,
  qrPorDia,
  tieneSoporteQr,
  resenasRecientes,
  temasRecurrentes,
}: {
  mensajeGoogle: { texto: string; tono: "ok" | "error" } | null;
  prioridades: Prioridad[];
  totalTapsHistorico: number;
  resenasHoy: number;
  resenasNuevasMes: number;
  visitasPerfilMes: number;
  resenasTotales: number;
  ubicaciones: Cliente[];
  activoId: string;
  codigoAcceso: string;
  cuentaId: string;
  diasConTaps: string[];
  labelsTaps: string[];
  nfcPorDia: number[];
  qrPorDia: number[];
  tieneSoporteQr: boolean;
  resenasRecientes: ResenaCRM[];
  temasRecurrentes: TerminoFrecuente[];
}) {
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

      {/* Lo único que requiere una acción del dueño, ordenado por
          urgencia — todo lo demás en este portal es informativo. Arranca
          colapsado (ver PrioridadesPanel) para no ocupar media pantalla. */}
      <PrioridadesPanel prioridades={prioridades} />

      {/* De un vistazo: para abrir el portal y entender el estado del
          negocio sin tener que entrar a ninguna otra sección todavía.
          Flexbox con wrap (no grid de columnas fijas) para que la última
          fila reparta el espacio sobrante en vez de dejar un chip angosto
          solo — pasaba en mobile con grid-cols-2 y 5 chips (2+2+1). */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconWave size={18} className="text-slate-700" />}
            value={fmtNum(totalTapsHistorico)}
            label="Taps del cartel"
          />
        </div>
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
            icon={<IconVisitas size={18} className="text-slate-700" />}
            value={fmtNum(visitasPerfilMes)}
            label="Visitas al perfil"
          />
        </div>
        <div className="min-w-[150px] max-w-[220px] flex-1">
          <StatChip
            icon={<IconCrecimiento size={18} className="text-slate-700" />}
            value={fmtNum(resenasTotales)}
            label="Reseñas totales"
          />
        </div>
      </div>

      {/* Rendimiento: una tarjeta por local, siempre (aunque sea uno solo)
          — mismo formato en toda la cartera. Flexbox con wrap, no grid: a
          diferencia de un grid de columnas fijas, acá cada fila reparte el
          espacio sobrante entre lo que tiene — así una última fila con
          menos tarjetas que columnas nunca queda con una tarjeta angosta
          flotando sola en medio de espacio vacío (pasaba con 5 locales a
          xl:grid-cols-4: 4 en la primera fila + 1 sola al 25% de ancho). */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rendimiento · {ubicaciones.length} local{ubicaciones.length === 1 ? "" : "es"}
        </p>
        <div className="flex flex-wrap gap-4">
          {ubicaciones.map((s) => {
            const activa = s.id === activoId;
            const hayVarios = ubicaciones.length > 1;
            const heroData = heroDeCalificacion(s);
            const tarjeta =
              heroData.rating !== null ? (
                <CalificacionGoogleCard
                  rating={heroData.rating}
                  totalResenas={heroData.totalResenas}
                  deltaRating={heroData.deltaRating}
                  deltaResenas={heroData.deltaResenas}
                  nombre={s.nombre}
                  subtitulo={`${s.zona}${activa && hayVarios ? " · viendo ahora" : ""}`}
                  hero={activa && hayVarios}
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
                href={hrefSucursal(codigoAcceso, cuentaId, s)}
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

      {/* Actividad del local activo: escaneos recientes + últimas reseñas,
          uno al lado del otro en desktop, apilados en mobile. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <ResenasRecientesCard resenas={resenasRecientes} />
      </div>

      <div className="mt-4">
        <SugerenciasRepetidas
          temas={temasRecurrentes}
          apiHabilitada={resenasApiHabilitada()}
        />
      </div>
    </>
  );
}
