import type { Cliente } from "@/lib/types";
import { IconBuilding } from "@/components/portal/PortalShell";
import { CalificacionGoogleCard } from "@/components/portal/PortalResumen";
import ScrollActiveIntoView from "@/components/ScrollActiveIntoView";
import ScrollFadeRow from "@/components/ScrollFadeRow";
import { hrefSucursal } from "../_lib";

// Panel "Sucursales": selector de local dentro de la cuenta — el detalle
// de cada uno (dispositivos, reseñas, evolución mensual) vive en las
// otras pestañas de "Mi Negocio", que ya muestran el local elegido acá.
export default function PanelSucursales({
  sucursalesLength,
  ubicaciones,
  activoId,
  codigoAcceso,
  cuentaId,
  ratingHero,
  resenasHero,
  deltaRatingHero,
  deltaResenasHero,
  activoNombre,
  activoRubro,
  activoZona,
}: {
  sucursalesLength: number;
  ubicaciones: Cliente[];
  activoId: string;
  codigoAcceso: string;
  cuentaId: string;
  ratingHero: number | null;
  resenasHero: number;
  deltaRatingHero: number | null;
  deltaResenasHero: number | null;
  activoNombre: string;
  activoRubro: string;
  activoZona: string;
}) {
  if (sucursalesLength === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-200 bg-white">
          <IconBuilding size={22} className="text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">Todavía no está activo</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Cuando tengas más de un local, vas a poder elegir entre ellos desde acá y ver el
          rating y las reseñas de cada uno por separado. Hoy tu cuenta gestiona un solo local.
        </p>
        <span className="mt-3.5 inline-block rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Próximamente
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Selector compacto: todos los locales, el elegido resaltado —
          cambiarlo recarga la página con ese local como "activo" en
          todo el portal, así que el detalle de abajo es siempre suyo.
          ScrollFadeRow agrega el degradé en el borde cuando hay más
          locales de los que entran en el ancho disponible — sin esto,
          el último visible queda cortado a mitad de nombre, sin ninguna
          pista de que hay más para scrollear (el scrollbar nativo puede
          estar oculto según el navegador/SO). */}
      <div className="mb-4">
        <ScrollFadeRow>
          {ubicaciones.map((s) => {
            const activa = s.id === activoId;
            const chip = (
              <a
                href={hrefSucursal(codigoAcceso, cuentaId, s)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  activa
                    ? "bg-brand text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {s.nombre}
              </a>
            );
            // En mobile la tira es más ancha que la pantalla — sin esto,
            // si el local elegido está lejos del principio, entrás y no
            // lo ves resaltado sin scrollear la tira vos mismo.
            return activa ? (
              <ScrollActiveIntoView key={s.id}>{chip}</ScrollActiveIntoView>
            ) : (
              <div key={s.id} className="contents">
                {chip}
              </div>
            );
          })}
        </ScrollFadeRow>
      </div>

      <div className="space-y-4">
        {ratingHero !== null && (
          <CalificacionGoogleCard
            rating={ratingHero}
            totalResenas={resenasHero}
            deltaRating={deltaRatingHero}
            deltaResenas={deltaResenasHero}
            nombre={activoNombre}
            subtitulo={`${activoRubro} · ${activoZona}`}
          />
        )}

        {/* El detalle de este local (dispositivos, reseñas, evolución
            mensual) ya se ve en las otras pestañas de "Mi Negocio" — acá
            solo se elige el local, para no repetir las mismas tarjetas
            dos veces. */}
        <p className="text-xs text-slate-400">
          El resto de las pestañas de Mi Negocio (Dispositivos, Reseñas, Resumen del mes) ya muestran
          el detalle de <b className="text-slate-500">{activoNombre}</b>, el local elegido acá arriba.
        </p>
      </div>
    </>
  );
}
