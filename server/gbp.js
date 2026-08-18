const METRICAS_VISITAS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
];

async function listarUbicaciones(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers,
  });
  if (!accRes.ok) {
    console.error(`GBP accounts respondió ${accRes.status}`);
    return [];
  }
  const accData = await accRes.json();
  const ubicaciones = [];

  for (const account of accData.accounts ?? []) {
    let pageToken = "";
    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({
        readMask: "name,title,metadata",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params}`,
        { headers },
      );
      if (!locRes.ok) break;
      const locData = await locRes.json();
      for (const l of locData.locations ?? []) {
        ubicaciones.push({
          location: l.name,
          placeId: l.metadata?.placeId ?? "",
          titulo: l.title ?? "",
        });
      }
      pageToken = locData.nextPageToken ?? "";
      if (!pageToken) break;
    }
  }
  return ubicaciones;
}

async function rendimientoDelMes(accessToken, location, anio, mes) {
  const hoy = new Date();
  const params = new URLSearchParams();
  for (const m of [...METRICAS_VISITAS, "CALL_CLICKS", "BUSINESS_DIRECTION_REQUESTS"]) {
    params.append("dailyMetrics", m);
  }
  params.set("dailyRange.startDate.year", String(anio));
  params.set("dailyRange.startDate.month", String(mes));
  params.set("dailyRange.startDate.day", "1");
  params.set("dailyRange.endDate.year", String(hoy.getFullYear()));
  params.set("dailyRange.endDate.month", String(hoy.getMonth() + 1));
  params.set("dailyRange.endDate.day", String(hoy.getDate()));

  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    console.error(`GBP performance respondió ${res.status} para ${location}`);
    return null;
  }

  const data = await res.json();
  const totales = new Map();
  for (const grupo of data.multiDailyMetricTimeSeries ?? []) {
    for (const serie of grupo.dailyMetricTimeSeries ?? []) {
      const suma = (serie.timeSeries?.datedValues ?? []).reduce(
        (acc, v) => acc + Number(v.value ?? 0),
        0,
      );
      totales.set(serie.dailyMetric ?? "", suma);
    }
  }

  return {
    visitas: METRICAS_VISITAS.reduce((acc, m) => acc + (totales.get(m) ?? 0), 0),
    llamadas: totales.get("CALL_CLICKS") ?? 0,
    comoLlegar: totales.get("BUSINESS_DIRECTION_REQUESTS") ?? 0,
  };
}

module.exports = { listarUbicaciones, rendimientoDelMes };
