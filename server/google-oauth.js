const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const ADMIN_SCOPE = "openid email profile";

function oauthConfigurado() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

function urlDeAutorizacion(opts) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: opts.scope,
    state: opts.state,
  });
  if (opts.offline) {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  return `${AUTH_URL}?${params}`;
}

async function canjearCodigo(code, redirectUri) {
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
  });
  if (!res.ok) {
    console.error(`OAuth: canje de código respondió ${res.status}`);
    return { refreshToken: null, idToken: null };
  }
  const data = await res.json();
  return {
    refreshToken: data.refresh_token ?? null,
    idToken: data.id_token ?? null,
  };
}

function decodificarIdToken(idToken) {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(json);
    if (!data.email || data.email_verified === false) return null;
    return { email: data.email.toLowerCase(), nombre: data.name ?? "" };
  } catch {
    return null;
  }
}

async function accessTokenDesdeRefresh(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error(`OAuth: refresh respondió ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

module.exports = {
  GBP_SCOPE,
  ADMIN_SCOPE,
  oauthConfigurado,
  urlDeAutorizacion,
  canjearCodigo,
  decodificarIdToken,
  accessTokenDesdeRefresh,
};
