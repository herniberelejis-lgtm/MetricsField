import type { Cliente, ResenaCRM, TonoMarca } from "@/lib/types";
import type { MencionEmpleado } from "@/lib/empleados";
import { Card } from "@/components/ui";
import MencionesEmpleados from "@/components/MencionesEmpleados";
import { resenasApiHabilitada } from "@/lib/google-reviews";
import GestionResenas from "@/components/GestionResenas";
import AutomatizacionResenas from "@/components/AutomatizacionResenas";
import ResumenResenas, { type ResumenResenasData } from "@/components/ResumenResenas";
import { hrefTodos } from "../_lib";
import SelectorSucursales from "./SelectorSucursales";
import ResenasGoogle, { type LocalConResenasGoogle } from "@/components/portal/ResenasGoogle";

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
function Encabezado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold text-slate-900">{titulo}</h2>
      <p className="mt-0.5 max-w-prose text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

export default function PanelResenas({
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
  hayResenasDetalladas,
  resenasGoogle,
}: {
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
  /** Hay reseñas completas (API de reseñas aprobada o cargadas a mano). */
  hayResenasDetalladas: boolean;
  /** Reseñas públicas de Places, solo cuando NO hay detalladas. null = sin
   * ficha vinculada (sin place_id) o sin API key. */
  resenasGoogle: LocalConResenasGoogle[] | null;
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
          <p className="text-sm text-slate-600">
            Viendo:{" "}
            <span className="font-semibold text-slate-800">
              {modoTodos ? `todos tus locales (${ubicaciones.length})` : activoNombre}
            </span>
            {!modoTodos && (
              <>
                {" — "}
                <a href={hrefTodos(codigoAcceso)} className="font-medium text-[#1F4E80] hover:underline">
                  ver todos combinados
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {!hayResenasDetalladas ? (
        // Sin la API de reseñas aprobada (ni reseñas cargadas a mano), lo
        // único automático y real son las que Google muestra en la ficha.
        <section className="flex flex-col gap-4">
          <Encabezado titulo="Tus reseñas en Google">
            Las que Google muestra en tu ficha (hasta 5 por local, elegidas por Google). Para cada una te sugerimos
            una respuesta: copiala y pegala en Google. Cuando Google apruebe la conexión completa, vas a ver todas
            acá y responderlas sin salir del portal.
          </Encabezado>
          {resenasGoogle ? (
            <ResenasGoogle locales={resenasGoogle} tonoMarca={tonoMarca} />
          ) : (
            <Card variant="glass">
              <p className="text-sm text-slate-700">
                Todavía no está vinculada tu ficha de Google. Escribinos por WhatsApp y la dejamos lista.
              </p>
            </Card>
          )}
        </section>
      ) : (
        // Sin tarjetas dentro de tarjetas (DESIGN.md §4): cada pieza es su
        // propia tarjeta y el encabezado de la sección va suelto.
        <section className="flex flex-col gap-4">
          <div className={`grid grid-cols-1 gap-4 ${resenasApiHabilitada() ? "lg:grid-cols-2" : ""}`}>
            <ResumenResenas data={resumenResenas} variant="glass" />
            {resenasApiHabilitada() && (
              <AutomatizacionResenas
                codigo={codigoAcceso}
                comercioId={comercioId}
                activa={autoResponderPositivas}
                umbral={autoResponderUmbral}
                apiHabilitada
                resenasAutomaticas={resenasAutomaticas}
              />
            )}
          </div>
          <Encabezado titulo="Para responder">
            Te sugerimos una respuesta para cada reseña: la editás si querés y la aprobás. Si ya tenemos acceso a tu
            ficha, se publica sola en Google; si no, la copiamos para que la pegues vos.
          </Encabezado>
          <GestionResenas resenasIniciales={resenasPendientes} tonoMarca={tonoMarca} codigo={codigoAcceso} />
        </section>
      )}

      {personalEmpleados.length > 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <Encabezado titulo="Tu equipo">
            Cada persona con tarjeta propia: sus toques (dato exacto) y las reseñas que la nombran en el texto
            (señal, no atribución exacta).
          </Encabezado>
          <MencionesEmpleados menciones={personalEmpleados} />
        </section>
      )}
    </>
  );
}
