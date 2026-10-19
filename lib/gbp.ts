import "server-only";

// Cliente mínimo de las APIs de Google Business Profile:
// - Account Management + Business Information: para listar las fichas que
//   administra la cuenta conectada y matchearlas con nuestros comercios
//   por place_id (así nadie tiene que copiar IDs raros a mano).
// - Performance: visitas al perfil (impresiones), llamadas y clics en
//   "cómo llegar" del mes. Google publica estos datos con unos días de
//   retraso, así que el número del mes en curso siempre corre un poco
//   detrás de la realidad.

/** Interruptor de las APIs de Business Profile (Performance: visitas,
 * llamadas y "cómo llegar"; Account Management y Business Information:
 * vincular la ficha). Google aprobó el proyecto (cuota por defecto 300 QPM);
 * el interruptor sigue existiendo para poder apagarlo si una API falla o se
 * agota la cuota, sin tocar código. Apagado, el cron no las pide y ningún
 * panel muestra un 0 fijo que le haga creer al cliente que nadie lo vio.
 * Se prende con GOOGLE_BUSINESS_PROFILE_HABILITADO=true en Vercel
 * (Production) y redeploy. */
export function businessProfileHabilitado(): boolean {
  return process.env.GOOGLE_BUSINESS_PROFILE_HABILITADO === "true";
}

/** Explica en castellano por qué falló un pedido a Google, para mostrarlo en
 * el admin (no hay logs de más de una hora en Vercel Hobby). */
export function describirErrorGoogle(api: string, status: number): string {
  const causa =
    status === 401
      ? "el permiso venció o fue revocado: el cliente tiene que volver a conectar su Google"
      : status === 403
        ? `falta habilitar la API en Google Cloud Console o la cuenta no tiene permiso sobre la ficha`
        : status === 404
          ? "Google no encuentra la ficha o el recurso"
          : status === 429
            ? "se agotó la cuota de Google por ahora: se reintenta en el próximo sync"
            : status >= 500
              ? "Google tuvo un error de su lado: se reintenta en el próximo sync"
              : "Google rechazó el pedido";
  return `${api} respondió ${status}: ${causa}.`;
}

export interface UbicacionGBP {
  /** resource name completo, ej. "accounts/111/locations/1234567890". Es la
   * forma que exige la Reviews API (v4); Performance usa solo la parte
   * "locations/…" (ver ubicacionParaPerformance). */
  location: string;
  placeId: string;
  titulo: string;
}

/** Performance identifica la ficha como "locations/{id}", sin la cuenta. */
export function ubicacionParaPerformance(location: string): string {
  const i = location.indexOf("locations/");
  return i >= 0 ? location.slice(i) : location;
}

/** true si el resource name guardado incluye la cuenta ("accounts/…/"):
 * las fichas vinculadas antes guardaban solo "locations/…", que sirve para
 * Performance pero no para listar/responder reseñas. */
export function ubicacionConCuenta(location: string): boolean {
  return location.startsWith("accounts/");
}

export async function listarUbicaciones(accessToken: string, errores?: string[]): Promise<UbicacionGBP[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const accRes = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers, cache: "no-store" },
  );
  if (!accRes.ok) {
    console.error(`GBP accounts respondió ${accRes.status}`);
    errores?.push(describirErrorGoogle("Account Management API", accRes.status));
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
        errores?.push(describirErrorGoogle("Business Information API", locRes.status));
        break;
      }
      const locData = (await locRes.json()) as {
        locations?: { name: string; title?: string; metadata?: { placeId?: string } }[];
        nextPageToken?: string;
      };
      for (const l of locData.locations ?? []) {
        ubicaciones.push({
          // Business Information devuelve "locations/{id}"; se le antepone la
          // cuenta para poder usar el mismo valor en la Reviews API.
          location: `${account.name}/${l.name}`,
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

export interface RendimientoDia {
  fecha: string; // 'YYYY-MM-DD', en la zona horaria de la ficha
  impresionesMaps: number;
  impresionesBusqueda: number;
  llamadas: number;
  comoLlegar: number;
  clicsWeb: number;
  conversaciones: number;
  reservas: number;
}

const METRICAS_DIARIAS = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "impresionesMaps",
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: "impresionesMaps",
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "impresionesBusqueda",
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "impresionesBusqueda",
  CALL_CLICKS: "llamadas",
  BUSINESS_DIRECTION_REQUESTS: "comoLlegar",
  WEBSITE_CLICKS: "clicsWeb",
  BUSINESS_CONVERSATIONS: "conversaciones",
  BUSINESS_BOOKINGS: "reservas",
} as const satisfies Record<string, keyof Omit<RendimientoDia, "fecha">>;

function fechaISO(d: { year?: number; month?: number; day?: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/** Métricas día por día entre `desde` y `hasta` ('YYYY-MM-DD', inclusive).
 * Google omite los días en 0, así que se devuelven solo los días con algún
 * valor. null si la API rechaza el pedido. */
export async function rendimientoDiario(
  accessToken: string,
  location: string,
  desde: string,
  hasta: string,
  errores?: string[],
): Promise<RendimientoDia[] | null> {
  const [ad, md, dd] = desde.split("-").map(Number);
  const [ah, mh, dh] = hasta.split("-").map(Number);
  const params = new URLSearchParams();
  for (const m of Object.keys(METRICAS_DIARIAS)) params.append("dailyMetrics", m);
  params.set("dailyRange.startDate.year", String(ad));
  params.set("dailyRange.startDate.month", String(md));
  params.set("dailyRange.startDate.day", String(dd));
  params.set("dailyRange.endDate.year", String(ah));
  params.set("dailyRange.endDate.month", String(mh));
  params.set("dailyRange.endDate.day", String(dh));

  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${ubicacionParaPerformance(location)}:fetchMultiDailyMetricsTimeSeries?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!res.ok) {
    console.error(`GBP performance (diario) respondió ${res.status} para ${location}`);
    errores?.push(describirErrorGoogle("Performance API", res.status));
    return null;
  }
  const data = (await res.json()) as {
    multiDailyMetricTimeSeries?: {
      dailyMetricTimeSeries?: {
        dailyMetric?: string;
        timeSeries?: { datedValues?: { date?: { year?: number; month?: number; day?: number }; value?: string }[] };
      }[];
    }[];
  };

  const porDia = new Map<string, RendimientoDia>();
  for (const grupo of data.multiDailyMetricTimeSeries ?? []) {
    for (const serie of grupo.dailyMetricTimeSeries ?? []) {
      const campo = METRICAS_DIARIAS[serie.dailyMetric as keyof typeof METRICAS_DIARIAS];
      if (!campo) continue;
      for (const v of serie.timeSeries?.datedValues ?? []) {
        if (!v.date?.year || !v.date.month || !v.date.day) continue;
        const valor = Number(v.value ?? 0);
        if (!valor) continue;
        const fecha = fechaISO(v.date);
        const dia = porDia.get(fecha) ?? {
          fecha,
          impresionesMaps: 0,
          impresionesBusqueda: 0,
          llamadas: 0,
          comoLlegar: 0,
          clicsWeb: 0,
          conversaciones: 0,
          reservas: 0,
        };
        dia[campo] += valor;
        porDia.set(fecha, dia);
      }
    }
  }
  return [...porDia.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export interface PalabraBusqueda {
  palabra: string;
  /** null cuando Google solo informa "menos de `umbral`". */
  impresiones: number | null;
  umbral: number | null;
}

/** Palabras con las que encontraron la ficha en un mes ('YYYY-MM'). null si
 * la API rechaza el pedido. */
export async function palabrasDeBusqueda(
  accessToken: string,
  location: string,
  mes: string,
  errores?: string[],
): Promise<PalabraBusqueda[] | null> {
  const [anio, m] = mes.split("-").map(Number);
  const palabras: PalabraBusqueda[] = [];
  let pageToken = "";
  // cap defensivo: 5 páginas de 100 palabras
  for (let pagina = 0; pagina < 5; pagina++) {
    const params = new URLSearchParams({
      "monthlyRange.startMonth.year": String(anio),
      "monthlyRange.startMonth.month": String(m),
      "monthlyRange.endMonth.year": String(anio),
      "monthlyRange.endMonth.month": String(m),
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(
      `https://businessprofileperformance.googleapis.com/v1/${ubicacionParaPerformance(location)}/searchkeywords/impressions/monthly?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!res.ok) {
      console.error(`GBP búsquedas respondió ${res.status} para ${location}`);
      errores?.push(describirErrorGoogle("Performance API (búsquedas)", res.status));
      return pagina === 0 ? null : palabras;
    }
    const data = (await res.json()) as {
      searchKeywordsCounts?: { searchKeyword?: string; insightsValue?: { value?: string; threshold?: string } }[];
      nextPageToken?: string;
    };
    for (const k of data.searchKeywordsCounts ?? []) {
      if (!k.searchKeyword) continue;
      const valor = k.insightsValue?.value;
      const umbral = k.insightsValue?.threshold;
      palabras.push({
        palabra: k.searchKeyword,
        impresiones: valor != null ? Number(valor) : null,
        umbral: valor == null && umbral != null ? Number(umbral) : null,
      });
    }
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return palabras;
}
