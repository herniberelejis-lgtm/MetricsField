const { sql } = require("../sql");
const { getCliente } = require("./clientes");

async function guardarMetrica(id, m) {
  await sql`
    INSERT INTO metricas_mensuales (
      comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio,
      visitas_perfil, llamadas, clics_como_llegar,
      citas_chatgpt, citas_copilot, citas_perplexity
    ) VALUES (
      ${id}, ${m.mes}, ${m.resenasNuevas}, ${m.resenasTotal}, ${m.ratingPromedio},
      ${m.visitasPerfil}, ${m.llamadas}, ${m.clicsComoLlegar},
      ${m.citasChatGPT ?? null}, ${m.citasCopilot ?? null}, ${m.citasPerplexity ?? null}
    )
    ON CONFLICT (comercio_id, mes) DO UPDATE SET
      resenas_nuevas = EXCLUDED.resenas_nuevas,
      resenas_total = EXCLUDED.resenas_total,
      rating_promedio = EXCLUDED.rating_promedio,
      visitas_perfil = EXCLUDED.visitas_perfil,
      llamadas = EXCLUDED.llamadas,
      clics_como_llegar = EXCLUDED.clics_como_llegar,
      citas_chatgpt = EXCLUDED.citas_chatgpt,
      citas_copilot = EXCLUDED.citas_copilot,
      citas_perplexity = EXCLUDED.citas_perplexity
  `;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

async function eliminarMetrica(id, mes) {
  await sql`DELETE FROM metricas_mensuales WHERE comercio_id = ${id} AND mes = ${mes}`;
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

module.exports = { guardarMetrica, eliminarMetrica };
