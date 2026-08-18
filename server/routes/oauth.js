const crypto = require("node:crypto");
const {
  oauthConfigurado,
  urlDeAutorizacion,
  canjearCodigo,
  decodificarIdToken,
  ADMIN_SCOPE,
} = require("../google-oauth");
const { originPublico } = require("../origin");
const { esAdminPermitido } = require("../db/admins");
const { registrarAuditoria } = require("../db/auditoria");
const { crearCookieSesionGoogle, SESION_MAX_MS } = require("../sesion");

const { COOKIE, COOKIE_GOOGLE, COOKIE_OAUTH_STATE } = require("../cookies");

function claveFirmaGoogle() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function limpiarState(res) {
  res.clearCookie(COOKIE_OAUTH_STATE, { path: "/" });
  return res;
}

function volverLogin(res, req, error) {
  const origin = originPublico(req);
  return limpiarState(res.redirect(`${origin}/login?error=${encodeURIComponent(error)}`));
}

function mountOAuth(router) {
  router.get("/start", (req, res) => {
    if (!oauthConfigurado()) {
      volverLogin(res, req, "google-no-configurado");
      return;
    }

    const state = crypto.randomBytes(16).toString("hex");
    const origin = originPublico(req);
    const redirectUri = `${origin}/api/admin/oauth/callback`;

    res.cookie(COOKIE_OAUTH_STATE, state, { ...cookieOpts(), maxAge: 600_000 });
    res.redirect(urlDeAutorizacion({ redirectUri, state, scope: ADMIN_SCOPE }));
  });

  router.get("/callback", async (req, res) => {
    const state = req.query.state;
    const cookieState = req.cookies?.[COOKIE_OAUTH_STATE];

    if (!state || !cookieState || state !== cookieState) {
      volverLogin(res, req, "estado");
      return;
    }

    const code = req.query.code;
    if (!code) {
      volverLogin(res, req, "cancelado");
      return;
    }

    const origin = originPublico(req);
    const redirectUri = `${origin}/api/admin/oauth/callback`;

    try {
      const { idToken } = await canjearCodigo(String(code), redirectUri);
      const datos = idToken ? decodificarIdToken(idToken) : null;
      if (!datos) {
        volverLogin(res, req, "google");
        return;
      }

      const permitido = await esAdminPermitido(datos.email);
      if (!permitido) {
        volverLogin(res, req, "no-autorizado");
        return;
      }

      await registrarAuditoria(datos.email, "login", "Inicio de sesión con Google");

      const valor = await crearCookieSesionGoogle(datos.email, datos.nombre, claveFirmaGoogle());
      res.cookie(COOKIE_GOOGLE, valor, { ...cookieOpts(), maxAge: SESION_MAX_MS });
      limpiarState(res.redirect(`${origin}/admin`));
    } catch (e) {
      console.error("GET /api/admin/oauth/callback:", e);
      volverLogin(res, req, "google");
    }
  });
}

module.exports = { mountOAuth };
