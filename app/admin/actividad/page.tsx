import type { Metadata } from "next";
import { getAuditoria } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Actividad" };
export const dynamic = "force-dynamic";

const ETIQUETAS_ACCION: Record<string, string> = {
  login: "Inició sesión",
  crear_cliente: "Creó cliente",
  editar_cliente: "Editó cliente",
  eliminar_cliente: "Eliminó cliente",
  desconectar_google_cliente: "Desconectó Google de un cliente",
  regenerar_codigo_portal: "Regeneró el código de portal",
  eliminar_link: "Eliminó un link NFC",
  eliminar_competidor: "Eliminó un competidor",
  eliminar_prospecto: "Eliminó un prospecto",
  agregar_admin: "Agregó un administrador",
  eliminar_admin: "Quitó un administrador",
  crear_sucursal: "Creó sucursal",
  generar_lote_piezas: "Generó un lote de piezas",
  asignar_pieza_hardware: "Asignó una pieza de hardware",
  // Cobros: la función ya no existe en el código, pero las filas viejas
  // siguen en la auditoría y tienen que leerse en castellano igual.
  registrar_cobro: "Registró un cobro",
  marcar_cobro_pagado: "Marcó un cobro como pagado",
  eliminar_cobro: "Eliminó un cobro",
};

// Red de contención: si mañana alguien agrega una acción y se olvida de
// sumarla al mapa, la pantalla muestra "Asignar pieza hardware" y no el
// identificador crudo de la base.
function etiquetaAccion(accion: string): string {
  const conocida = ETIQUETAS_ACCION[accion];
  if (conocida) return conocida;
  const texto = accion.replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function ActividadPage() {
  const entradas = await getAuditoria(200);

  return (
    <div>
      <PageHeader
        title="Actividad"
        subtitle="Registro de lo que se hizo en el panel — últimas 200 acciones."
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Cuándo</th>
              <th className="px-4 py-3 font-medium">Quién</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {new Date(e.creadoEn).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {e.adminEmail || (
                    <span className="text-slate-400">equipo (sin identificar)</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {etiquetaAccion(e.accion)}
                </td>
                <td className="px-4 py-3 text-slate-500">{e.detalle || "—"}</td>
              </tr>
            ))}
            {entradas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                  Todavía no hay actividad registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
