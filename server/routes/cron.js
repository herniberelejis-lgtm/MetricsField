const crypto = require("node:crypto");
const express = require("express");
const {
  sincronizarGoogleTodos,
  sincronizarRendimientoTodos,
  sincronizarResenasGoogleTodos,
  avisarGoogleDesconectado,
  enviarResumenesMensuales,
} = require("../db/google-sync");
const {
  sincronizarCompetidoresTodos,
  snapshotCompetenciaMensual,
} = require("../db/competencia-sync");

const router = express.Router();

function autorizado(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const esperado = Buffer.from(`Bearer ${secret}`);
  const recibido = Buffer.from(req.headers.authorization ?? "");
  return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
}

router.get("/sync-google", async (req, res) => {
  if (!autorizado(req)) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
    res.status(503).json({ error: "Falta configurar CRON_SECRET" });
    return;
  }

  try {
    const resenas = await sincronizarGoogleTodos();
    const rendimiento = await sincronizarRendimientoTodos();
    const resenasDetalle = await sincronizarResenasGoogleTodos();
    const competidores = await sincronizarCompetidoresTodos();
    const competencia = await snapshotCompetenciaMensual();
    const resumenes =
      new Date().getUTCDate() === 1 ? await enviarResumenesMensuales() : { total: 0, enviados: 0 };
    const desconectados = await avisarGoogleDesconectado();

    res.json({
      resenas,
      rendimiento,
      resenasDetalle,
      competidores,
      competencia,
      resumenes,
      desconectados,
    });
  } catch (e) {
    console.error("GET /api/cron/sync-google:", e);
    res.status(500).json({ error: "Error en sincronización" });
  }
});

module.exports = router;
