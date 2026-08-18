const express = require("express");
const { requireAdmin, emailAdminActual } = require("../auth");
const {
  getCuentas,
  getCliente,
  contarSucursalesPorCuenta,
  crearCliente,
  crearSucursal,
  actualizarCliente,
  eliminarCliente,
  regenerarCodigo,
  getSucursales,
} = require("../db/clientes");
const {
  getInventarioHardware,
  generarLotePiezas,
  asignarPiezaACliente,
  listarComerciosSelect,
} = require("../db/hardware");
const {
  getResenasResumenPortfolio,
  getTapsResumenPortfolio,
  getVisitasPerfilPortfolio,
} = require("../db/portfolio");
const { registrarAuditoria, getAuditoria } = require("../db/auditoria");
const { desconectarGoogleComercio } = require("../db/portal");
const {
  getLinks,
  crearLink,
  actualizarLinkAdmin,
  eliminarLink,
  getTapsPorDia,
} = require("../db/links");
const {
  getCompetidores,
  crearCompetidor,
  actualizarCompetidor,
  eliminarCompetidor,
  sincronizarCompetidor,
} = require("../db/competencia");
const { guardarMetrica, eliminarMetrica } = require("../db/metricas");
const { getResenas, crearResena, actualizarResena } = require("../db/resenas");
const { alertarResenaMala } = require("../alertas");
const { sincronizarGoogle, sincronizarRendimiento } = require("../db/google-sync");
const { urlSegura } = require("../url");
const { metricaActual } = require("../utils");
const { originPublico } = require("../origin");
const { generarQrPng, urlPublicaDeTap } = require("../qr");
const { getLink } = require("../db/tap");
const JSZip = require("jszip");

const router = express.Router();
router.use(requireAdmin);

const PERIODOS = {
  hoy: 0,
  semana: 7,
  mes: 30,
  anio: 365,
  todo: null,
};

function rangoPeriodo(key) {
  const dias = PERIODOS[key] ?? PERIODOS.mes;
  const hoy = new Date();
  const hasta = hoy.toISOString().slice(0, 10);
  const desde =
    dias === null
      ? "2000-01-01"
      : new Date(hoy.getTime() - dias * 86_400_000).toISOString().slice(0, 10);
  return { desde, hasta, label: key };
}

router.get("/dashboard", async (req, res) => {
  try {
    const periodoKey = String(req.query.periodo ?? "mes");
    const { desde, hasta } = rangoPeriodo(periodoKey);
    const mesDesde = desde.slice(0, 7);
    const mesHasta = hasta.slice(0, 7);

    const [clientes, resenasResumen, tapsResumen, visitas] = await Promise.all([
      getCuentas(),
      getResenasResumenPortfolio(desde, hasta),
      getTapsResumenPortfolio(desde, hasta),
      getVisitasPerfilPortfolio(mesDesde, mesHasta),
    ]);

    const activos = clientes.filter((c) => c.estado === "activo");
    const mrr = activos.reduce((acc, c) => acc + c.fee, 0);
    const visitasPorCliente = new Map(visitas.porCliente.map((v) => [v.comercioId, v.visitas]));

    const ratings = activos
      .map((c) => metricaActual(c)?.ratingPromedio ?? 0)
      .filter((n) => n > 0);
    const ratingPromedio =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    res.json({
      periodo: periodoKey,
      kpis: {
        mrr,
        clientesActivos: activos.length,
        resenasTotal: resenasResumen.total,
        resenasNegativas: resenasResumen.negativas,
        tapsNfc: tapsResumen.nfc,
        tapsQr: tapsResumen.qr,
        visitasPerfil: visitas.total,
        ratingPromedio: Number(ratingPromedio.toFixed(2)),
      },
      resenasPorEstrellas: resenasResumen.porEstrellas,
      clientes: clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        rubro: c.rubro,
        zona: c.zona,
        plan: c.plan,
        estado: c.estado,
        rating: metricaActual(c)?.ratingPromedio ?? null,
        visitasPerfil: visitasPorCliente.get(c.id) ?? 0,
        historicoResenas: (c.historico ?? []).map((h) => h.resenasTotal),
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/dashboard:", e);
    res.status(500).json({ error: "No se pudo cargar el panel" });
  }
});

router.get("/clientes", async (_req, res) => {
  try {
    const [clientes, sucursalesPorCuenta] = await Promise.all([
      getCuentas(),
      contarSucursalesPorCuenta(),
    ]);
    res.json({
      clientes: clientes
        .map((c) => {
          const m = metricaActual(c);
          return {
            id: c.id,
            nombre: c.nombre,
            rubro: c.rubro,
            zona: c.zona,
            estado: c.estado,
            plan: c.plan,
            fechaAlta: c.fechaAlta,
            fee: c.fee,
            sucursales: sucursalesPorCuenta.get(c.id) ?? 0,
            resenasTotal: m?.resenasTotal ?? null,
            visitasPerfil: m?.visitasPerfil ?? null,
            rating: m?.ratingPromedio ?? null,
          };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  } catch (e) {
    console.error("GET /api/admin/clientes:", e);
    res.status(500).json({ error: "No se pudo cargar el listado" });
  }
});

router.get("/clientes/:id", async (req, res) => {
  try {
    const cliente = await getCliente(req.params.id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    const [sucursales, links, competidores, tapsPorDia] = await Promise.all([
      cliente.comercioPadreId ? [] : getSucursales(cliente.id),
      getLinks(cliente.id),
      getCompetidores(cliente.id),
      getTapsPorDia(cliente.id, 14),
    ]);
    const m = metricaActual(cliente);
    let portalUrl = `/portal/${cliente.codigoAcceso}`;
    if (cliente.comercioPadreId) {
      const cuenta = await getCliente(cliente.comercioPadreId);
      if (cuenta) portalUrl = `/portal/${cuenta.codigoAcceso}?sucursal=${cliente.id}`;
    }
    res.json({
      cliente: {
        ...cliente,
        metricaActual: m,
        portalUrl,
        sucursales,
        links,
        competidores,
        tapsPorDia,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/clientes/:id:", e);
    res.status(500).json({ error: "No se pudo cargar el cliente" });
  }
});

router.post("/clientes", express.json(), async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? "").trim();
    if (!nombre) {
      res.status(400).json({ error: "El nombre del negocio es obligatorio." });
      return;
    }

    const cliente = await crearCliente({
      nombre,
      rubro: req.body.rubro ?? "Otro",
      zona: req.body.zona ?? "Otra",
      plan: req.body.plan ?? "Base",
      estado: req.body.estado ?? "prospecto",
      contacto: req.body.contacto ?? "",
      fechaAlta: req.body.fechaAlta,
      googleReviewUrl: req.body.googleReviewUrl ?? "",
      busquedaClave: req.body.busquedaClave ?? "",
      fee: Number(req.body.fee) || 0,
      tonoMarca: req.body.tonoMarca ?? "cercano",
      googlePlaceId: req.body.googlePlaceId ?? "",
    });

    await registrarAuditoria(await emailAdminActual(req), "crear_cliente", `${cliente.nombre} (${cliente.id})`);
    res.status(201).json({ cliente });
  } catch (e) {
    console.error("POST /api/admin/clientes:", e);
    res.status(500).json({ error: "No se pudo crear el cliente" });
  }
});

router.put("/clientes/:id", express.json(), async (req, res) => {
  try {
    const id = req.params.id;
    const existente = await getCliente(id);
    if (!existente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const cliente = await actualizarCliente(id, {
      nombre: req.body.nombre,
      rubro: req.body.rubro,
      zona: req.body.zona,
      plan: req.body.plan,
      estado: req.body.estado,
      contacto: req.body.contacto,
      googleReviewUrl: req.body.googleReviewUrl,
      busquedaClave: req.body.busquedaClave,
      fee: req.body.fee !== undefined ? Number(req.body.fee) : undefined,
      tonoMarca: req.body.tonoMarca,
      googlePlaceId: req.body.googlePlaceId,
      emailNotificaciones: req.body.emailNotificaciones,
    });

    await registrarAuditoria(await emailAdminActual(req), "editar_cliente", id);
    res.json({ cliente });
  } catch (e) {
    console.error("PUT /api/admin/clientes/:id:", e);
    res.status(500).json({ error: "No se pudo actualizar el cliente" });
  }
});

router.delete("/clientes/:id", express.json(), async (req, res) => {
  try {
    const id = req.params.id;
    const cliente = await getCliente(id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const confirmar = String(req.body?.confirmarNombre ?? "").trim();
    if (confirmar !== cliente.nombre.trim()) {
      res.status(400).json({ error: "El nombre no coincide — no se borró nada." });
      return;
    }

    await eliminarCliente(id);
    await registrarAuditoria(await emailAdminActual(req), "eliminar_cliente", `${cliente.nombre} (${id})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/clientes/:id:", e);
    res.status(500).json({ error: "No se pudo eliminar el cliente" });
  }
});

router.post("/clientes/:id/sync-google", async (req, res) => {
  try {
    const id = req.params.id;
    const cliente = await getCliente(id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    if (!cliente.googlePlaceId) {
      res.status(400).json({ error: "Cargá el Google Place ID antes de sincronizar." });
      return;
    }
    const [places, gbp] = await Promise.all([sincronizarGoogle(id), sincronizarRendimiento(id)]);
    await registrarAuditoria(await emailAdminActual(req), "sync_google_cliente", id);
    const actualizado = await getCliente(id);
    res.json({ cliente: actualizado, places, gbp });
  } catch (e) {
    console.error("POST sync-google:", e);
    res.status(500).json({ error: "No se pudo sincronizar con Google" });
  }
});

router.post("/clientes/:id/google/desconectar", async (req, res) => {
  try {
    const id = req.params.id;
    const cliente = await getCliente(id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    await desconectarGoogleComercio(id);
    await registrarAuditoria(await emailAdminActual(req), "desconectar_google_cliente", id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo desconectar Google" });
  }
});

router.post("/clientes/:id/regenerar-codigo", async (req, res) => {
  try {
    const id = req.params.id;
    const cliente = await getCliente(id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    if (cliente.comercioPadreId) {
      res.status(400).json({ error: "El código de portal es de la cuenta, no de la sucursal." });
      return;
    }
    const actualizado = await regenerarCodigo(id);
    await registrarAuditoria(await emailAdminActual(req), "regenerar_codigo_portal", id);
    res.json({ cliente: actualizado });
  } catch (e) {
    res.status(500).json({ error: "No se pudo regenerar el código" });
  }
});

router.post("/clientes/:id/sucursales", express.json(), async (req, res) => {
  try {
    const cuentaId = req.params.id;
    const nombre = String(req.body?.nombre ?? "").trim();
    if (!nombre) {
      res.status(400).json({ error: "El nombre del local es obligatorio." });
      return;
    }
    const sucursal = await crearSucursal(cuentaId, {
      nombre,
      rubro: req.body.rubro ?? "Otro",
      zona: req.body.zona ?? "Otra",
      googlePlaceId: req.body.googlePlaceId ?? "",
      googleReviewUrl: req.body.googleReviewUrl ?? "",
      busquedaClave: req.body.busquedaClave ?? "",
    });
    await registrarAuditoria(await emailAdminActual(req), "crear_sucursal", `${nombre} (${sucursal.id})`);
    res.status(201).json({ sucursal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/clientes/:id/metricas", express.json(), async (req, res) => {
  try {
    const id = req.params.id;
    const cliente = await getCliente(id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    const mes = String(req.body?.mes ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      res.status(400).json({ error: "Mes inválido (YYYY-MM)" });
      return;
    }
    const esPremium = cliente.plan === "Premium";
    const metrica = {
      mes,
      resenasNuevas: Number(req.body.resenasNuevas) || 0,
      resenasTotal: Number(req.body.resenasTotal) || 0,
      ratingPromedio: Number(req.body.ratingPromedio) || 0,
      visitasPerfil: Number(req.body.visitasPerfil) || 0,
      llamadas: Number(req.body.llamadas) || 0,
      clicsComoLlegar: Number(req.body.clicsComoLlegar) || 0,
    };
    if (esPremium) {
      metrica.citasChatGPT = Number(req.body.citasChatGPT) || 0;
      metrica.citasCopilot = Number(req.body.citasCopilot) || 0;
      metrica.citasPerplexity = Number(req.body.citasPerplexity) || 0;
    }
    const actualizado = await guardarMetrica(id, metrica);
    res.json({ cliente: actualizado });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/clientes/:id/metricas", express.json(), async (req, res) => {
  try {
    const id = req.params.id;
    const mes = String(req.body?.mes ?? "").trim();
    if (!mes) {
      res.status(400).json({ error: "Falta el mes." });
      return;
    }
    const cliente = await eliminarMetrica(id, mes);
    res.json({ cliente });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/clientes/:id/links", express.json(), async (req, res) => {
  try {
    const comercioId = req.params.id;
    const etiqueta = String(req.body?.etiqueta ?? "").trim();
    if (!etiqueta) {
      res.status(400).json({ error: "La etiqueta es obligatoria." });
      return;
    }
    const destino = req.body.destino || "resena";
    const urlDestino = req.body.urlDestino || null;
    if (destino !== "resena" && !urlDestino) {
      res.status(400).json({ error: "Ese destino necesita una URL." });
      return;
    }
    if (urlDestino && !urlSegura(urlDestino)) {
      res.status(400).json({ error: "URL de destino inválida." });
      return;
    }
    const link = await crearLink(comercioId, {
      etiqueta,
      tipo: req.body.tipo || "nfc",
      destino,
      urlDestino,
      nombreEmpleado: req.body.nombreEmpleado || "",
    });
    res.status(201).json({ link });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/clientes/:id/links/:linkId", express.json(), async (req, res) => {
  try {
    const { id: comercioId, linkId } = req.params;
    const link = await getLinks(comercioId).then((ls) => ls.find((l) => l.id === linkId));
    if (!link) {
      res.status(404).json({ error: "Link no encontrado" });
      return;
    }
    const destino = req.body.destino ?? link.destino;
    const urlDestino = req.body.urlDestino !== undefined ? req.body.urlDestino : link.urlDestino;
    if (destino !== "resena" && !urlDestino) {
      res.status(400).json({ error: "Ese destino necesita una URL." });
      return;
    }
    const actualizado = await actualizarLinkAdmin(linkId, {
      etiqueta: req.body.etiqueta,
      tipo: req.body.tipo,
      destino: req.body.destino,
      urlDestino: req.body.urlDestino,
      activo: req.body.activo,
      nombreEmpleado: req.body.nombreEmpleado,
    });
    res.json({ link: actualizado });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/clientes/:id/links/:linkId", async (req, res) => {
  try {
    const { id: comercioId, linkId } = req.params;
    const link = await getLinks(comercioId).then((ls) => ls.find((l) => l.id === linkId));
    if (!link) {
      res.status(404).json({ error: "Link no encontrado" });
      return;
    }
    await eliminarLink(linkId);
    await registrarAuditoria(await emailAdminActual(req), "eliminar_link", linkId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/clientes/:id/competidores", express.json(), async (req, res) => {
  try {
    const comercioId = req.params.id;
    const nombre = String(req.body?.nombre ?? "").trim();
    if (!nombre) {
      res.status(400).json({ error: "El nombre es obligatorio." });
      return;
    }
    const comp = await crearCompetidor(comercioId, {
      nombre,
      rating: req.body.rating != null ? Number(req.body.rating) : null,
      totalResenas: req.body.totalResenas != null ? Number(req.body.totalResenas) : null,
      googlePlaceId: req.body.googlePlaceId || null,
    });
    res.status(201).json({ competidor: comp });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/clientes/:id/competidores/:compId", express.json(), async (req, res) => {
  try {
    const compId = Number(req.params.compId);
    const comp = await actualizarCompetidor(compId, {
      nombre: req.body.nombre,
      rating: req.body.rating !== undefined ? (req.body.rating === null ? null : Number(req.body.rating)) : undefined,
      totalResenas:
        req.body.totalResenas !== undefined
          ? req.body.totalResenas === null
            ? null
            : Number(req.body.totalResenas)
          : undefined,
      googlePlaceId: req.body.googlePlaceId,
    });
    res.json({ competidor: comp });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/clientes/:id/competidores/:compId/sync", async (req, res) => {
  try {
    const ok = await sincronizarCompetidor(Number(req.params.compId));
    if (!ok) {
      res.status(400).json({ error: "No se pudo sincronizar — revisá el Place ID." });
      return;
    }
    const competidores = await getCompetidores(req.params.id);
    res.json({ competidores });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/clientes/:id/competidores/:compId", async (req, res) => {
  try {
    const compId = Number(req.params.compId);
    await eliminarCompetidor(compId);
    await registrarAuditoria(await emailAdminActual(req), "eliminar_competidor", String(compId));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/clientes/:id/resenas", async (req, res) => {
  try {
    const cliente = await getCliente(req.params.id);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    const resenas = await getResenas(cliente.id);
    res.json({ cliente: { id: cliente.id, nombre: cliente.nombre, tonoMarca: cliente.tonoMarca }, resenas });
  } catch (e) {
    console.error("GET resenas:", e);
    res.status(500).json({ error: "No se pudieron cargar las reseñas" });
  }
});

router.post("/clientes/:id/resenas", express.json(), async (req, res) => {
  try {
    const comercioId = req.params.id;
    const cliente = await getCliente(comercioId);
    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const fecha = String(req.body?.fecha ?? "").trim() || new Date().toISOString().slice(0, 10);
    const hora = String(req.body?.hora ?? "").trim();
    const estrellas = Math.min(5, Math.max(1, Math.round(Number(req.body?.estrellas) || 5)));
    const autor = String(req.body?.autor ?? "").trim() || "Anónimo";
    const texto = String(req.body?.texto ?? "").trim();
    if (!texto) {
      res.status(400).json({ error: "El texto de la reseña es obligatorio." });
      return;
    }

    const resena = await crearResena(comercioId, {
      autor,
      estrellas,
      texto,
      plataforma: req.body.plataforma === "otra" ? "otra" : "google",
      fecha,
      creadoEn: hora ? `${fecha}T${hora}:00-03:00` : undefined,
    });

    if (estrellas <= 3) {
      await alertarResenaMala(cliente, { autor: resena.autor, estrellas: resena.estrellas, texto: resena.texto });
    }

    res.status(201).json({ resena });
  } catch (e) {
    console.error("POST resenas:", e);
    res.status(400).json({ error: e.message });
  }
});

router.put("/clientes/:id/resenas/:resenaId", express.json(), async (req, res) => {
  try {
    const comercioId = req.params.id;
    const resenaId = Number(req.params.resenaId);
    const resenas = await getResenas(comercioId);
    if (!resenas.find((r) => r.id === resenaId)) {
      res.status(404).json({ error: "Reseña no encontrada en este comercio." });
      return;
    }

    const resena = await actualizarResena(resenaId, {
      estado: req.body.estado,
      respuestaSugerida: req.body.respuestaSugerida,
      respuestaPublicada: req.body.respuestaPublicada,
      responsable: req.body.responsable,
      notas: req.body.notas,
    });
    res.json({ resena });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/hardware", async (_req, res) => {
  try {
    const [inventario, comercios] = await Promise.all([
      getInventarioHardware(),
      listarComerciosSelect(),
    ]);
    res.json({ inventario, comercios });
  } catch (e) {
    console.error("GET /api/admin/hardware:", e);
    res.status(500).json({ error: "No se pudo cargar el inventario" });
  }
});

router.post("/hardware/lotes", express.json(), async (req, res) => {
  try {
    const cantidad = Math.max(1, Math.min(500, Math.round(Number(req.body.cantidad) || 1)));
    const tipo = req.body.tipo || "ambos";
    const lote = String(req.body.lote ?? "").trim() || new Date().toISOString().slice(0, 10);
    const piezas = await generarLotePiezas(cantidad, tipo, lote);
    await registrarAuditoria(
      await emailAdminActual(req),
      "generar_lote_piezas",
      `${piezas.length} piezas · lote "${lote}" · ${tipo}`,
    );
    res.status(201).json({ piezas: piezas.length });
  } catch (e) {
    console.error("POST /api/admin/hardware/lotes:", e);
    res.status(500).json({ error: "No se pudo generar el lote" });
  }
});

router.post("/hardware/asignar", express.json(), async (req, res) => {
  try {
    const id = String(req.body.id ?? "");
    const comercioId = String(req.body.comercioId ?? "");
    if (!comercioId) {
      res.status(400).json({ error: "Elegí a qué cliente asignarla." });
      return;
    }
    const destino = req.body.destino || "resena";
    const urlDestino = req.body.urlDestino || null;
    if (destino !== "resena" && !urlDestino) {
      res.status(400).json({
        error: "Ese destino necesita una URL — cargala desde la ficha del cliente.",
      });
      return;
    }

    await asignarPiezaACliente(id, comercioId, {
      etiqueta: req.body.etiqueta || "Sin etiquetar",
      tipo: req.body.tipo || undefined,
      destino,
      urlDestino,
    });
    await registrarAuditoria(await emailAdminActual(req), "asignar_pieza_hardware", `${id} → ${comercioId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/hardware/asignar:", e);
    res.status(400).json({ error: e.message || "No se pudo asignar la pieza" });
  }
});

router.get("/qr", async (req, res) => {
  try {
    const linkId = String(req.query.linkId ?? "");
    if (!linkId) {
      res.status(400).json({ error: "Falta linkId" });
      return;
    }

    const link = await getLink(linkId);
    if (!link) {
      res.status(404).json({ error: "Link no encontrado" });
      return;
    }

    const targetUrl = urlPublicaDeTap(link.id, originPublico(req));
    const png = await generarQrPng(targetUrl);

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    if (req.query.download === "1") {
      res.set("Content-Disposition", `attachment; filename="qr-${link.id}.png"`);
    }
    res.send(png);
  } catch (e) {
    console.error("GET /api/admin/qr:", e);
    res.status(500).json({ error: "No se pudo generar el QR" });
  }
});

router.get("/hardware/qr-lote", async (req, res) => {
  try {
    const lote = req.query.lote ? String(req.query.lote) : null;
    const estado = String(req.query.estado ?? "libre");

    const inventario = await getInventarioHardware();
    const piezas = inventario.filter((p) => {
      if (lote && p.lote !== lote) return false;
      if (estado === "libre" && p.comercioId) return false;
      return true;
    });

    if (piezas.length === 0) {
      res.status(404).json({ error: "No hay piezas para descargar con ese filtro." });
      return;
    }

    const origin = originPublico(req);
    const zip = new JSZip();
    await Promise.all(
      piezas.map(async (pieza) => {
        const targetUrl = urlPublicaDeTap(pieza.id, origin);
        const png = await generarQrPng(targetUrl);
        zip.file(`qr-${pieza.id}.png`, png);
      }),
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const nombreArchivo = `metricsfield-qr${lote ? `-${lote}` : ""}.zip`;

    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    res.set("Cache-Control", "no-store");
    res.send(buffer);
  } catch (e) {
    console.error("GET /api/admin/hardware/qr-lote:", e);
    res.status(500).json({ error: "No se pudo generar el lote de QR" });
  }
});

router.get("/actividad", async (_req, res) => {
  try {
    const entradas = await getAuditoria(200);
    res.json({ entradas });
  } catch (e) {
    console.error("GET /api/admin/actividad:", e);
    res.status(500).json({ error: "No se pudo cargar la actividad" });
  }
});

router.get("/administradores", async (req, res) => {
  try {
    const { getAdmins } = require("../db/admins");
    const [admins, emailActual] = await Promise.all([getAdmins(), emailAdminActual(req)]);
    res.json({ admins, emailActual });
  } catch (e) {
    console.error("GET /api/admin/administradores:", e);
    res.status(500).json({ error: "No se pudo cargar la lista" });
  }
});

router.post("/administradores", express.json(), async (req, res) => {
  try {
    const { agregarAdmin } = require("../db/admins");
    const email = String(req.body?.email ?? "").trim();
    const nombre = String(req.body?.nombre ?? "").trim();
    if (!email) {
      res.status(400).json({ error: "El email es obligatorio." });
      return;
    }
    await agregarAdmin(email, nombre);
    await registrarAuditoria(await emailAdminActual(req), "agregar_admin", email);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/administradores", express.json(), async (req, res) => {
  try {
    const { eliminarAdmin } = require("../db/admins");
    const email = String(req.body?.email ?? "").trim();
    if (!email) {
      res.status(400).json({ error: "El email es obligatorio." });
      return;
    }
    await eliminarAdmin(email);
    await registrarAuditoria(await emailAdminActual(req), "eliminar_admin", email);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
