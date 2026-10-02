import "server-only";

// Cliente mínimo de las APIs de Google Business Profile:
// - Account Management + Business Information: para listar las fichas que
//   administra la cuenta conectada y matchearlas con nuestros comercios
//   por place_id (así nadie tiene que copiar IDs raros a mano).
// - Performance: visitas al perfil (impresiones), llamadas y clics en
//   "cómo llegar" del mes. Google publica estos datos con unos días de
//   retraso, así que el número del mes en curso siempre corre un poco
//   detrás de la realidad.

/** Visitas al perfil, llamadas y "cómo llegar" salen de la Business Profile
 * Performance API, que Google todavía no nos aprobó: la cuota está en 0 y
 * todo pedido responde 429. Mientras tanto no se muestran en ningún lado (un
 * 0 fijo le hace creer al cliente que nadie lo vio) y el cron no las pide.
 * El día que llegue la aprobación: GOOGLE_BUSINESS_PROFILE_HABILITADO=true
 * en Vercel (Production) y redeploy — no hace falta tocar código. */
export function businessProfileHabilitado(): boolean {
  return process.env.GOOGLE_BUSINESS_PROFILE_HABILITADO === "true";
}

export interface UbicacionGBP {
  location: string; // resource name, ej. "locations/1234567890"
  placeId: string;
  titulo: string;
}

export async function listarUbicaciones(accessToken: string): Promise<UbicacionGBP[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const accRes = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers, cache: "no-store" },
  );
  if (!accRes.ok) {
    console.error(`GBP accounts respondió ${accRes.status}`);
    return [];
  }
  const accData = (await accRes.json()) as { accounts?: { name: string }[] };

  const ubicaciones: UbicacionGBP[] = [];
  for (const account of accData.accounts ?? []) {
    let pageToken = "";
    // cap defensivo de páginas: 100 fichas por página alcanza de sobra
    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({
        readMask: "name,title,metadata",
        pageSize: "100",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params}`,
        { headers, cache: "no-store" },
      );
      if (!locRes.ok) {
        console.error(`GBP locations respondió ${locRes.status}`);
        break;
      }
      const locData = (await locRes.json()) as {
        locations?: { name: string; title?: string; metadata?: { placeId?: string } }[];
        nextPageToken?: string;
      };
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

export interface RendimientoMes {
  visitas: number; // impresiones en Maps + Búsqueda (desktop + mobile)
  llamadas: number;
  comoLlegar: number;
}

const METRICAS_VISITAS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
];

export async function rendimientoDelMes(
  accessToken: string,
  location: string,
  anio: number,
  mes: number, // 1-12
): Promise<RendimientoMes | null> {
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
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!res.ok) {
    console.error(`GBP performance respondió ${res.status} para ${location}`);
    return null;
  }

  const data = (await res.json()) as {
    multiDailyMetricTimeSeries?: {
      dailyMetricTimeSeries?: {
        dailyMetric?: string;
        timeSeries?: { datedValues?: { value?: string }[] };
      }[];
    }[];
  };

  const totales = new Map<string, number>();
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
