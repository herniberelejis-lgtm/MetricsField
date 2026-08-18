const { sql } = require("../sql");
const { fetchGooglePlaceStats } = require("../places");
const { rendimientoDelMes } = require("../gbp");
const { getCliente } = require("./clientes");
const { metricaActual, metricaAnterior } = require("../utils");
const { enviarEmail } = require("../email");
const {
  sincronizarEnLotes,
  accessTokenGBPComercio,
  resolverLocationGBP,
} = require("./sync-shared");
const { getAjuste, setAjuste } = require("./ajustes");
const { notificar } = require("../monitor");

const DIAS_ENTRE_AVISOS = 3;

async function sincronizarGoogle(id) {
  const rows = await sql`SELECT google_place_id FROM comercios WHERE id = ${id}`;
  const placeId = rows[0]?.google_place_id;
  if (!placeId) return false;
  const stats = await fetchGooglePlaceStats(placeId);
  if (!stats) return false;

  await sql`
    UPDATE comercios SET
      rating_google = ${stats.rating},
      resenas_google = ${stats.totalReseñas},
      google_sync_en = now()
    WHERE id = ${id}
  `;

  const mesActual = new Date().toISOString().slice(0, 7);
  const anteriores = await sql`
    SELECT resenas_total FROM metricas_mensuales
    WHERE comercio_id = ${id} AND mes < ${mesActual}
    ORDER BY mes DESC LIMIT 1
  `;
  const totalAnterior = anteriores[0] ? Number(anteriores[0].resenas_total) : stats.totalReseñas;
  const resenasNuevas = Math.max(0, stats.totalReseñas - totalAnterior);

  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio)
    VALUES (${id}, ${mesActual}, ${resenasNuevas}, ${stats.totalReseñas}, ${stats.rating})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio
  `;
  return true;
}

async function sincronizarGoogleTodos() {
  const rows = await sql`SELECT id FROM comercios WHERE google_place_id != '' ORDER BY google_sync_en ASC NULLS FIRST`;
  const ids = rows.map((r) => r.id);
  const resultados = await sincronizarEnLotes(ids, sincronizarGoogle);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

async function sincronizarRendimiento(id) {
  const token = await accessTokenGBPComercio(id);
  if (!token) return false;
  const location = await resolverLocationGBP(id, token);
  if (!location) return false;

  const hoy = new Date();
  const r = await rendimientoDelMes(token, location, hoy.getFullYear(), hoy.getMonth() + 1);
  if (!r) return false;

  const mes = hoy.toISOString().slice(0, 7);
  await sql`
    INSERT INTO metricas_mensuales (comercio_id, mes, visitas_perfil, llamadas, clics_como_llegar)
    VALUES (${id}, ${mes}, ${r.visitas}, ${r.llamadas}, ${r.comoLlegar})
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar
  `;
  return true;
}

async function sincronizarRendimientoTodos() {
  const rows = await sql`SELECT id FROM comercios WHERE google_refresh_token != ''`;
  const ids = rows.map((r) => r.id);
  const resultados = await sincronizarEnLotes(ids, sincronizarRendimiento);
  return { total: ids.length, actualizados: resultados.filter(Boolean).length };
}

async function sincronizarResenasGoogleTodos() {
  if (process.env.GOOGLE_REVIEWS_API_ENABLED !== "true") {
    return { total: 0, nuevas: 0, autoRespondidas: 0 };
  }
  // Reviews API requiere aprobación aparte de Google — port completo pendiente.
  return { total: 0, nuevas: 0, autoRespondidas: 0 };
}

async function avisarGoogleDesconectado() {
  const rows = await sql`
    SELECT id, nombre, contacto FROM comercios
    WHERE google_refresh_token != '' AND estado != 'baja'
  `;

  let avisados = 0;
  const hoy = new Date();

  for (const row of rows) {
    const id = row.id;
    const token = await accessTokenGBPComercio(id);
    if (token) continue;

    const clave = `aviso_gbp_desconectado:${id}`;
    const ultimo = await getAjuste(clave);
    if (ultimo) {
      const dias = (hoy.getTime() - new Date(ultimo).getTime()) / 86_400_000;
      if (dias < DIAS_ENTRE_AVISOS) continue;
    }

    const contacto = row.contacto || "sin WhatsApp cargado";
    await notificar(
      "Se desconectó el Google de un cliente",
      `*${row.nombre}* dejó de tener el permiso activo — su panel no va a actualizar visitas ni llamadas hasta que reconecte.\n` +
        `Escribirle al ${contacto} con el texto de reconexión.`,
    );
    await setAjuste(clave, hoy.toISOString());
    avisados += 1;
  }

  return { revisados: rows.length, avisados };
}

function fmtMes(mes) {
  const [y, m] = mes.split("-");
  const nombres = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${nombres[Number(m) - 1]} ${y}`;
}

async function enviarResumenesMensuales() {
  const rows = await sql`
    SELECT id FROM comercios WHERE estado = 'activo' AND email_notificaciones != ''
  `;
  let enviados = 0;
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  for (const row of rows) {
    const cliente = await getCliente(row.id);
    if (!cliente?.emailNotificaciones) continue;
    const m = metricaActual(cliente);
    if (!m) continue;
    const prev = metricaAnterior(cliente);
    const dResenas = prev ? m.resenasNuevas - prev.resenasNuevas : null;
    const filaDelta =
      dResenas != null && dResenas !== 0
        ? ` (${dResenas >= 0 ? "+" : ""}${dResenas} vs mes anterior)`
        : "";

    const linkPortal = baseUrl ? `${baseUrl}/portal/${cliente.codigoAcceso}#resenas` : null;
    const cuerpo = `
      <p style="font-size:14px;">Así estuvo ${cliente.nombre} en ${fmtMes(m.mes)}:</p>
      <ul style="font-size:14px;padding-left:18px;">
        <li>${m.resenasNuevas} reseñas nuevas${filaDelta} — ${m.resenasTotal} en total</li>
        <li>Rating promedio: ${m.ratingPromedio.toFixed(1)}★</li>
        <li>${m.visitasPerfil} visitas a tu ficha de Google, ${m.llamadas} llamadas</li>
      </ul>
      ${linkPortal ? `<a href="${linkPortal}">Ver en tu portal</a>` : ""}
    `;

    if (
      await enviarEmail({
        to: cliente.emailNotificaciones,
        asunto: `Tu mes en MetricsField — ${cliente.nombre} (${fmtMes(m.mes)})`,
        html: cuerpo,
      })
    ) {
      enviados += 1;
    }
  }

  return { total: rows.length, enviados };
}

module.exports = {
  sincronizarGoogle,
  sincronizarGoogleTodos,
  sincronizarRendimiento,
  sincronizarRendimientoTodos,
  sincronizarResenasGoogleTodos,
  avisarGoogleDesconectado,
  enviarResumenesMensuales,
};
