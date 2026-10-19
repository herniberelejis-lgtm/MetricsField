import "server-only";
import { armarConclusiones, DIAS_ANALISIS, type Conclusiones, type EntradaConclusiones } from "../conclusiones";
import { comparativaMensual } from "../comparativa-competencia";
import { sanearHistorico } from "../historico";
import type { Cliente, ResenaCRM } from "../types";
import { getBenchmarkMensual } from "./competencia";
import { getBusquedas, getMetricasDiarias, type BusquedaGuardada, type DiaRendimiento } from "./google-sync";
import { getLinks, getPrimerToque, getTapsDetalle, type TapDetalle } from "./links";
import { getResenas } from "./resenas";

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
  const [taps, resenas, links, benchmark, diarias, busquedas, primerToque] = await Promise.all([
    getTapsDetalle(cliente.id, DIAS_ANALISIS),
    getResenas(cliente.id),
    getLinks(cliente.id),
    getBenchmarkMensual(cliente.id),
    getMetricasDiarias(cliente.id, DIAS_ANALISIS),
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
