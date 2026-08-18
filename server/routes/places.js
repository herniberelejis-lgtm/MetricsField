const express = require("express");
const { requireAdmin } = require("../auth");
const { searchGooglePlace } = require("../places");

const router = express.Router();

router.get("/places-search", requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q ?? "");
    if (q.trim().length < 3) {
      res.json({ resultados: [] });
      return;
    }

    const resultados = await searchGooglePlace(q);
    if (resultados === null) {
      res.status(503).json({ error: "Falta configurar GOOGLE_PLACES_API_KEY en el servidor." });
      return;
    }

    res.json({ resultados });
  } catch (e) {
    console.error("GET /api/places-search:", e);
    res.status(500).json({ error: "No se pudo buscar" });
  }
});

module.exports = router;
