const ESQUEMAS_PERMITIDOS = new Set(["http:", "https:"]);

function urlSegura(url) {
  const limpia = url.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!limpia) return null;
  try {
    const parsed = new URL(limpia);
    if (!ESQUEMAS_PERMITIDOS.has(parsed.protocol)) return null;
    return limpia;
  } catch {
    return null;
  }
}

function urlDeResenaValida(url) {
  return urlSegura(url) !== null;
}

module.exports = { urlSegura, urlDeResenaValida };
