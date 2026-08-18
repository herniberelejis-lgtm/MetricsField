const crypto = require("node:crypto");
const express = require("express");
const { COOKIE, COOKIE_GOOGLE } = require("../cookies");
const { oauthConfigurado } = require("../google-oauth");
const { crearCookiePassword, SESION_MAX_MS } = require("../sesion");

const router = express.Router();

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

router.get("/config", (_req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  res.json({
    googleDisponible: oauthConfigurado(),
    passwordDisponible: Boolean(password) || process.env.NODE_ENV !== "production",
  });
});

router.get("/me", async (req, res) => {
  const { sesionValida } = require("../auth");
  const ok = await sesionValida(req);
  if (!ok) {
    res.status(401).json({ ok: false });
    return;
  }
  res.json({ ok: true });
});

router.post("/login", express.json(), async (req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  const intento = String(req.body?.password ?? "");

  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      res.json({ ok: true, dev: true });
      return;
    }
    res.status(503).json({ error: "ADMIN_PASSWORD no configurada" });
    return;
  }

  const ok =
    intento.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(intento), Buffer.from(password));

  if (!ok) {
    res.status(401).json({ error: "Contraseña incorrecta" });
    return;
  }

  const valor = await crearCookiePassword(password);
  res.cookie(COOKIE, valor, { ...cookieOpts(), maxAge: SESION_MAX_MS });
  res.json({ ok: true });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.clearCookie(COOKIE_GOOGLE, { path: "/" });
  res.json({ ok: true });
});

module.exports = router;
