import { metricaActual, metricaAnterior, type Cliente, type ResenaCRM } from "./types";

// Totales de reseñas de TODA la cartera (cuenta + sucursales), no de un
// solo local. Dos fuentes, cada una para lo que sirve:
//
// - "Hoy" (total acumulado y nuevas de hoy) necesita la fecha exacta de
//   cada reseña — solo está en la tabla `resenas`, así que exige la
//   consulta cruzada `getResenasDeCuenta` (una sola query, no una por
//   sucursal).
// - "Este mes" / "mes pasado" / "año pasado" salen de `historico`
//   (snapshot mensual ya sincronizado de Google), que cada sucursal trae
//   en memoria sin costo extra. Usa `metricaActual`/`metricaAnterior`
//   (el último y anteúltimo mes cargado) — el mismo criterio que ya usa
//   el resto del portal para "este mes", no un match exacto contra el mes
//   calendario: si el sync de un local todavía no corrió este mes, "este
//   mes" para ese local sigue siendo su último dato real, igual que en
//   el resto de la app.

export interface ResumenSucursalReseñas {
  sucursalId: string;
  nombre: string;
  /** Acumulado a hoy — dato real si hay snapshot mensual, si no el rating/reseñas en vivo de Google Places. */
  totalHoy: number;
  /** Reseñas de esta sucursal con fecha de hoy. */
  nuevasHoy: number;
  /** `resenasNuevas` del último mes cargado para esta sucursal (puede no ser el mes calendario si el sync está atrasado). */
  nuevasEsteMes: number;
}

export interface ResumenCarteraReseñas {
  totalHoy: number;
  nuevasHoy: number;
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
  resenasDeCuenta: ResenaCRM[],
  ahora: Date = new Date(),
): ResumenCarteraReseñas {
  const hoyISO = ahora.toISOString().slice(0, 10);
  const añoPasado = String(ahora.getFullYear() - 1);

  const resenasPorSucursal = new Map<string, ResenaCRM[]>();
  for (const r of resenasDeCuenta) {
    const arr = resenasPorSucursal.get(r.comercioId) ?? [];
    arr.push(r);
    resenasPorSucursal.set(r.comercioId, arr);
  }

  const porSucursal: ResumenSucursalReseñas[] = ubicaciones.map((s) => {
    const propias = resenasPorSucursal.get(s.id) ?? [];
    return {
      sucursalId: s.id,
      nombre: s.nombre,
      totalHoy: totalResenasActual(s),
      nuevasHoy: propias.filter((r) => r.fecha === hoyISO).length,
      nuevasEsteMes: metricaActual(s)?.resenasNuevas ?? 0,
    };
  });

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
    totalHoy: porSucursal.reduce((acc, s) => acc + s.totalHoy, 0),
    nuevasHoy: porSucursal.reduce((acc, s) => acc + s.nuevasHoy, 0),
    nuevasEsteMes: porSucursal.reduce((acc, s) => acc + s.nuevasEsteMes, 0),
    nuevasMesPasado,
    totalMesPasado,
    nuevasAñoPasado,
    porSucursal,
  };
}
