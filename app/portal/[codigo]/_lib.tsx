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

// Link para elegir un local: siempre manda a la sección "Mis Sucursales"
// (hash incluido) — esta es una page.tsx server component, así que cada
// click es una navegación de página completa; sin el hash, PortalShell
// arrancaría de nuevo en Resumen en vez de quedarse en el detalle.
export function hrefSucursal(codigoAcceso: string, cuentaId: string, s: { id: string }): string {
  const base = s.id === cuentaId ? `/portal/${codigoAcceso}` : `/portal/${codigoAcceso}?sucursal=${s.id}`;
  return `${base}#sucursales`;
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
// relacionado con "cómo va mi negocio" (locales, dispositivos, escaneos,
// rating de Google, competencia, resumen del mes) vive junto adentro de
// "Mi Negocio" — Personal se mudó adentro de Reseñas (son menciones de
// reseñas) — y Ayuda ya no ocupa un ítem propio: el botón de WhatsApp del
// header alcanza.
export function construirNav({
  resenasPendientes,
  sucursales,
  ubicaciones,
}: {
  resenasPendientes: number;
  sucursales: number;
  ubicaciones: number;
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
        {
          type: "leaf",
          id: "sucursales",
          label: "Sucursales",
          icon: <IconBuilding size={16} />,
          badge:
            sucursales === 0 ? (
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                Pronto
              </span>
            ) : (
              // Total de locales (cuenta + sucursales), no solo las
              // sucursales hijas — mismo número que "Rendimiento · N
              // locales" en Resumen.
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                {ubicaciones}
              </span>
            ),
        },
        { type: "leaf", id: "dispositivos", label: "Dispositivos", icon: <IconDevice size={16} /> },
        { type: "leaf", id: "escaneos", label: "Escaneos", icon: <IconWave size={16} /> },
        { type: "leaf", id: "rating", label: "Mi Rating en Google", icon: <IconStarNav size={16} /> },
        { type: "leaf", id: "competidores", label: "Competidores", icon: <IconSearch size={16} /> },
        { type: "leaf", id: "mes", label: "Resumen del mes", icon: <IconActivity size={16} /> },
      ],
    },
  ];
}
