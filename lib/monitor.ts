import "server-only";

// Reporte de fallas a un canal que alguien mira de verdad.
//
// El problema que resuelve: en Vercel serverless, un console.error se pierde
// salvo que justo alguien esté mirando los logs. El cron diario corre a la
// madrugada — si la sincronización con Google se cae, o el SMTP deja de
// andar, nadie se entera hasta que un cliente pregunta por qué su panel está
// congelado hace una semana.
//
// Sin dependencias ni SDK: manda un POST a un webhook (sirve el de Slack, el
// de Discord, o cualquier endpoint propio). Sin MONITOR_WEBHOOK_URL cargada
// se comporta igual que antes (solo console.error), así que en desarrollo y
// en un deploy sin la variable no cambia nada.
//
// Nunca lanza excepción: si el reporte falla, el error original ya se
// escribió por consola y la falla del monitoreo no puede tumbar el request
// que lo llamó.

const WEBHOOK = process.env.MONITOR_WEBHOOK_URL;

/** Cuánto esperamos al webhook antes de rendirnos. Corto a propósito: esto
 * corre dentro de un request/cron con presupuesto de tiempo acotado. */
const TIMEOUT_MS = 3000;

function textoDelError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

/**
 * Aviso operativo al mismo webhook, para cosas que NO son fallas del sistema
 * sino situaciones que alguien del equipo tiene que atender (por ejemplo, un
 * cliente al que se le venció el permiso de Google). Se separa de
 * reportarFalla para que un aviso de rutina no se lea como si algo se hubiera
 * roto, y para poder filtrarlos distinto en el canal.
 *
 * No meter secretos acá: esto sale de la aplicación hacia el webhook.
 */
export async function notificar(titulo: string, texto: string): Promise<void> {
  console.info(`[aviso] ${titulo}: ${texto}`);
  if (!WEBHOOK) return;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🔔 MetricsField · *${titulo}*\n${texto}` }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
  } catch {
    // Igual que en reportarFalla: si no podemos avisar, no rompemos el flujo.
  }
}

/**
 * Registra una falla y, si hay webhook configurado, la reporta.
 *
 * @param origen  De dónde viene, para poder filtrar después. Ej: "cron/sync-google".
 * @param error   El error atrapado, o un string descriptivo.
 * @param datos   Contexto extra (id de comercio, status HTTP, etc.). No metas
 *                secretos acá: esto sale de la aplicación hacia el webhook.
 */
export async function reportarFalla(
  origen: string,
  error: unknown,
  datos?: Record<string, string | number | null>,
): Promise<void> {
  const detalle = textoDelError(error);
  // El log local queda SIEMPRE, haya webhook o no — es el comportamiento
  // que ya existía y lo que se ve en los logs de Vercel.
  console.error(`[${origen}]`, detalle, datos ?? "");

  if (!WEBHOOK) return;

  const contexto = datos
    ? Object.entries(datos)
        .map(([k, v]) => `${k}=${v}`)
        .join(" · ")
    : "";

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ MetricsField · *${origen}*\n${detalle}${contexto ? `\n\`${contexto}\`` : ""}`,
      }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
  } catch {
    // Si no podemos avisar, no hay nada más que hacer — y sobre todo, no
    // rompemos el flujo que nos llamó.
  }
}
