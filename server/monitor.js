const WEBHOOK = process.env.MONITOR_WEBHOOK_URL;
const TIMEOUT_MS = 3000;

function textoDelError(e) {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

async function notificar(titulo, texto) {
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
    /* no romper el flujo */
  }
}

async function reportarFalla(origen, error, datos) {
  const detalle = textoDelError(error);
  console.error(`[${origen}]`, detalle, datos ?? "");
  if (!WEBHOOK) return;
  const contexto = datos
    ? Object.entries(datos)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ MetricsField · *${origen}*\n${detalle}${contexto ? `\n${contexto}` : ""}`,
      }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
  } catch {
    /* no romper el flujo */
  }
}

module.exports = { notificar, reportarFalla };
