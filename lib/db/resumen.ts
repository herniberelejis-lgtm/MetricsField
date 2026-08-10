import "server-only";
import { sql } from "../sql";
import { enviarResumenMensual } from "../alertas";
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
