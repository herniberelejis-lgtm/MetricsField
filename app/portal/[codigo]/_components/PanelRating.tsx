import type { MetricaMensual, ResenaCRM } from "@/lib/types";
import type { ResenasPorHoraDia } from "@/lib/db";
import { Card, btnPrimary, btnSecondary, IconClock } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import DesconectarGoogleBoton from "@/components/portal/DesconectarGoogleBoton";
import RatingSerieChart from "@/components/RatingSerieChart";
import RatingPorHoraChart from "@/components/RatingPorHoraChart";
import { resenasParaProximaDecima, cincoEstrellasPorCadaUna, ratingDespuesDeUnaMala } from "@/lib/objetivos";
import { businessProfileHabilitado } from "@/lib/gbp";

const COLOR_ESTRELLA: Record<number, string> = {
  5: "bg-slate-900", 4: "bg-slate-900", 3: "bg-slate-500", 2: "bg-slate-300", 1: "bg-slate-300",
};

// Panel "Mi Rating en Google": la calificación mes a mes, qué falta para
// subir (próximo escalón y cuánto pesa una mala reseña) y, si hay reseñas
// detalladas, a qué hora llegan y su distribución por estrella. La
// calificación de hoy y el "desde que usás MetricsField" viven en el
// Resumen — acá no se repiten.
export default function PanelRating({
  gbpConectado,
  diasConectado,
  gbpPorVencer,
  codigoAcceso,
  comercioId,
  ratingHero,
  resenasHero,
  resenas,
  historico,
  resenasPorHora,
  hayResenasDetalladas,
}: {
  gbpConectado: boolean;
  diasConectado: number | null;
  gbpPorVencer: boolean;
  codigoAcceso: string;
  comercioId: string;
  ratingHero: number | null;
  resenasHero: number;
  resenas: ResenaCRM[];
  historico: MetricaMensual[];
  resenasPorHora: ResenasPorHoraDia[];
  /** Hay reseñas con fecha y hora (API de reseñas o cargadas a mano). */
  hayResenasDetalladas: boolean;
}) {
  // Distribución de reseñas por estrella — para la barra 5★..1★ del panel
  // "Mi Rating en Google". Sobre TODAS las reseñas conocidas (no solo las
  // pendientes), igual que resumenResenas en el panel de Resumen.
  const distribucionEstrellas = ([5, 4, 3, 2, 1] as const).map((n) => ({
    n,
    cantidad: resenas.filter((r) => r.estrellas === n).length,
  }));
  const maxDistribucion = Math.max(...distribucionEstrellas.map((d) => d.cantidad), 1);

  return (
    <>
      {/* Conexión con Google Business Profile: oculta mientras Google no
          apruebe esa API (ver businessProfileHabilitado en lib/gbp.ts) —
          conectar hoy no traería ningún dato. */}
      {businessProfileHabilitado() && (
        <Card variant="glass" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${gbpConectado ? "bg-slate-900" : "bg-slate-300"}`}
                aria-hidden
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">Google Business Profile</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      gbpConectado ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {gbpConectado ? "Conectado" : "No conectado"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {gbpConectado
                    ? "Así traemos solas las visitas, llamadas y clics de “cómo llegar” de tu ficha."
                    : "Autorizá con tu cuenta de Google (la que administra tu ficha) para que las visitas y llamadas se carguen solas, sin que nadie tenga que anotarlas a mano."}
                </p>
                {gbpConectado && (
                  <p className="mt-1 text-xs text-slate-400">
                    Conectado {diasConectado === 0 ? "hoy" : `hace ${diasConectado} día${diasConectado === 1 ? "" : "s"}`}.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/api/portal/google/oauth/start?codigo=${codigoAcceso}&comercioId=${comercioId}`}
                className={gbpConectado ? btnSecondary : btnPrimary}
              >
                {gbpConectado ? "Reconectar" : "Conectar con Google"}
              </a>
              {gbpConectado && (
                <DesconectarGoogleBoton codigo={codigoAcceso} comercioId={comercioId} />
              )}
            </div>
          </div>
          {gbpPorVencer && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">
              <IconClock size={14} className="mt-0.5 shrink-0" />
              <span>
                Todavía estamos terminando de verificar la app con Google — mientras tanto, este
                permiso vence cada 7 días. Tocá "Reconectar" una vez por semana para que no se corte.
              </span>
            </p>
          )}
        </Card>
      )}

      {/* La calificación de hoy y el "desde que usás MetricsField" ya están
          en la tarjeta del Resumen: acá va lo que no está en ningún otro
          lado — la evolución mes a mes y qué falta para subir. */}
      {ratingHero !== null && (
        <>
          {historico.length > 0 && (
            <div className="mb-4">
              <RatingSerieChart historico={historico} />
            </div>
          )}
          <ObjetivosRating rating={ratingHero} total={resenasHero} />
        </>
      )}

      {/* Necesita la hora de cada reseña: sin API de reseñas (ni carga a
          mano) sería un gráfico vacío para siempre. */}
      {hayResenasDetalladas && (
        <div className="mb-4">
          <RatingPorHoraChart dias={resenasPorHora} />
        </div>
      )}

      {resenas.length > 0 && (
        <Card variant="glass">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cómo vienen tus reseñas</p>
          <div className="mt-3 flex flex-col gap-2">
            {distribucionEstrellas.map((d) => (
              <div key={d.n} className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-xs text-slate-500">{d.n}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${COLOR_ESTRELLA[d.n]}`}
                    style={{ width: `${Math.max(d.cantidad ? 4 : 0, (d.cantidad / maxDistribucion) * 100)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-600">{d.cantidad}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// "Qué te falta para subir": dos cuentas sobre el rating y el total reales
// de Google (ver lib/objetivos.ts). Aproximadas porque Google redondea el
// promedio a un decimal.
function ObjetivosRating({ rating, total }: { rating: number; total: number }) {
  const proximo = resenasParaProximaDecima(rating, total);
  const porCadaMala = cincoEstrellasPorCadaUna(rating);
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card variant="glass">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tu próximo escalón</p>
        {proximo ? (
          <>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {proximo.objetivo.toFixed(1)}★
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Te faltan ≈ {fmtNum(proximo.faltan)} reseña{proximo.faltan === 1 ? "" : "s"} de 5★ seguidas para que
              Google muestre {proximo.objetivo.toFixed(1)}★.
            </p>
          </>
        ) : (
          <>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">5.0★</div>
            <p className="mt-1 text-xs text-slate-500">Estás en el máximo que muestra Google. Ahora se trata de sostenerlo.</p>
          </>
        )}
      </Card>
      <Card variant="glass">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cuánto pesa una mala reseña</p>
        {porCadaMala !== null ? (
          <>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {fmtNum(porCadaMala)} de 5★
            </div>
            <p className="mt-1 text-xs text-slate-500">
              hacen falta para compensar una sola de 1★ con tu promedio actual. Por eso conviene que cada cliente
              contento deje la suya.
            </p>
          </>
        ) : (
          <>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {ratingDespuesDeUnaMala(rating, total).toFixed(2)}★
            </div>
            <p className="mt-1 text-xs text-slate-500">
              sería tu promedio después de una sola reseña de 1★: con 5.0★, cualquier mala reseña se nota.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
