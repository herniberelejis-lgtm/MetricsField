const crypto = require("node:crypto");
const { sql } = require("../sql");
const { limpiarUrl } = require("../utils");

function mapPieza(r) {
  return {
    id: r.id,
    comercioId: r.comercio_id ?? null,
    etiqueta: r.etiqueta,
    tipo: r.tipo ?? "nfc",
    lote: r.lote ?? "",
    destino: r.destino,
    urlDestino: r.url_destino ?? null,
    activo: Boolean(r.activo),
    autogestionado: Boolean(r.autogestionado),
    nombreNegocio: r.nombre_negocio ?? "",
    taps: Number(r.taps ?? 0),
    clienteNombre: r.cliente_nombre ?? null,
  };
}

async function getInventarioHardware() {
  const rows = await sql`
    SELECT l.*, co.nombre AS cliente_nombre, COUNT(t.id)::int AS taps
    FROM links_nfc l
    LEFT JOIN comercios co ON co.id = l.comercio_id
    LEFT JOIN taps t ON t.link_id = l.id
    GROUP BY l.id, co.nombre
    ORDER BY (l.comercio_id IS NULL) DESC, l.id ASC
  `;
  return rows.map(mapPieza);
}

async function generarLotePiezas(cantidad, tipo, lote) {
  const creadas = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('taply_lote_piezas'))`;

    const rows = await tx`SELECT id FROM links_nfc WHERE id LIKE 'p-%'`;
    let max = 0;
    for (const r of rows) {
      const m = /^p-(\d+)/.exec(r.id);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }

    const nuevas = [];
    for (let i = 1; i <= cantidad; i++) {
      const numero = String(max + i).padStart(4, "0");
      nuevas.push(`p-${numero}-${crypto.randomBytes(3).toString("hex")}`);
    }

    for (const id of nuevas) {
      await tx`
        INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino)
        VALUES (${id}, NULL, '', ${tipo}, ${lote}, 'resena')
      `;
    }

    return tx`
      SELECT l.*, NULL::text AS cliente_nombre, 0::int AS taps
      FROM links_nfc l
      WHERE l.id = ANY(${nuevas})
    `;
  });
  return creadas.map(mapPieza);
}

async function asignarPiezaACliente(id, comercioId, datos) {
  const rows = await sql`
    UPDATE links_nfc SET
      comercio_id = ${comercioId},
      etiqueta = ${datos.etiqueta},
      tipo = COALESCE(${datos.tipo ?? null}, tipo),
      destino = ${datos.destino},
      url_destino = ${limpiarUrl(datos.urlDestino) ?? null}
    WHERE id = ${id} AND comercio_id IS NULL
    RETURNING *
  `;
  if (rows.length === 0) {
    throw new Error("Esa pieza no está libre (ya fue asignada, o el código no existe).");
  }
  return mapPieza({ ...rows[0], cliente_nombre: null, taps: 0 });
}

async function listarComerciosSelect() {
  const rows = await sql`SELECT id, nombre FROM comercios ORDER BY nombre ASC`;
  return rows.map((r) => ({ id: r.id, nombre: r.nombre }));
}

module.exports = {
  getInventarioHardware,
  generarLotePiezas,
  asignarPiezaACliente,
  listarComerciosSelect,
};
