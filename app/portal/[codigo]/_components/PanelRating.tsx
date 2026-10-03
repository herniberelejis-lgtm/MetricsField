import type { MetricaMensual } from "@/lib/types";
import type { ResenasPorHoraDia } from "@/lib/db";
import { Card, btnPrimary, btnSecondary, IconClock } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import DesconectarGoogleBoton from "@/components/portal/DesconectarGoogleBoton";
import RatingSerieChart from "@/components/RatingSerieChart";
import RatingPorHoraChart from "@/components/RatingPorHoraChart";
import { resenasParaProximaDecima, cincoEstrellasPorCadaUna, ratingDespuesDeUnaMala } from "@/lib/objetivos";
import { businessProfileHabilitado } from "@/lib/gbp";
import SemaforoResenas from "@/components/portal/SemaforoResenas";
import type { ResenaParaSemaforo } from "@/lib/semaforo";

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
  historico,
  resenasPorHora,
  resenasSemaforo,
  semaforoFuente,
  ritmoMensual,
}: {
  gbpConectado: boolean;
  diasConectado: number | null;
  gbpPorVencer: boolean;
  codigoAcceso: string;
  comercioId: string;
  ratingHero: number | null;
  resenasHero: number;
  historico: MetricaMensual[];
  /** Grilla día×hora de los últimos 7 días, coloreada por calificación. */
  resenasPorHora: ResenasPorHoraDia[];
  /** Reseñas para el semáforo, de la más nueva a la más vieja. */
  resenasSemaforo: ResenaParaSemaforo[];
  /** "todas" (API de reseñas o cargadas a mano) o "google" (las públicas de la ficha). */
  semaforoFuente: "todas" | "google";
  /** Reseñas nuevas por mes en promedio (historial mensual). */
  ritmoMensual: number;
}) {
  const hayReseñasPorHora = resenasPorHora.some((d) => d.horas.some((c) => c.rating !== null));

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
          <ObjetivosRating rating={ratingHero} total={resenasHero} ritmoMensual={ritmoMensual} />
        </>
      )}

      {/* Semáforo: buenas / medias / malas, con aviso si hay una mala. */}
      {resenasSemaforo.length > 0 && (
        <div className="mb-4">
          <SemaforoResenas resenas={resenasSemaforo} fuente={semaforoFuente} />
        </div>
      )}

      {/* Mapa por hora en colores: solo si alguna reseña cayó en los últimos
          7 días — si no, es una grilla vacía. */}
      {hayReseñasPorHora && (
        <div className="mb-4">
          <RatingPorHoraChart dias={resenasPorHora} />
        </div>
      )}

    </>
  );
}

// "Qué te falta para subir": dos cuentas sobre el rating y el total reales
// de Google (ver lib/objetivos.ts). Aproximadas porque Google redondea el
// promedio a un decimal.
function ObjetivosRating({
  rating,
  total,
  ritmoMensual,
}: {
  rating: number;
  total: number;
  ritmoMensual: number;
}) {
  const proximo = resenasParaProximaDecima(rating, total);
  const porCadaMala = cincoEstrellasPorCadaUna(rating);
  // Meses para llegar al próximo escalón al ritmo de reseñas de siempre —
  // en el mejor caso (todas de 5★): es un piso, no una promesa.
  const meses = proximo && ritmoMensual >= 0.5 ? Math.ceil(proximo.faltan / ritmoMensual) : null;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      {meses !== null && proximo && (
        <Card variant="glass">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">A tu ritmo</p>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {meses > 24 ? "+2 años" : `${meses} mes${meses === 1 ? "" : "es"}`}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            para llegar a {proximo.objetivo.toFixed(1)}★ con tus ~{ritmoMensual.toFixed(0)} reseñas nuevas por mes, y
            eso si todas fueran de 5★.{" "}
            {meses > 6 ? "Para acortarlo: más clientes tocando el cartel." : ""}
          </p>
        </Card>
      )}
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
