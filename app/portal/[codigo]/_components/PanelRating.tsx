import type { ResenaCRM } from "@/lib/types";
import { Card, Stars, btnPrimary, btnSecondary, IconClock } from "@/components/ui";
import { fmtNum } from "@/lib/format";
import DesconectarGoogleBoton from "@/components/portal/DesconectarGoogleBoton";

const COLOR_ESTRELLA: Record<number, string> = {
  5: "bg-slate-900", 4: "bg-slate-900", 3: "bg-slate-500", 2: "bg-slate-300", 1: "bg-slate-300",
};

// Panel "Mi Rating en Google": estado de la conexión con Google Business
// Profile, foto en vivo de la ficha, calificación hero con el delta desde
// que usa MetricsField, y distribución de reseñas por estrella.
export default function PanelRating({
  gbpConectado,
  diasConectado,
  gbpPorVencer,
  codigoAcceso,
  comercioId,
  googleSyncEn,
  ratingGoogle,
  resenasGoogle,
  ratingHero,
  resenasHero,
  deltaRatingHero,
  deltaResenasHero,
  resenas,
}: {
  gbpConectado: boolean;
  diasConectado: number | null;
  gbpPorVencer: boolean;
  codigoAcceso: string;
  comercioId: string;
  googleSyncEn: string | null;
  ratingGoogle: number | null;
  resenasGoogle: number | null;
  ratingHero: number | null;
  resenasHero: number;
  deltaRatingHero: number | null;
  deltaResenasHero: number | null;
  resenas: ResenaCRM[];
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

      {googleSyncEn && (
        <Card variant="glass" className="mb-4">
          <p className="text-sm font-medium text-slate-700">Tu ficha de Google ahora mismo</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{ratingGoogle?.toFixed(1)}★</span>
            <span className="text-sm text-slate-500">{fmtNum(resenasGoogle ?? 0)} reseñas totales</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            actualizado automáticamente {new Date(googleSyncEn).toLocaleDateString("es-AR")}
          </p>
        </Card>
      )}

      {ratingHero !== null && (
        <Card variant="glass" className="mb-4 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calificación</p>
          <div className="mt-2 text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{ratingHero.toFixed(1)}</div>
          <Stars rating={ratingHero} mono />
          <p className="mt-1 text-xs text-slate-500">{fmtNum(resenasHero)} reseñas totales</p>
          {deltaRatingHero !== null && deltaResenasHero !== null && (
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs font-semibold">
              <span className={deltaRatingHero >= 0 ? "text-slate-900" : "text-slate-400"}>
                {deltaRatingHero >= 0 ? "+" : ""}
                {deltaRatingHero.toFixed(1)}★
              </span>
              <span className={deltaResenasHero >= 0 ? "text-slate-900" : "text-slate-400"}>
                {deltaResenasHero >= 0 ? "+" : ""}
                {fmtNum(deltaResenasHero)} reseñas
              </span>
            </div>
          )}
        </Card>
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
