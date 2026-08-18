const express = require("express");
const crypto = require("node:crypto");
const { getClientePorCodigo, getSucursales } = require("../db/clientes");
const {
  getResenas,
  actualizarResena,
} = require("../db/resenas");
const {
  getLinks,
  actualizarLink,
  getTapsPorDiaPorSoporte,
  getBenchmarkMensual,
  actualizarAutomatizacionResenas,
  desconectarGoogleComercio,
  guardarTokenGoogleComercio,
} = require("../db/portal");
const { getLink } = require("../db/tap");
const { comercioAutorizado } = require("../portal-auth");
const { ipDelRequest, permitir, limpiarVencidos } = require("../ratelimit");
const { urlSegura } = require("../url");
const { metricaActual, metricaAnterior, heroDeCalificacion, calcCrecimientoVsCompetencia } = require("../utils");
const {
  oauthConfigurado,
  urlDeAutorizacion,
  canjearCodigo,
  GBP_SCOPE,
} = require("../google-oauth");
const { originPublico } = require("../origin");
const { getCliente } = require("../db/clientes");
const { getChecklist } = require("../db/checklist");
const { getAudits } = require("../db/audits");
const { terminosFrecuentes } = require("../keywords");
const { recomendacionDelMes, citasIA } = require("../recomendacion");
const { calcularResumenResenas } = require("../resumenResenas");
const { metricasPorEmpleado } = require("../empleados");

const COOKIE_PORTAL_OAUTH = "portal_oauth_state";

const MENSAJE_GOOGLE = {
  conectado: { texto: "Conectaste tu cuenta de Google. En un rato vas a ver visitas y llamadas acá.", tono: "ok" },
  error: { texto: "No se pudo conectar — probá de nuevo.", tono: "error" },
  cancelado: { texto: "Cancelaste la conexión con Google.", tono: "error" },
  "no-configurado": { texto: "Esta función todavía no está disponible.", tono: "error" },
};

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

async function portalRateLimit(req, res) {
  limpiarVencidos();
  const ip = ipDelRequest(req);
  if (!(await permitir(`portal-codigo:${ip}`, 20, 10 * 60_000))) {
    res.status(404).json({ error: "No encontrado" });
    return false;
  }
  return true;
}

async function armarPayload(cuenta, activo, googleKey) {
  const sucursales = await getSucursales(cuenta.id);
  const ubicaciones = [cuenta, ...sucursales];

  const [tapsPorDiaSoporte, links, resenas, benchmark, checklist, audits] = await Promise.all([
    getTapsPorDiaPorSoporte(activo.id, 14),
    getLinks(activo.id),
    getResenas(activo.id),
    getBenchmarkMensual(activo.id),
    getChecklist(activo.id),
    getAudits(activo.id),
  ]);

  const m = metricaActual(activo);
  const prev = metricaAnterior(activo);
  const hero = heroDeCalificacion(activo);
  const esPremium = cuenta.plan === "Premium";
  const recomendacion = m ? recomendacionDelMes(cuenta, m, prev) : null;
  const checklistHechos = checklist.filter((i) => i.hecho).length;
  const checklistPct = checklist.length ? Math.round((checklistHechos / checklist.length) * 100) : 0;
  const ultimosAudits = audits.slice(0, 3);

  const detalleMensual = {};
  for (const h of activo.historico) {
    const textos = resenas
      .filter((r) => r.fecha.startsWith(h.mes))
      .map((r) => r.texto)
      .filter((t) => t && t.trim().length > 0);
    detalleMensual[h.mes] = {
      terminos: terminosFrecuentes(textos),
      nResenasTexto: textos.length,
    };
  }

  const promedioResenasMensual =
    activo.historico.length > 0
      ? activo.historico.reduce((acc, h) => acc + h.resenasNuevas, 0) / activo.historico.length
      : 0;

  const resumenResenas = calcularResumenResenas(resenas);
  const personalEmpleados = metricasPorEmpleado(
    resenas,
    links.map((l) => ({ nombreEmpleado: l.nombreEmpleado, taps: l.taps })),
  );

  const diasConTaps = [...new Set(tapsPorDiaSoporte.map((d) => d.fecha))].sort();
  const linksConTaps = [...links].sort((a, b) => b.taps - a.taps);
  const totalTapsHistorico = links.reduce((acc, l) => acc + l.taps, 0);
  const totalTapsNfc = links.filter((l) => l.tipo === "nfc").reduce((acc, l) => acc + l.taps, 0);
  const totalTapsQr = links
    .filter((l) => l.tipo === "qr" || l.tipo === "ambos")
    .reduce((acc, l) => acc + l.taps, 0);
  const tieneSoporteQr = links.some((l) => l.tipo === "qr" || l.tipo === "ambos");

  const hoyISO = new Date().toISOString().slice(0, 10);
  const resenasPendientes = resenas.filter((r) => r.estado === "nueva");
  const resenasHoy = resenas.filter((r) => r.fecha === hoyISO).length;

  const gbpConectado = Boolean(activo.googleConectadoEn);
  const diasConectado = activo.googleConectadoEn
    ? Math.floor((Date.now() - new Date(activo.googleConectadoEn).getTime()) / 86_400_000)
    : null;

  const prioridades = [];
  if (resenasPendientes.length > 0) {
    prioridades.push({
      texto: `${resenasPendientes.length} reseña${resenasPendientes.length === 1 ? "" : "s"} esperando tu respuesta`,
      panel: "resenas",
      tono: "urgente",
    });
  }
  if (diasConectado !== null && diasConectado >= 6) {
    prioridades.push({
      texto: "El permiso de Google vence pronto — reconectá para no cortar la sincronización",
      panel: "rating",
      tono: "atencion",
    });
  }
  if (!gbpConectado) {
    prioridades.push({
      texto: "Conectá tu Google Business Profile para automatizar visitas y llamadas",
      panel: "rating",
      tono: "info",
    });
  }

  return {
    cuenta: {
      id: cuenta.id,
      nombre: cuenta.nombre,
      plan: cuenta.plan,
      codigoAcceso: cuenta.codigoAcceso,
      tonoMarca: cuenta.tonoMarca,
    },
    activo: {
      id: activo.id,
      nombre: activo.nombre,
      rubro: activo.rubro,
      zona: activo.zona,
      googleConectadoEn: activo.googleConectadoEn,
      googleSyncEn: activo.googleSyncEn,
      ratingGoogle: activo.ratingGoogle,
      resenasGoogle: activo.resenasGoogle,
      autoResponderPositivas: activo.autoResponderPositivas,
      autoResponderUmbral: activo.autoResponderUmbral,
    },
    ubicaciones: ubicaciones.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      rubro: u.rubro,
      zona: u.zona,
      ...heroDeCalificacion(u),
    })),
    sucursalesCount: sucursales.length,
    metrica: m,
    metricaAnterior: prev,
    hero,
    prioridades,
    mensajeGoogle: googleKey ? MENSAJE_GOOGLE[googleKey] ?? null : null,
    taps: {
      porDia: tapsPorDiaSoporte,
      diasConTaps,
      labelsTaps: diasConTaps.map((d) => d.slice(5).replace("-", "/")),
      nfcPorDia: diasConTaps.map((d) => tapsPorDiaSoporte.find((x) => x.fecha === d)?.nfc ?? 0),
      qrPorDia: diasConTaps.map((d) => tapsPorDiaSoporte.find((x) => x.fecha === d)?.qr ?? 0),
      totalHistorico: totalTapsHistorico,
      totalNfc: totalTapsNfc,
      totalQr: totalTapsQr,
      tieneSoporteQr,
    },
    links: linksConTaps,
    resenas,
    resenasPendientes: resenasPendientes.length,
    resenasHoy,
    benchmark,
    crecimientoVsCompetencia: calcCrecimientoVsCompetencia(benchmark),
    resumenResenas,
    personalEmpleados,
    cuentaId: cuenta.id,
    mes: {
      metrica: m,
      metricaAnterior: prev,
      esPremium,
      historico: activo.historico,
      checklist,
      checklistHechos,
      checklistPct,
      ultimosAudits,
      recomendacion,
      promedioResenasMensual,
      detalleMensual,
      citasIA: citasIA(m),
    },
    google: {
      conectado: gbpConectado,
      diasConectado,
      conectarHref: `/api/portal/google/oauth/start?codigo=${encodeURIComponent(cuenta.codigoAcceso)}&comercioId=${encodeURIComponent(activo.id)}`,
    },
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  };
}

const router = express.Router();

router.get("/:codigo", async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;

    const cuenta = await getClientePorCodigo(req.params.codigo);
    if (!cuenta || cuenta.estado === "baja") {
      res.status(404).json({ error: "Portal no encontrado" });
      return;
    }

    const sucursalParam = req.query.sucursal;
    const sucursales = await getSucursales(cuenta.id);
    const ubicaciones = [cuenta, ...sucursales];
    const activo = sucursalParam
      ? (ubicaciones.find((u) => u.id === sucursalParam) ?? cuenta)
      : cuenta;

    const googleKey = req.query.google ? String(req.query.google) : null;
    const payload = await armarPayload(cuenta, activo, googleKey);
    res.json(payload);
  } catch (e) {
    console.error("GET /api/portal/:codigo:", e);
    res.status(500).json({ error: "No se pudo cargar el portal" });
  }
});

router.get("/:codigo/taps", async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const cuenta = await getClientePorCodigo(req.params.codigo);
    if (!cuenta || cuenta.estado === "baja") {
      res.status(404).json({ error: "Portal no encontrado" });
      return;
    }
    const fecha = String(req.query.fecha ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      res.status(400).json({ error: "Fecha inválida (YYYY-MM-DD)" });
      return;
    }
    const comercioId = String(req.query.comercioId ?? cuenta.id);
    await comercioAutorizado(req.params.codigo, comercioId);
    const { getTapsPorHora } = require("../db/links");
    const porHora = await getTapsPorHora(comercioId, fecha);
    res.json({ porHora });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:codigo/resenas/:id/aprobar", express.json(), async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const comercioId = String(req.body?.comercioId ?? "");
    const respuesta = String(req.body?.respuesta ?? "").trim().slice(0, 2000);
    const id = Number(req.params.id);
    if (!respuesta) {
      res.status(400).json({ error: "La respuesta no puede quedar vacía." });
      return;
    }
    const comercio = await comercioAutorizado(req.params.codigo, comercioId);
    const resenas = await getResenas(comercio.id);
    if (!resenas.find((r) => r.id === id)) {
      res.status(404).json({ error: "Esa reseña no pertenece a este local." });
      return;
    }
    await actualizarResena(id, {
      respuestaSugerida: respuesta,
      respuestaPublicada: true,
      estado: "respondida",
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:codigo/resenas/:id/descartar", express.json(), async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const comercioId = String(req.body?.comercioId ?? "");
    const id = Number(req.params.id);
    const comercio = await comercioAutorizado(req.params.codigo, comercioId);
    const resenas = await getResenas(comercio.id);
    if (!resenas.find((r) => r.id === id)) {
      res.status(404).json({ error: "Esa reseña no pertenece a este local." });
      return;
    }
    await actualizarResena(id, { estado: "escalada" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:codigo/automatizacion", express.json(), async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const comercioId = String(req.body?.comercioId ?? "");
    const comercio = await comercioAutorizado(req.params.codigo, comercioId);
    await actualizarAutomatizacionResenas(comercio.id, {
      autoResponderPositivas: Boolean(req.body?.autoResponderPositivas),
      autoResponderUmbral: Number(req.body?.autoResponderUmbral) === 5 ? 5 : 4,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:codigo/google/desconectar", express.json(), async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const comercioId = String(req.body?.comercioId ?? "");
    const comercio = await comercioAutorizado(req.params.codigo, comercioId);
    await desconectarGoogleComercio(comercio.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:codigo/links/:linkId", express.json(), async (req, res) => {
  try {
    if (!(await portalRateLimit(req, res))) return;
    const comercioId = String(req.body?.comercioId ?? "");
    const linkId = req.params.linkId;
    const nuevaUrl = String(req.body?.urlDestino ?? "").trim();
    const comercio = await comercioAutorizado(req.params.codigo, comercioId);
    const link = await getLink(linkId);
    if (!link || link.comercioId !== comercio.id) {
      res.status(404).json({ error: "Ese dispositivo no pertenece a este portal." });
      return;
    }
    if (!nuevaUrl) {
      await actualizarLink(linkId, { urlDestino: null });
      res.json({ ok: true });
      return;
    }
    const limpia = urlSegura(nuevaUrl);
    if (!limpia) {
      res.status(400).json({ error: "Esa URL no parece válida — revisala e intentá de nuevo." });
      return;
    }
    await actualizarLink(linkId, { urlDestino: limpia });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function mountPortalOAuth(app) {
  app.get("/api/portal/google/oauth/start", async (req, res) => {
    try {
      if (!(await portalRateLimit(req, res))) return;

      const codigo = String(req.query.codigo ?? "");
      const cliente = await getClientePorCodigo(codigo);
      if (!cliente) {
        res.redirect("/");
        return;
      }

      let comercioId = cliente.id;
      const comercioIdParam = String(req.query.comercioId || cliente.id);
      if (comercioIdParam !== cliente.id) {
        const sucursal = await getCliente(comercioIdParam);
        if (sucursal && sucursal.comercioPadreId === cliente.id) comercioId = sucursal.id;
      }

      const origin = originPublico(req);
      if (!oauthConfigurado()) {
        res.redirect(`${origin}/portal/${codigo}?google=no-configurado`);
        return;
      }

      const nonce = crypto.randomBytes(16).toString("hex");
      const state = `${codigo}.${comercioId}.${nonce}`;
      const redirectUri = `${origin}/api/portal/google/oauth/callback`;

      res.cookie(COOKIE_PORTAL_OAUTH, state, { ...cookieOpts(), maxAge: 600_000 });
      res.redirect(urlDeAutorizacion({ redirectUri, state, scope: GBP_SCOPE, offline: true }));
    } catch (e) {
      console.error("portal oauth start:", e);
      res.redirect("/");
    }
  });

  app.get("/api/portal/google/oauth/callback", async (req, res) => {
    const origin = originPublico(req);
    const state = String(req.query.state ?? "");
    const cookieState = req.cookies?.[COOKIE_PORTAL_OAUTH] ?? "";
    const [codigo, comercioIdState] = state.split(".");

    const volver = (resultado) => {
      res.clearCookie(COOKIE_PORTAL_OAUTH, { path: "/" });
      res.redirect(`${origin}/portal/${codigo}?google=${resultado}`);
    };

    if (!state || state !== cookieState || !codigo || !comercioIdState) {
      res.clearCookie(COOKIE_PORTAL_OAUTH, { path: "/" });
      res.redirect("/");
      return;
    }

    try {
      const cliente = await getClientePorCodigo(codigo);
      if (!cliente) {
        volver("error");
        return;
      }

      let comercioId = cliente.id;
      if (comercioIdState !== cliente.id) {
        const sucursal = await getCliente(comercioIdState);
        if (!sucursal || sucursal.comercioPadreId !== cliente.id) {
          volver("error");
          return;
        }
        comercioId = sucursal.id;
      }

      const code = req.query.code;
      if (!code) {
        volver("cancelado");
        return;
      }

      const redirectUri = `${origin}/api/portal/google/oauth/callback`;
      const { refreshToken } = await canjearCodigo(String(code), redirectUri);
      if (!refreshToken) {
        volver("error");
        return;
      }

      await guardarTokenGoogleComercio(comercioId, refreshToken);
      volver("conectado");
    } catch (e) {
      console.error("portal oauth callback:", e);
      volver("error");
    }
  });
}

module.exports = { router, mountPortalOAuth };
