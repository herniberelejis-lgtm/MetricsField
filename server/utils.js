function limpiarUrl(url) {
  if (!url) return url;
  return url.replace(/[\x00-\x1f\x7f]/g, "").trim();
}

function slugify(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function fechaISO(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function mapMetrica(r) {
  return {
    mes: r.mes,
    resenasNuevas: Number(r.resenas_nuevas),
    resenasTotal: Number(r.resenas_total),
    ratingPromedio: Number(r.rating_promedio),
    visitasPerfil: Number(r.visitas_perfil),
    llamadas: Number(r.llamadas),
    clicsComoLlegar: Number(r.clics_como_llegar),
    citasChatGPT: r.citas_chatgpt === null ? null : Number(r.citas_chatgpt),
    citasCopilot: r.citas_copilot === null ? null : Number(r.citas_copilot),
    citasPerplexity: r.citas_perplexity === null ? null : Number(r.citas_perplexity),
  };
}

function mapClienteRow(row, historico = []) {
  return {
    id: row.id,
    codigoAcceso: row.codigo_acceso,
    nombre: row.nombre,
    rubro: row.rubro,
    zona: row.zona,
    plan: row.plan,
    estado: row.estado,
    contacto: row.contacto,
    fechaAlta: fechaISO(row.fecha_alta),
    googleReviewUrl: row.google_review_url,
    busquedaClave: row.busqueda_clave,
    fee: Number(row.fee),
    tonoMarca: row.tono_marca ?? "cercano",
    googlePlaceId: row.google_place_id ?? "",
    googleLocation: row.google_location ?? "",
    ratingGoogle: row.rating_google === null ? null : Number(row.rating_google),
    resenasGoogle: row.resenas_google === null ? null : Number(row.resenas_google),
    googleSyncEn: row.google_sync_en ? new Date(row.google_sync_en).toISOString() : null,
    googleConectadoEn: row.google_conectado_en
      ? new Date(row.google_conectado_en).toISOString()
      : null,
    autoResponderPositivas: Boolean(row.auto_responder_positivas),
    autoResponderUmbral: Number(row.auto_responder_umbral) === 5 ? 5 : 4,
    resenasSyncEn: row.resenas_sync_en ? new Date(row.resenas_sync_en).toISOString() : null,
    emailNotificaciones: row.email_notificaciones ?? "",
    comercioPadreId: row.comercio_padre_id ?? null,
    historico,
  };
}

function metricaAnterior(cliente) {
  if (!cliente.historico?.length || cliente.historico.length < 2) return null;
  return cliente.historico[cliente.historico.length - 2];
}

function heroDeCalificacion(cliente) {
  const m = metricaActual(cliente);
  const rating = m ? m.ratingPromedio : cliente.ratingGoogle;
  const totalResenas = m ? m.resenasTotal : (cliente.resenasGoogle ?? 0);
  const primerHistorico = cliente.historico[0] ?? null;
  const hayDelta = Boolean(m && primerHistorico && cliente.historico.length >= 2);
  return {
    rating,
    totalResenas,
    deltaRating: hayDelta ? m.ratingPromedio - primerHistorico.ratingPromedio : null,
    deltaResenas: hayDelta ? m.resenasTotal - primerHistorico.resenasTotal : null,
  };
}

function metricaActual(cliente) {
  if (!cliente.historico?.length) return null;
  return cliente.historico[cliente.historico.length - 1];
}

function calcCrecimientoVsCompetencia(benchmark) {
  if (benchmark.length < 2) return null;
  const actual = benchmark[0];
  const anterior = benchmark[1];
  if (actual.propioResenas === null || anterior.propioResenas === null) return null;

  const propio = actual.propioResenas - anterior.propioResenas;
  const propioPct = anterior.propioResenas > 0 ? (propio / anterior.propioResenas) * 100 : null;

  const resenasAnteriorPorNombre = new Map(anterior.competidores.map((c) => [c.nombre, c.totalResenas]));
  let sumaActual = 0;
  let sumaAnterior = 0;
  let pares = 0;
  for (const c of actual.competidores) {
    const prev = resenasAnteriorPorNombre.get(c.nombre);
    if (c.totalResenas === null || prev === null || prev === undefined) continue;
    sumaActual += c.totalResenas;
    sumaAnterior += prev;
    pares += 1;
  }
  const competenciaPct =
    pares > 0 && sumaAnterior > 0 ? ((sumaActual - sumaAnterior) / sumaAnterior) * 100 : null;

  return { mes: actual.mes, propio, propioPct, competenciaPct };
}

module.exports = {
  limpiarUrl,
  slugify,
  fechaISO,
  mapMetrica,
  mapClienteRow,
  metricaActual,
  metricaAnterior,
  heroDeCalificacion,
  calcCrecimientoVsCompetencia,
};
