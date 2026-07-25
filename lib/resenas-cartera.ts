import { metricaActual, metricaAnterior, type Cliente } from "./types";

// Totales de reseñas de TODA la cartera (cuenta + sucursales), no de un
// solo local. Todo sale de `historico` (snapshot mensual ya sincronizado
// de Google), que cada sucursal trae en memoria sin costo extra — cero
// consultas nuevas a la base. "Este mes"/"mes pasado" usan el mismo
// criterio que ya usa el resto del portal: el último/anteúltimo snapshot
// cargado, no un match estricto contra el mes calendario — si el sync de
// un local todavía no corrió este mes, "este mes" para ese local sigue
// siendo su último dato real, igual que en el resto de la app.

export interface ResumenSucursalReseñas {
  sucursalId: string;
  nombre: string;
  /** Acumulado actual — dato real si hay snapshot mensual, si no el rating/reseñas en vivo de Google Places. */
  total: number;
  /** `resenasNuevas` del último mes cargado para esta sucursal. */
  nuevasEsteMes: number;
}

export interface ResumenCarteraReseñas {
  total: number;
  nuevasEsteMes: number;
  /** `resenasNuevas` del penúltimo mes cargado, sumado solo entre sucursales que tienen ese dato. */
  nuevasMesPasado: number;
  /** `resenasTotal` al cierre del mes anterior. Sucursales sin ese snapshot NO suman 0 acá — se excluyen, para no mostrar un total falso por debajo del real. */
  totalMesPasado: number;
  /** Suma de `resenasNuevas` de todos los meses cuyo string de mes ("YYYY-MM") empieza con el año calendario anterior al de `ahora`. */
  nuevasAñoPasado: number;
  porSucursal: ResumenSucursalReseñas[];
}

function totalResenasActual(s: Cliente): number {
  const m = metricaActual(s);
  return m ? m.resenasTotal : (s.resenasGoogle ?? 0);
}

export function resumenReseñasCartera(
  ubicaciones: Cliente[],
  ahora: Date = new Date(),
): ResumenCarteraReseñas {
  const añoPasado = String(ahora.getFullYear() - 1);

  const porSucursal: ResumenSucursalReseñas[] = ubicaciones.map((s) => ({
    sucursalId: s.id,
    nombre: s.nombre,
    total: totalResenasActual(s),
    nuevasEsteMes: metricaActual(s)?.resenasNuevas ?? 0,
  }));

  let totalMesPasado = 0;
  let nuevasMesPasado = 0;
  let nuevasAñoPasado = 0;
  for (const s of ubicaciones) {
    const anterior = metricaAnterior(s);
    if (anterior) {
      totalMesPasado += anterior.resenasTotal;
      nuevasMesPasado += anterior.resenasNuevas;
    }
    nuevasAñoPasado += s.historico
      .filter((h) => h.mes.startsWith(añoPasado))
      .reduce((acc, h) => acc + h.resenasNuevas, 0);
  }

  return {
    total: porSucursal.reduce((acc, s) => acc + s.total, 0),
    nuevasEsteMes: porSucursal.reduce((acc, s) => acc + s.nuevasEsteMes, 0),
    nuevasMesPasado,
    totalMesPasado,
    nuevasAñoPasado,
    porSucursal,
  };
}
