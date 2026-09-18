import type { Cliente, ResenaCRM, TonoMarca } from "@/lib/types";
import type { MencionEmpleado } from "@/lib/empleados";
import { Card } from "@/components/ui";
import { IconUsers } from "@/components/portal/PortalShell";
import MencionesEmpleados from "@/components/MencionesEmpleados";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import GestionResenas from "@/components/GestionResenas";
import AutomatizacionResenas from "@/components/AutomatizacionResenas";
import ResumenResenas, { type ResumenResenasData } from "@/components/ResumenResenas";
import { hrefTodos } from "../_lib";
import SelectorSucursales from "./SelectorSucursales";

// Panel "Reseñas": el workspace completo — todas las reseñas (de todos los
// locales, si hay más de uno), cuántas son negativas, y la respuesta
// sugerida de cada una lista para aprobar (o aprobar todas de una) y
// copiar a Google. Antes esta pestaña directamente desaparecía del menú
// si `resenas` venía vacío — le pasaba de verdad a un cliente real sin
// nada cargado a mano en el CRM todavía, lo cual confunde más de lo que
// evita (una pestaña que aparece y desaparece sola). Ahora siempre está,
// con el estado vacío de cada pieza (ResumenResenas/GestionResenas) hecho
// cargo de avisar que no hay nada todavía. Personal vive acá también
// (antes era su propio ítem de menú): son menciones dentro del texto de
// las reseñas, tiene más sentido leerlas junto a ellas que en una sección
// aparte.
export default function PanelResenas({
  resenas,
  resenasPendientes,
  resenasAutomaticas,
  resumenResenas,
  personalEmpleados,
  modoTodos,
  ubicaciones,
  activoId,
  activoNombre,
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
  /** true = viendo el combinado de todos los locales (default con >1 local). */
  modoTodos: boolean;
  ubicaciones: Cliente[];
  activoId: string;
  activoNombre: string;
  codigoAcceso: string;
  comercioId: string;
  autoResponderPositivas: boolean;
  autoResponderUmbral: 4 | 5;
  tonoMarca: TonoMarca;
}) {
  const hayVarios = ubicaciones.length > 1;
  return (
    <>
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
          <GestionResenas resenasIniciales={resenasPendientes} tonoMarca={tonoMarca} codigo={codigoAcceso} />
        </div>
      </Card>

      {personalEmpleados.length > 0 && (
        <Card variant="glass" className="mt-4">
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
