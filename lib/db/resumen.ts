import "server-only";
import { sql } from "../sql";
import { enviarResumenMensual, enviarResumenSemanal } from "../alertas";
import { armarResumenSemanal, type ResumenSemanal } from "../resumen-semanal";
import type { Cliente } from "../types";
import { getAjuste, setAjuste } from "./ajustes";
import { getConclusionesComercio } from "./conclusiones";
import { getCliente } from "./clientes";

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

/** Resumen de la semana de un comercio (null si no hay nada que contar). */
export async function getResumenSemanal(cliente: Cliente, hoy = new Date()): Promise<ResumenSemanal | null> {
  const { conclusiones, datos } = await getConclusionesComercio(cliente, hoy);
  return armarResumenSemanal({
    nombre: cliente.nombre,
    conclusiones,
    resenas: datos.resenas.map((r) => ({ fecha: r.fecha, estrellas: r.estrellas, deGoogle: r.origenGoogleId !== null })),
    taps: datos.taps,
    hoy,
  });
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
        enviados += 1;
      }
    } catch (e) {
      console.error(`Resumen semanal de ${id}:`, e instanceof Error ? e.message : e);
    }
  }
  return { total: rows.length, enviados, sinNovedades };
}
