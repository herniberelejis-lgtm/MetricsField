import "server-only";
import { armarConclusiones, DIAS_ANALISIS, type Conclusiones, type EntradaConclusiones } from "../conclusiones";
import { comparativaMensual } from "../comparativa-competencia";
import { sanearHistorico } from "../historico";
import type { Cliente, ResenaCRM } from "../types";
import { getBenchmarkMensual } from "./competencia";
import { getBusquedas, getMetricasDiarias, type BusquedaGuardada, type DiaRendimiento } from "./google-sync";
import { getLinks, getPrimerToque, getTapsDetalle, type TapDetalle } from "./links";
import { getResenas } from "./resenas";
import type { EntradaTablero, Rango } from "../tablero";

// Arma la entrada de lib/conclusiones.ts para UN comercio. Una sola versión
// para el portal, el resumen del lunes y el admin: si dijeran cosas
// distintas, el cliente dejaría de creerle a las tres.

export interface DatosConclusiones {
  taps: TapDetalle[];
  resenas: ResenaCRM[];
  empleados: string[];
  comparativas: ReturnType<typeof comparativaMensual>;
  diarias: DiaRendimiento[];
  busquedas: BusquedaGuardada[];
  primerToque: string | null;
}

/** `cliente.historico` tiene que venir saneado (lib/historico.ts). */
export function entradaConclusiones(cliente: Cliente, d: DatosConclusiones, hoy = new Date()): EntradaConclusiones {
  return {
    taps: d.taps,
    resenas: d.resenas.map((r) => ({
      id: r.id,
      creadoEn: r.creadoEn,
      fecha: r.fecha,
      estrellas: r.estrellas,
      texto: r.texto,
      deGoogle: r.origenGoogleId !== null,
    })),
    totalGoogle: cliente.resenasGoogle,
    comparativas: d.comparativas,
    empleados: d.empleados,
    hoy,
    diarias: d.diarias,
    busquedas: d.busquedas,
    nombreComercio: cliente.nombre,
    historico: cliente.historico,
    primerToque: d.primerToque,
    googleConectado: Boolean(cliente.googleConectadoEn),
  };
}

/** `cliente.historico` tiene que venir saneado (lib/historico.ts). */
export async function cargarDatosConclusiones(cliente: Cliente): Promise<DatosConclusiones> {
  // El doble de lo que miran las conclusiones: el tablero compara cada
  // período (hasta 90 días) contra el anterior.
  const [taps, resenas, links, benchmark, diarias, busquedas, primerToque] = await Promise.all([
    getTapsDetalle(cliente.id, DIAS_ANALISIS * 2),
    getResenas(cliente.id),
    getLinks(cliente.id),
    getBenchmarkMensual(cliente.id),
    getMetricasDiarias(cliente.id, DIAS_ANALISIS * 2 + 10),
    getBusquedas(cliente.id, 3),
    getPrimerToque(cliente.id),
  ]);
  const mesEnCurso = new Date().toISOString().slice(0, 7);
  return {
    taps,
    resenas,
    empleados: links.map((l) => l.nombreEmpleado),
    comparativas: comparativaMensual(benchmark, cliente.historico, mesEnCurso),
    diarias,
    busquedas,
    primerToque,
  };
}

/** Conclusiones de un comercio, más los datos con que se armaron. */
export async function getConclusionesComercio(
  cliente: Cliente,
  hoy = new Date(),
): Promise<{ conclusiones: Conclusiones; datos: DatosConclusiones }> {
  const saneado = { ...cliente, historico: sanearHistorico(cliente.historico) };
  const datos = await cargarDatosConclusiones(saneado);
  return { conclusiones: armarConclusiones(entradaConclusiones(saneado, datos, hoy)), datos };
}

/** Entrada del tablero del Resumen (lib/tablero.ts), con los mismos datos
 * que las conclusiones. `cliente.historico` tiene que venir saneado. */
export function entradaTablero(cliente: Cliente, d: DatosConclusiones, dias: Rango, hoy = new Date()): EntradaTablero {
  return {
    hoy,
    dias,
    diarias: d.diarias,
    taps: d.taps,
    resenas: d.resenas.map((r) => ({
      id: r.id,
      creadoEn: r.creadoEn,
      fecha: r.fecha,
      estrellas: r.estrellas,
      texto: r.texto,
      deGoogle: r.origenGoogleId !== null,
      respondida: r.respuestaPublicada || r.estado === "respondida",
    })),
    historico: cliente.historico.map((h) => ({
      mes: h.mes,
      resenasNuevas: h.resenasNuevas,
      nuevasSinDato: h.nuevasSinDato,
      ratingPromedio: h.ratingPromedio,
    })),
    primerToque: d.primerToque,
    rating: cliente.ratingGoogle ?? cliente.historico[cliente.historico.length - 1]?.ratingPromedio ?? null,
    totalResenas: cliente.resenasGoogle ?? cliente.historico[cliente.historico.length - 1]?.resenasTotal ?? null,
    busquedas: d.busquedas,
    nombreComercio: cliente.nombre,
    empleados: d.empleados,
    comparativas: d.comparativas,
  };
}
