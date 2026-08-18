/** Origen público del sitio (OAuth redirects, links al SPA). */
function originPublico(req) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL;
  if (base) return String(base).replace(/\/$/, "");

  if (process.env.SERVE_SPA === "true" && req) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    return `${proto}://${host}`;
  }

  return (process.env.WEB_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
}

module.exports = { originPublico };
