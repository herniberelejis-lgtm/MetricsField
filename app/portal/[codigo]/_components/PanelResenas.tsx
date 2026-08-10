import type { ResenaCRM, TonoMarca } from "@/lib/types";
import type { MencionEmpleado } from "@/lib/empleados";
import { Card } from "@/components/ui";
import { IconUsers } from "@/components/portal/PortalShell";
import MencionesEmpleados from "@/components/MencionesEmpleados";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import GestionResenas from "@/components/GestionResenas";
import AutomatizacionResenas from "@/components/AutomatizacionResenas";
import ResumenResenas, { type ResumenResenasData } from "@/components/ResumenResenas";

// Panel "Reseñas": gestión de reseñas — el dueño edita/aprueba la
// respuesta sugerida para sus reseñas de Google, sin depender del equipo
// de MetricsField. Personal vive acá también (antes era su propio ítem de
// menú): son menciones dentro del texto de las reseñas, tiene más sentido
// leerlas junto a ellas que en una sección aparte.
export default function PanelResenas({
  resenas,
  resenasPendientes,
  resenasAutomaticas,
  resumenResenas,
  personalEmpleados,
  codigoAcceso,
  comercioId,
  autoResponderPositivas,
  autoResponderUmbral,
  tonoMarca,
}: {
  resenas: ResenaCRM[];
  resenasPendientes: ResenaCRM[];
  resenasAutomaticas: ResenaCRM[];
  resumenResenas: ResumenResenasData;
  personalEmpleados: MencionEmpleado[];
  codigoAcceso: string;
  comercioId: string;
  autoResponderPositivas: boolean;
  autoResponderUmbral: 4 | 5;
  tonoMarca: TonoMarca;
}) {
  return (
    <>
      {resenas.length > 0 && (
        <Card variant="glass">
          <p className="text-sm font-medium text-slate-700">Gestión de reseñas</p>
          <p className="mt-1 text-xs text-slate-500">
            Te sugerimos una respuesta para cada reseña, la editás si querés y la copiás a
            Google vos mismo — todavía no publicamos nada en tu nombre.
          </p>
          <div className="mt-3">
            <ResumenResenas data={resumenResenas} variant="glass" />
          </div>
          {resenasApiHabilitada() && (
            <div className="mt-3">
              <AutomatizacionResenas
                codigo={codigoAcceso}
                comercioId={comercioId}
                activa={autoResponderPositivas}
                umbral={autoResponderUmbral}
                apiHabilitada
                resenasAutomaticas={resenasAutomaticas}
              />
            </div>
          )}
          <div className="mt-3">
            <GestionResenas
              resenasIniciales={resenasPendientes}
              tonoMarca={tonoMarca}
              codigo={codigoAcceso}
              comercioId={comercioId}
            />
          </div>
        </Card>
      )}

      {personalEmpleados.length > 0 && (
        <Card variant="glass" className={resenas.length > 0 ? "mt-4" : undefined}>
          <div className="flex items-center gap-2">
            <IconUsers size={16} className="text-slate-500" />
            <p className="text-sm font-medium text-slate-700">Tu equipo</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cada mozo o empleado con tarjeta NFC propia, con sus taps (dato exacto) y las
            reseñas que lo nombran en el texto (señal, no atribución exacta).
          </p>
          <div className="mt-3">
            <MencionesEmpleados menciones={personalEmpleados} />
          </div>
        </Card>
      )}
    </>
  );
}
