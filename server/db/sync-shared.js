const { sql } = require("../sql");
const { accessTokenDesdeRefresh } = require("../google-oauth");
const { descifrar } = require("../crypto");
const { listarUbicaciones } = require("../gbp");
const { reportarFalla } = require("../monitor");

const LOTE_SYNC = 5;

async function sincronizarEnLotes(ids, fn) {
  const exitosos = [];
  for (let i = 0; i < ids.length; i += LOTE_SYNC) {
    const lote = ids.slice(i, i + LOTE_SYNC);
    const resultados = await Promise.allSettled(lote.map(fn));
    resultados.forEach((r, j) => {
      if (r.status === "fulfilled") exitosos.push(r.value);
      else void reportarFalla("sync", r.reason, { comercio: String(lote[j]) });
    });
  }
  return exitosos;
}

async function accessTokenGBPComercio(id) {
  const rows = await sql`SELECT google_refresh_token FROM comercios WHERE id = ${id}`;
  const refresh = rows[0]?.google_refresh_token;
  if (!refresh) return null;
  return accessTokenDesdeRefresh(descifrar(refresh));
}

async function resolverLocationGBP(id, token) {
  const rows = await sql`SELECT google_place_id, google_location FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const location = rows[0].google_location;
  if (location) return location;

  const placeId = rows[0].google_place_id;
  if (!placeId) return null;
  const ubicaciones = await listarUbicaciones(token);
  const match = ubicaciones.find((u) => u.placeId === placeId);
  if (!match) return null;
  await sql`UPDATE comercios SET google_location = ${match.location} WHERE id = ${id}`;
  return match.location;
}

module.exports = {
  LOTE_SYNC,
  sincronizarEnLotes,
  accessTokenGBPComercio,
  resolverLocationGBP,
};
