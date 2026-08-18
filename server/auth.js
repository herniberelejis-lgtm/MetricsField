const { cookiePasswordValida, leerCookieSesionGoogle } = require("./sesion");
const { esAdminPermitido } = require("./db/admins");
const { COOKIE, COOKIE_GOOGLE } = require("./cookies");

function claveFirmaGoogle() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

async function sesionGoogle(req) {
  const cookies = parseCookies(req.headers.cookie);
  const valor = cookies[COOKIE_GOOGLE];
  if (!valor) return null;
  return leerCookieSesionGoogle(valor, claveFirmaGoogle());
}

async function sesionValida(req) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return process.env.NODE_ENV !== "production";
  }

  const cookies = parseCookies(req.headers.cookie);

  const porPassword = cookies[COOKIE];
  if (porPassword && (await cookiePasswordValida(porPassword, password))) {
    return true;
  }

  const google = await leerCookieSesionGoogle(cookies[COOKIE_GOOGLE], claveFirmaGoogle());
  if (!google) return false;

  try {
    return await esAdminPermitido(google.email);
  } catch (e) {
    console.error("sesionValida: error verificando allowlist:", e);
    return false;
  }
}

async function emailAdminActual(req) {
  const google = await sesionGoogle(req);
  return google?.email ?? null;
}

function requireAdmin(req, res, next) {
  sesionValida(req)
    .then((ok) => {
      if (!ok) {
        res.status(401).json({ error: "No autorizado" });
        return;
      }
      next();
    })
    .catch((e) => {
      console.error("requireAdmin:", e);
      res.status(401).json({ error: "No autorizado" });
    });
}

module.exports = {
  COOKIE,
  COOKIE_GOOGLE,
  parseCookies,
  sesionValida,
  sesionGoogle,
  emailAdminActual,
  requireAdmin,
};
