const crypto = require("node:crypto");
const { sql } = require("../sql");
const { limpiarUrl, slugify, mapMetrica, mapClienteRow } = require("../utils");

function generarCodigo() {
  return crypto.randomBytes(8).toString("hex");
}

async function ensambleHistorico(comercioId) {
  const rows = await sql`
    SELECT * FROM metricas_mensuales WHERE comercio_id = ${comercioId} ORDER BY mes ASC
  `;
  return rows.map(mapMetrica);
}

async function getCuentas() {
  const rows = await sql`
    SELECT * FROM comercios WHERE comercio_padre_id IS NULL ORDER BY fecha_alta ASC
  `;
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const metricas = await sql`
    SELECT * FROM metricas_mensuales
    WHERE comercio_id IN ${sql(ids)}
    ORDER BY mes ASC
  `;
  const porId = new Map();
  for (const r of metricas) {
    const id = r.comercio_id;
    const lista = porId.get(id);
    const m = mapMetrica(r);
    if (lista) lista.push(m);
    else porId.set(id, [m]);
  }

  return rows.map((row) => mapClienteRow(row, porId.get(row.id) ?? []));
}

async function getCliente(id) {
  const rows = await sql`SELECT * FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const historico = await ensambleHistorico(id);
  return mapClienteRow(rows[0], historico);
}

async function contarSucursalesPorCuenta() {
  const rows = await sql`
    SELECT comercio_padre_id, COUNT(*)::int AS n
    FROM comercios
    WHERE comercio_padre_id IS NOT NULL
    GROUP BY comercio_padre_id
  `;
  return new Map(rows.map((r) => [r.comercio_padre_id, Number(r.n)]));
}

async function crearCliente(datos) {
  let id = slugify(datos.nombre) || "comercio";
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM comercios WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugify(datos.nombre)}-${crypto.randomBytes(2).toString("hex")}`;
  }

  const codigoAcceso = generarCodigo();
  const fechaAlta = datos.fechaAlta || new Date().toISOString().slice(0, 10);

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO comercios (
        id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto,
        google_review_url, busqueda_clave, fee, tono_marca, fecha_alta, google_place_id, comercio_padre_id
      ) VALUES (
        ${id}, ${codigoAcceso}, ${datos.nombre}, ${datos.rubro}, ${datos.zona},
        ${datos.plan}, ${datos.estado}, ${datos.contacto ?? ""},
        ${limpiarUrl(datos.googleReviewUrl ?? "")}, ${datos.busquedaClave ?? ""},
        ${Number(datos.fee) || 0}, ${datos.tonoMarca ?? "cercano"}, ${fechaAlta},
        ${datos.googlePlaceId ?? ""}, ${datos.comercioPadreId ?? null}
      )
    `;
    await tx`
      INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
      VALUES (${`${id}-mostrador`}, ${id}, ${"Mostrador"}, ${"resena"})
    `;
  });

  return getCliente(id);
}

async function actualizarCliente(id, datos) {
  const rows = await sql`
    UPDATE comercios SET
      codigo_acceso = ${datos.codigoAcceso === undefined ? sql`codigo_acceso` : datos.codigoAcceso},
      nombre = ${datos.nombre === undefined ? sql`nombre` : datos.nombre},
      rubro = ${datos.rubro === undefined ? sql`rubro` : datos.rubro},
      zona = ${datos.zona === undefined ? sql`zona` : datos.zona},
      plan = ${datos.plan === undefined ? sql`plan` : datos.plan},
      estado = ${datos.estado === undefined ? sql`estado` : datos.estado},
      contacto = ${datos.contacto === undefined ? sql`contacto` : datos.contacto},
      google_review_url = ${datos.googleReviewUrl === undefined ? sql`google_review_url` : limpiarUrl(datos.googleReviewUrl)},
      busqueda_clave = ${datos.busquedaClave === undefined ? sql`busqueda_clave` : datos.busquedaClave},
      fee = ${datos.fee === undefined ? sql`fee` : datos.fee},
      tono_marca = ${datos.tonoMarca === undefined ? sql`tono_marca` : datos.tonoMarca},
      google_place_id = ${datos.googlePlaceId === undefined ? sql`google_place_id` : datos.googlePlaceId},
      email_notificaciones = ${datos.emailNotificaciones === undefined ? sql`email_notificaciones` : datos.emailNotificaciones}
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Comercio no encontrado: ${id}`);
  return getCliente(id);
}

async function eliminarCliente(id) {
  await sql`DELETE FROM comercios WHERE id = ${id}`;
}

async function getClientePorCodigo(codigo) {
  if (!codigo) return null;
  const rows = await sql`SELECT * FROM comercios WHERE codigo_acceso = ${codigo}`;
  if (rows.length === 0) return null;
  const historico = await ensambleHistorico(rows[0].id);
  return mapClienteRow(rows[0], historico);
}

async function getSucursales(cuentaId) {
  const rows = await sql`
    SELECT * FROM comercios WHERE comercio_padre_id = ${cuentaId} ORDER BY nombre ASC
  `;
  const out = [];
  for (const row of rows) {
    const historico = await ensambleHistorico(row.id);
    out.push(mapClienteRow(row, historico));
  }
  return out;
}

async function crearSucursal(cuentaId, datos) {
  const cuenta = await getCliente(cuentaId);
  if (!cuenta) throw new Error(`Cuenta no encontrada: ${cuentaId}`);
  if (cuenta.comercioPadreId) throw new Error("Una sucursal no puede tener sucursales propias.");
  return crearCliente({
    nombre: datos.nombre,
    rubro: datos.rubro,
    zona: datos.zona,
    googlePlaceId: datos.googlePlaceId ?? "",
    googleReviewUrl: datos.googleReviewUrl ?? "",
    busquedaClave: datos.busquedaClave ?? "",
    plan: cuenta.plan,
    estado: cuenta.estado,
    contacto: cuenta.contacto,
    fee: cuenta.fee,
    tonoMarca: cuenta.tonoMarca,
    fechaAlta: new Date().toISOString().slice(0, 10),
    comercioPadreId: cuentaId,
  });
}

async function regenerarCodigo(id) {
  return actualizarCliente(id, { codigoAcceso: generarCodigo() });
}

module.exports = {
  getCuentas,
  getCliente,
  getClientePorCodigo,
  getSucursales,
  contarSucursalesPorCuenta,
  crearCliente,
  crearSucursal,
  actualizarCliente,
  eliminarCliente,
  regenerarCodigo,
};
