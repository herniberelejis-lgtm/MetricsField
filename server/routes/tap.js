const express = require("express");
const {
  getDatosTap,
  getLink,
  registrarTap,
  activarAutogestion,
  editarAutogestion,
} = require("../db/tap");
const { urlSegura, urlDeResenaValida } = require("../url");
const { pinValido } = require("../pin");
const { ipDelRequest, permitir, limpiarVencidos } = require("../ratelimit");
const {
  paginaInactiva,
  paginaRedireccion,
  paginaActivar,
  paginaEditar,
  pagina404,
} = require("../views/tap");

const UA_BOT = /bot|crawler|spider|preview|facebookexternalhit|whatsapp\/|slurp|curl/i;

const router = express.Router();

async function contarTapSiCorresponde(req, slug) {
  const userAgent = req.headers["user-agent"] ?? "";
  const esPrefetch =
    req.headers.purpose === "prefetch" || req.headers["next-router-prefetch"] === "1";

  limpiarVencidos();
  const ip = ipDelRequest(req);
  const dentroDelLimite = await permitir(`tap:${ip}:${slug}`, 30, 10 * 60_000);

  if (!esPrefetch && !UA_BOT.test(userAgent) && dentroDelLimite) {
    await registrarTap(slug, userAgent || null);
  }
}

router.get("/t/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const datos = await getDatosTap(slug);
    if (!datos) {
      res.status(404).type("html").send(pagina404());
      return;
    }

    const { link, comercio } = datos;
    await contarTapSiCorresponde(req, slug);

    if (!link.activo) {
      res.type("html").send(paginaInactiva());
      return;
    }

    if (link.urlDestino) {
      const url = urlSegura(link.urlDestino);
      if (!url) {
        res.status(404).type("html").send(pagina404());
        return;
      }
      if (link.autogestionado) {
        res.type("html").send(paginaRedireccion(url, slug));
        return;
      }
      res.redirect(302, url);
      return;
    }

    if (!comercio) {
      res.type("html").send(paginaActivar(slug));
      return;
    }

    const urlResena = urlSegura(comercio.googleReviewUrl);
    if (!urlResena) {
      res.status(404).type("html").send(pagina404());
      return;
    }
    res.redirect(302, urlResena);
  } catch (e) {
    console.error("GET /t/:slug:", e);
    res.status(500).type("html").send(pagina404());
  }
});

router.get("/t/:slug/editar", async (req, res) => {
  try {
    const { slug } = req.params;
    const link = await getLink(slug);
    if (!link || !link.autogestionado) {
      res.status(404).type("html").send(pagina404());
      return;
    }
    res.type("html").send(paginaEditar(slug, link.nombreNegocio, link.urlDestino ?? ""));
  } catch (e) {
    console.error("GET /t/:slug/editar:", e);
    res.status(500).type("html").send(pagina404());
  }
});

router.post("/api/t/:slug/activar", express.json(), async (req, res) => {
  try {
    const { slug } = req.params;
    const nombre = String(req.body?.nombreNegocio ?? "").trim().slice(0, 80);
    if (!nombre) {
      res.status(400).json({ error: "Contanos el nombre de tu negocio." });
      return;
    }

    const url = String(req.body?.urlDestino ?? "").trim();
    if (!urlDeResenaValida(url)) {
      res.status(400).json({
        error: "Pegá el link completo de tu reseña de Google (empieza con https://).",
      });
      return;
    }

    const pin = String(req.body?.pin ?? "");
    if (!pinValido(pin)) {
      res.status(400).json({ error: "El PIN tiene que ser de 4 a 8 números." });
      return;
    }

    limpiarVencidos();
    const ip = ipDelRequest(req);
    if (!(await permitir(`activar-cartel:${ip}`, 5, 30 * 60_000))) {
      res.status(429).json({ error: "Demasiados intentos. Probá de nuevo en un rato." });
      return;
    }

    await activarAutogestion(slug, { nombreNegocio: nombre, urlDestino: url, pin });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || "No se pudo activar." });
  }
});

router.post("/api/t/:slug/editar", express.json(), async (req, res) => {
  try {
    const { slug } = req.params;
    const nombre = String(req.body?.nombreNegocio ?? "").trim().slice(0, 80);
    if (!nombre) {
      res.status(400).json({ error: "Contanos el nombre de tu negocio." });
      return;
    }

    const url = String(req.body?.urlDestino ?? "").trim();
    if (!urlDeResenaValida(url)) {
      res.status(400).json({
        error: "Pegá el link completo de tu reseña de Google (empieza con https://).",
      });
      return;
    }

    limpiarVencidos();
    const ip = ipDelRequest(req);
    if (!(await permitir(`editar-cartel:${ip}:${slug}`, 5, 15 * 60_000))) {
      res.status(429).json({ error: "Demasiados intentos. Probá de nuevo en un rato." });
      return;
    }

    await editarAutogestion(slug, String(req.body?.pin ?? ""), {
      nombreNegocio: nombre,
      urlDestino: url,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || "No se pudo guardar." });
  }
});

module.exports = router;
