import "server-only";
import { sql } from "../sql";
import { enviarResumenMensual, enviarResumenSemanal } from "../alertas";
import { armarResumenSemanal, type ResumenSemanal } from "../resumen-semanal";
import { armarInformeSemanal } from "../informe-semanal";
import { armarTablero } from "../tablero";
import { businessProfileHabilitado } from "../gbp";
import {
  completarBase,
  seguimientoDesdeBase,
  type BaseSeguimiento,
  type EstadoActual,
} from "../seguimiento-competencia";
import type { Cliente } from "../types";
import { getAjuste, setAjuste } from "./ajustes";
import { sanearHistorico } from "../historico";
import { entradaTablero, getConclusionesComercio } from "./conclusiones";
import { getCliente } from "./clientes";
import { getCompetidores } from "./competencia";

// ---------- Resumen mensual por email ----------

/** Manda el resumen mensual a cada comercio activo que cargó un email de
 * notificaciones. Se llama una vez al mes desde el cron diario (chequeando
 * el día del mes ahí, no acá) — si el cron falla justo ese día, no hay
 * reintento automático hasta el mes que viene; aceptable para un resumen,
 * no para una alerta urgente (esas van por evento, no por fecha). */
export async function enviarResumenesMensuales(): Promise<{ total: number; enviados: number }> {
  const rows = await sql`
    SELECT id FROM comercios WHERE estado = 'activo' AND email_notificaciones != ''
  `;
  let enviados = 0;
  for (const row of rows) {
    const cliente = await getCliente(row.id as string);
    if (cliente && (await enviarResumenMensual(cliente))) enviados += 1;
  }
  return { total: rows.length, enviados };
}

// La competencia "de la semana": cada lunes, al mandar el informe, se guarda
// en `ajustes` una foto del total de reseñas y la calificación del comercio
// y de cada competidor; el lunes siguiente se compara contra esa foto. Sin
// cambio de esquema (mismo mecanismo que lib/seguimiento-competencia.ts).
const claveBaseSemanal = (id: string) => `informe_semanal_base:${id}`;

async function estadoCompetencia(cliente: Cliente): Promise<EstadoActual> {
  const competidores = await getCompetidores(cliente.id);
  return {
    propio: { total: cliente.resenasGoogle, rating: cliente.ratingGoogle },
    competidores: competidores.map((c) => ({ id: c.id, nombre: c.nombre, total: c.totalResenas, rating: c.rating })),
  };
}

async function leerBaseSemanal(id: string): Promise<BaseSeguimiento | null> {
  const guardado = await getAjuste(claveBaseSemanal(id));
  if (!guardado) return null;
  try {
    return JSON.parse(guardado) as BaseSeguimiento;
  } catch {
    return null; // valor corrupto: arranca de nuevo con la foto de hoy
  }
}

function fechaHoy(hoy: Date): string {
  return new Date(hoy.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

/** Resumen de la semana de un comercio (null si no hay nada que contar).
 * Solo lee: la foto de la competencia la guarda quien manda el mail. */
export async function getResumenSemanal(cliente: Cliente, hoy = new Date()): Promise<ResumenSemanal | null> {
  const [{ conclusiones, datos }, actual, base] = await Promise.all([
    getConclusionesComercio(cliente, hoy),
    estadoCompetencia(cliente),
    leerBaseSemanal(cliente.id),
  ]);
  const saneado = { ...cliente, historico: sanearHistorico(cliente.historico) };
  const tablero = armarTablero(entradaTablero(saneado, datos, 7, hoy));
  const meta = conclusiones.meta;
  const informe = armarInformeSemanal({
    tablero,
    resenas: datos.resenas.map((r) => ({
      fecha: r.fecha,
      estrellas: r.estrellas,
      deGoogle: r.origenGoogleId !== null,
      respondida: r.respuestaPublicada || r.estado === "respondida",
      automatica: r.publicadaAutomaticamente,
    })),
    competencia: base ? seguimientoDesdeBase(base, actual, fechaHoy(hoy)) : null,
    competidoresCargados: actual.competidores.filter((c) => c.total !== null).length,
    mostrarRendimientoGoogle: businessProfileHabilitado(),
    meta: meta ? `Tu calificación es ${meta.actual}★: te faltan ${meta.faltan} de 5★ para el ${meta.siguiente}.` : null,
    hoy,
  });
  const resumen = armarResumenSemanal({
    nombre: cliente.nombre,
    conclusiones,
    resenas: datos.resenas.map((r) => ({ fecha: r.fecha, estrellas: r.estrellas, deGoogle: r.origenGoogleId !== null })),
    taps: datos.taps,
    hoy,
  });
  if (!resumen && !informe) return null;
  return { ...(resumen ?? { nombre: cliente.nombre, numeros: [], destacado: null, tarea: null }), informe };
}

/** Foto de hoy de la competencia, para comparar el lunes que viene. */
async function guardarBaseSemanal(cliente: Cliente, hoy: Date): Promise<void> {
  const { base } = completarBase(null, await estadoCompetencia(cliente), fechaHoy(hoy));
  await setAjuste(claveBaseSemanal(cliente.id), JSON.stringify(base));
}

/** Manda "Tu semana en Google" a cada comercio activo con email cargado.
 * Se marca en `ajustes` para que un reintento del cron el mismo día no lo
 * mande dos veces. Un comercio que falla no frena a los demás. */
export async function enviarResumenesSemanales(): Promise<{ total: number; enviados: number; sinNovedades: number }> {
  const rows = await sql`
    SELECT id FROM comercios WHERE estado = 'activo' AND email_notificaciones != ''
  `;
  let enviados = 0;
  let sinNovedades = 0;
  const hoy = new Date();
  for (const row of rows) {
    const id = row.id as string;
    try {
      const clave = `resumen_semanal:${id}`;
      const ultimo = await getAjuste(clave);
      if (ultimo && hoy.getTime() - new Date(ultimo).getTime() < 6 * 86_400_000) continue;
      const cliente = await getCliente(id);
      if (!cliente) continue;
      const resumen = await getResumenSemanal(cliente, hoy);
      if (!resumen) {
        sinNovedades += 1;
        continue;
      }
      if (await enviarResumenSemanal(cliente, resumen)) {
        await setAjuste(clave, hoy.toISOString());
        await guardarBaseSemanal(cliente, hoy);
        enviados += 1;
      }
    } catch (e) {
      console.error(`Resumen semanal de ${id}:`, e instanceof Error ? e.message : e);
    }
  }
  return { total: rows.length, enviados, sinNovedades };
}
