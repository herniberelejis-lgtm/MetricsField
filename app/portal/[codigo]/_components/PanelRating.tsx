import type { MetricaMensual } from "@/lib/types";
import { Card, btnPortal, btnPortalSec, IconClock } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import DesconectarGoogleBoton from "@/components/portal/DesconectarGoogleBoton";
import RatingSerieChart from "@/components/RatingSerieChart";
import RatingPorHoraChart from "@/components/RatingPorHoraChart";
import { resenasParaProximaDecima, cincoEstrellasPorCadaUna, ratingDespuesDeUnaMala } from "@/lib/objetivos";
import { businessProfileHabilitado } from "@/lib/gbp";
import TiraMetricas from "@/components/portal/TiraMetricas";
import SemaforoResenas from "@/components/portal/SemaforoResenas";
import type { ResenaParaSemaforo, VistaMapa } from "@/lib/semaforo";
import type { MetaCalificacion } from "@/lib/conclusiones";

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
  vistasMapa,
  resenasSemaforo,
  semaforoFuente,
  ritmoMensual,
  metaExacta,
}: {
  gbpConectado: boolean;
  diasConectado: number | null;
  gbpPorVencer: boolean;
  codigoAcceso: string;
  comercioId: string;
  ratingHero: number | null;
  resenasHero: number;
  historico: MetricaMensual[];
  /** Mapa día de la semana × hora: reseñas del mes y últimas 100. */
  vistasMapa: VistaMapa[];
  /** Reseñas para el semáforo, de la más nueva a la más vieja. */
  resenasSemaforo: ResenaParaSemaforo[];
  /** "todas" (API de reseñas o cargadas a mano) o "google" (las públicas de la ficha). */
  semaforoFuente: "todas" | "google";
  /** Reseñas nuevas por mes en promedio (historial mensual). */
  ritmoMensual: number;
  /** Cuentas con el promedio exacto (lib/conclusiones.ts) cuando tenemos
   * todas las reseñas de Google; null si solo está el rating redondeado.
   * Son las mismas que muestra "Tus conclusiones": un solo número. */
  metaExacta: MetaCalificacion | null;
}) {
  const hayReseñasPorHora = vistasMapa.some((v) => v.total > 0);

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
                className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${gbpConectado ? "bg-[#8FD1AE]" : "bg-[#D3D9E2]"}`}
                aria-hidden
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold text-slate-900">Google Business Profile</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      gbpConectado ? "bg-[#EAF7F0] text-[#0B5E40]" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {gbpConectado ? "Conectado" : "No conectado"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {gbpConectado
                    ? "Así traemos solas las visitas, llamadas y clics de “cómo llegar” de tu ficha."
                    : "Autorizá con tu cuenta de Google (la que administra tu ficha) para que las visitas y llamadas se carguen solas, sin que nadie tenga que anotarlas a mano."}
                </p>
                {gbpConectado && (
                  <p className="mt-1 text-xs text-slate-600">
                    Conectado {diasConectado === 0 ? "hoy" : `hace ${diasConectado} día${diasConectado === 1 ? "" : "s"}`}.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/api/portal/google/oauth/start?codigo=${codigoAcceso}&comercioId=${comercioId}`}
                className={gbpConectado ? btnPortalSec : btnPortal}
              >
                {gbpConectado ? "Reconectar" : "Conectar con Google"}
              </a>
              {gbpConectado && (
                <DesconectarGoogleBoton codigo={codigoAcceso} comercioId={comercioId} />
              )}
            </div>
          </div>
          {gbpPorVencer && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#F4F7FB] px-3 py-2 text-xs leading-relaxed text-slate-700">
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
          <ObjetivosRating
            rating={ratingHero}
            total={resenasHero}
            ritmoMensual={ritmoMensual}
            metaExacta={metaExacta}
          />
        </>
      )}

      {/* Semáforo: buenas / medias / malas, con aviso si hay una mala. */}
      {resenasSemaforo.length > 0 && (
        <div className="mb-4">
          <SemaforoResenas resenas={resenasSemaforo} fuente={semaforoFuente} />
        </div>
      )}

      {/* Mapa de calor día de la semana × hora (reseñas del mes o últimas
          100): solo si hay alguna reseña con hora — si no, es una grilla vacía. */}
      {hayReseñasPorHora && (
        <div className="mb-4">
          <RatingPorHoraChart vistas={vistasMapa} />
        </div>
      )}

    </>
  );
}

// "Qué te falta para subir": dos cuentas sobre el rating y el total reales
// de Google (ver lib/objetivos.ts). Aproximadas porque Google redondea el
// promedio a un decimal — salvo que tengamos todas las reseñas sincronizadas
// (metaExacta): ahí se usa el promedio exacto, el mismo de "Tus conclusiones".
function ObjetivosRating({
  rating,
  total,
  ritmoMensual,
  metaExacta,
}: {
  rating: number;
  total: number;
  ritmoMensual: number;
  metaExacta: MetaCalificacion | null;
}) {
  const proximo = metaExacta
    ? { objetivo: Number(metaExacta.siguiente.replace(",", ".")), faltan: metaExacta.faltan }
    : resenasParaProximaDecima(rating, total);
  const porCadaMala = metaExacta ? metaExacta.compensaUnaMala : cincoEstrellasPorCadaUna(rating);
  // Meses para llegar al próximo escalón al ritmo de reseñas de siempre —
  // en el mejor caso (todas de 5★): es un piso, no una promesa.
  const meses = proximo && ritmoMensual >= 0.5 ? Math.ceil(proximo.faltan / ritmoMensual) : null;
  const celdas: { etiqueta: string; valor: string; texto: string }[] = [];
  celdas.push(
    proximo
      ? {
          etiqueta: "Tu próximo escalón",
          valor: `${decimal(proximo.objetivo)} ★`,
          texto: `Te faltan ≈ ${fmtNum(proximo.faltan)} reseña${proximo.faltan === 1 ? "" : "s"} de 5★ seguidas para que Google muestre ${decimal(proximo.objetivo)}★.`,
        }
      : {
          etiqueta: "Tu próximo escalón",
          valor: "5,0 ★",
          texto: "Estás en el máximo que muestra Google. Ahora se trata de sostenerlo.",
        },
  );
  if (metaExacta?.semanas != null) {
    celdas.push({
      etiqueta: "A tu ritmo",
      valor: `~${metaExacta.semanas} semana${metaExacta.semanas === 1 ? "" : "s"}`,
      texto: `para llegar a ${metaExacta.siguiente}★, al ritmo de tus reseñas de 5★ de los últimos 3 meses.`,
    });
  } else if (meses !== null && proximo) {
    celdas.push({
      etiqueta: "A tu ritmo",
      valor: meses > 24 ? "+2 años" : `${meses} mes${meses === 1 ? "" : "es"}`,
      texto: `para llegar a ${decimal(proximo.objetivo)}★ con tus ~${ritmoMensual.toFixed(0)} reseñas nuevas por mes, y eso si todas fueran de 5★.${
        meses > 6 ? " Para acortarlo: más clientes tocando el cartel." : ""
      }`,
    });
  }
  celdas.push(
    porCadaMala !== null
      ? {
          etiqueta: "Cuánto pesa una mala reseña",
          valor: `${fmtNum(porCadaMala)} de 5★`,
          texto:
            "hacen falta para compensar una sola de 1★ con tu promedio actual. Por eso conviene que cada cliente contento deje la suya.",
        }
      : {
          etiqueta: "Cuánto pesa una mala reseña",
          valor: `${ratingDespuesDeUnaMala(rating, total).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ★`,
          texto: "sería tu promedio después de una sola reseña de 1★: con 5,0★, cualquier mala reseña se nota.",
        },
  );
  return (
    <TiraMetricas
      etiqueta="Qué te falta para subir"
      className="mb-4"
      celdas={celdas.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor, detalle: c.texto }))}
    />
  );
}

function decimal(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
