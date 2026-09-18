import type { Cliente } from "@/lib/types";
import { metricaActual } from "@/lib/types";
import { IconWave } from "@/components/ui";
import {
  IconGrid,
  IconStarNav,
  IconBuilding,
  IconDevice,
  IconActivity,
  IconSearch,
  type PortalNavEntry,
} from "@/components/portal/PortalShell";

// Helpers puros y datos estáticos del portal del cliente, separados de
// page.tsx para que el Server Component se quede solo con la orquestación
// (fetch de datos + armado de props). Nada de lo que hay acá toca
// cookies/headers/DB: son funciones sobre datos que page.tsx ya cargó.

export function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

// Link para elegir un local puntual: siempre manda al Resumen de ESE local
// (hash incluido) — esta es una page.tsx server component, así que cada
// click es una navegación de página completa; sin el hash, PortalShell
// arrancaría siempre en el panel por default. Elegir un local debe llevar
// directo a su resumen (con el selector de locales arriba de todo para
// poder saltar a otro sin ir y volver a la pestaña Sucursales) en vez de
// dejarte parado en la pestaña Sucursales viendo una sola tarjeta. Todo
// local (incluida la cuenta raíz) usa ?sucursal=<id> — sin eso, no hay
// forma de distinguir "quiero ver la cuenta raíz sola" de "quiero el
// combinado de todos" (ver hrefTodos).
export function hrefSucursal(codigoAcceso: string, s: { id: string }): string {
  return `/portal/${codigoAcceso}?sucursal=${s.id}#resumen`;
}

// Vuelve a la vista combinada (todos los locales sumados) — es el estado
// por defecto del portal cuando el cliente tiene más de un local.
export function hrefTodos(codigoAcceso: string): string {
  return `/portal/${codigoAcceso}#resumen`;
}

// Hero de calificación de un local: preferimos el snapshot mensual (misma
// fuente que el histórico, así el delta compara peras con peras); si
// todavía no se cargó ningún mes, mostramos el dato en vivo de Google
// Places como piso. Se usa tanto para el local activo como para cada
// tarjeta de la fila "Tus sucursales".
export function heroDeCalificacion(s: Cliente): {
  rating: number | null;
  totalResenas: number;
  deltaRating: number | null;
  deltaResenas: number | null;
} {
  const m = metricaActual(s);
  const rating = m ? m.ratingPromedio : s.ratingGoogle;
  const totalResenas = m ? m.resenasTotal : (s.resenasGoogle ?? 0);
  const primerHistorico = s.historico[0] ?? null;
  const hayDelta = Boolean(m && primerHistorico && s.historico.length >= 2);
  return {
    rating,
    totalResenas,
    deltaRating: hayDelta ? m!.ratingPromedio - primerHistorico!.ratingPromedio : null,
    deltaResenas: hayDelta ? m!.resenasTotal - primerHistorico!.resenasTotal : null,
  };
}

// Portal del cliente: acceso por código privado, solo lectura, solo SUS
// datos. Es la cara visible del servicio mensual — lo que el cliente paga
// por ver. Sin navegación del panel interno.
export const MENSAJE_GOOGLE: Record<string, { texto: string; tono: "ok" | "error" }> = {
  conectado: { texto: "Conectaste tu cuenta de Google. En un rato vas a ver visitas y llamadas acá.", tono: "ok" },
  error: { texto: "No se pudo conectar — probá de nuevo.", tono: "error" },
  cancelado: { texto: "Cancelaste la conexión con Google.", tono: "error" },
  "no-configurado": { texto: "Esta función todavía no está disponible.", tono: "error" },
};

// Menú simplificado: 3 secciones reales (antes eran 9). Todo lo
// relacionado con "cómo va mi negocio" (dispositivos, escaneos, rating de
// Google, competencia, resumen del mes) vive junto adentro de "Mi Negocio"
// — Personal se mudó adentro de Reseñas (son menciones de reseñas) — y
// Ayuda ya no ocupa un ítem propio: el botón de WhatsApp del header
// alcanza. "Sucursales" se sacó del menú: elegir un local puntual ya se
// hace desde el selector de chips que vive arriba de Resumen y de Reseñas
// (ver SelectorSucursales) — la pestaña aparte solo repetía una sola
// tarjeta sin agregar nada que esas dos no tuvieran ya.
export function construirNav({
  resenasPendientes,
}: {
  resenasPendientes: number;
}): PortalNavEntry[] {
  return [
    { type: "leaf", id: "resumen", label: "Resumen", icon: <IconGrid size={18} /> },
    {
      type: "leaf",
      id: "resenas",
      label: "Reseñas",
      icon: <IconStarNav size={18} />,
      badge:
        resenasPendientes > 0 ? (
          <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {resenasPendientes}
          </span>
        ) : undefined,
    },
    {
      type: "group",
      id: "negocio",
      label: "Mi Negocio",
      icon: <IconBuilding size={18} />,
      items: [
        { type: "leaf", id: "dispositivos", label: "Dispositivos", icon: <IconDevice size={16} /> },
        { type: "leaf", id: "escaneos", label: "Escaneos", icon: <IconWave size={16} /> },
        { type: "leaf", id: "rating", label: "Mi Rating en Google", icon: <IconStarNav size={16} /> },
        { type: "leaf", id: "competidores", label: "Competidores", icon: <IconSearch size={16} /> },
        { type: "leaf", id: "mes", label: "Resumen del mes", icon: <IconActivity size={16} /> },
      ],
    },
  ];
}
