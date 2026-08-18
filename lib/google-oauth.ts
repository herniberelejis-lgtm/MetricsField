import "server-only";

// OAuth de Google, con dos usos distintos que comparten el mismo client
// ID/secret pero piden scopes diferentes:
// - GBP_SCOPE: cada CLIENTE autoriza con su propia cuenta de Google para
//   que Taply lea las métricas de SU ficha de Business Profile (visitas,
//   llamadas). Refresh token guardado por comercio.
// - ADMIN_SCOPE: cada persona del EQUIPO inicia sesión en el panel con su
//   cuenta de Google. No hace falta refresh token acá, solo confirmar de
//   una vez quién es (id_token) — la sesión del panel se maneja con cookie
//   propia después, como con la contraseña.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const ADMIN_SCOPE = "openid email profile";

export function oauthConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
}

/** El redirect_uri de cada ruta de OAuth tiene que ser EXACTAMENTE uno de
 * los que están cargados en Cloud Console (app.metricsfield.com) — a
 * diferencia del resto del sitio, que ahora también sirve desde
 * metricsfield.com (dominio raíz, agregado para la verificación de marca).
 * Si el redirect_uri se arma con el host del request y alguien entra a
 * loguearse desde metricsfield.com en vez de app.metricsfield.com, Google
 * responde "redirect_uri_mismatch" porque esa URL nunca se registró. Por
 * eso, igual que urlPublicaDeTap en lib/qr.ts, se fija siempre al dominio
 * canónico (NEXT_PUBLIC_BASE_URL) y el host del request queda solo de
 * fallback para desarrollo local sin la variable configurada. */
export function origenCanonico(fallbackOrigin: string): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || fallbackOrigin).replace(/\/+$/, "");
}

export function urlDeAutorizacion(opts: {
  redirectUri: string;
  state: string;
  scope: string;
  /** access_type=offline + prompt=consent: pide refresh token (para poder
   * traer datos sin que la persona esté presente). Solo hace falta para el
   * flujo de conexión de Business Profile, no para el login del panel. */
  offline?: boolean;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scope,
    state: opts.state,
  });
  if (opts.offline) {
    params.set("access_type", "offline");
    params.set("prompt", "consent"); // fuerza a Google a devolver refresh token siempre
  }
  return `${AUTH_URL}?${params}`;
}

interface CanjeResultado {
  refreshToken: string | null;
  idToken: string | null;
}

/** Canjea el code del callback por tokens. */
export async function canjearCodigo(
  code: string,
  redirectUri: string,
): Promise<CanjeResultado> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`OAuth: canje de código respondió ${res.status}`);
    return { refreshToken: null, idToken: null };
  }
  const data = (await res.json()) as { refresh_token?: string; id_token?: string };
  return { refreshToken: data.refresh_token ?? null, idToken: data.id_token ?? null };
}

/** Access token de corta vida a partir del refresh token guardado. */
export async function accessTokenDesdeRefresh(
  refreshToken: string,
): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`OAuth: refresh respondió ${res.status} — puede que haya que reconectar Google`);
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Decodifica (sin volver a verificar firma) el id_token que Google acaba
 * de devolvernos en un canje servidor-a-servidor por HTTPS — no pasó por
 * el navegador, así que confiar en el payload acá es seguro. Solo se usa
 * para leer el email/nombre de quien acaba de autenticarse. */
export function decodificarIdToken(idToken: string): { email: string; nombre: string } | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(json) as { email?: string; email_verified?: boolean; name?: string };
    if (!data.email || data.email_verified === false) return null;
    return { email: data.email.toLowerCase(), nombre: data.name ?? "" };
  } catch {
    return null;
  }
}
