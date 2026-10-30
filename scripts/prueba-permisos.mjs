// Prueba cruzada de permisos contra la app REAL (build de producción
// corriendo con `next start`) y una base Postgres con db/seed.sql. Corre en
// el CI en cada PR; también a mano:
//
//   DATABASE_URL=... ADMIN_PASSWORD=... node scripts/prueba-permisos.mjs
//
// Identidades (datos de db/seed.sql, nunca datos reales):
//   A = barberia-guemes (código bg7k2m4p) · B = resto-nueva-cordoba (rn9x3c5v)
//   G = gym-guemes (gg8u3i6o) con gate de Google · X = vet-cerro (vc4r7t2y) en baja
//   anónimo = sin código ni cookies
//
// Cada intento ajeno se verifica en la BASE (no solo por el código HTTP), y
// cada denegación tiene su control positivo (A sí puede tocar lo suyo): si
// la prueba se rompiera y todo diera "denegado", los positivos fallan.
//
// MODO=produccion verifica además que en producción NO se entra con la
// contraseña compartida (el server tiene que correr con VERCEL_ENV=production).

import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import postgres from "postgres";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const MODO = process.env.MODO ?? "preview";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const manifiesto = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const ACCION = {};
for (const [id, v] of Object.entries(manifiesto.node)) ACCION[v.exportedName ?? v.name] ??= id;

const resultados = [];
function registrar(identidad, intento, esperado, real, ok) {
  resultados.push({ ok, identidad, intento, esperado, real });
}

let ipSecuencia = 0;
function ipNueva() {
  ipSecuencia += 1;
  return `10.20.${Math.floor(ipSecuencia / 250)}.${ipSecuencia % 250}`;
}

/** Envío de <form> nativo con server action (FormData como único argumento). */
async function accionForm(nombre, campos, { pagina = "/portal/x", ip = ipNueva(), cookie } = {}) {
  const fd = new FormData();
  fd.append(`$ACTION_ID_${ACCION[nombre]}`, "");
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  const headers = { "x-real-ip": ip };
  if (cookie) headers.cookie = cookie;
  return fetch(BASE + pagina, { method: "POST", body: fd, headers, redirect: "manual" });
}

/** Server action con argumentos sueltos (como la llama un componente cliente). */
async function accionArgs(nombre, args, { ip = ipNueva(), pagina = "/portal/x", cookie } = {}) {
  const headers = { "Next-Action": ACCION[nombre], Accept: "text/x-component", "x-real-ip": ip };
  if (cookie) headers.cookie = cookie;
  return fetch(`${BASE}${pagina}`, { method: "POST", headers, body: JSON.stringify(args) });
}

/** La cookie del llavero de piezas que devolvió una action (Set-Cookie). */
function llaveroDe(respuesta) {
  const c = (respuesta.headers.getSetCookie?.() ?? []).find((x) => x.startsWith("mf_llavero="));
  return c ? c.split(";")[0] : "";
}

async function uno(query) {
  const filas = await query;
  return filas[0] ?? {};
}
const urlLink = async (id) => (await uno(sql`SELECT coalesce(url_destino,'') AS u FROM links_nfc WHERE id = ${id}`)).u;
const comercio = (id) => uno(sql`SELECT * FROM comercios WHERE id = ${id}`);

// ---------- Preparación ----------
await sql`UPDATE links_nfc SET url_destino = NULL`;
await sql`UPDATE comercios SET google_refresh_token = '', google_conectado_en = NULL,
          auto_responder_positivas = false, auto_responder_umbral = 4`;
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'vet-cerro'`;
await sql`INSERT INTO portal_usuarios (comercio_id, email) VALUES ('gym-guemes', 'duenio@ejemplo.test')
          ON CONFLICT DO NOTHING`;

// ---------- Portal: A contra B y B contra A ----------
await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes", linkId: "resto-nueva-cordoba-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
let u = await urlLink("resto-nueva-cordoba-mostrador");
registrar("A", "editar el cartel de B (comercioId de A)", "denegado", `url de B = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "resto-nueva-cordoba", linkId: "resto-nueva-cordoba-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
u = await urlLink("resto-nueva-cordoba-mostrador");
registrar("A", "editar el cartel de B (comercioId de B)", "denegado", `url de B = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "rn9x3c5v", comercioId: "resto-nueva-cordoba", linkId: "barberia-guemes-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("B", "editar el cartel de A", "denegado", `url de A = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes", linkId: "barberia-guemes-mostrador",
  etiqueta: "x", urlDestino: "javascript:alert(document.cookie)",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("A", "guardar un destino javascript:", "rechazado", `url de A = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes", linkId: "barberia-guemes-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://propio.example",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("A", "editar SU propio cartel (control positivo)", "permitido", `url de A = '${u}'`, u === "https://propio.example");

await sql`UPDATE comercios SET google_refresh_token = 'tok-b' WHERE id = 'resto-nueva-cordoba'`;
await accionForm("accionDesconectarGoogleComercioPortal", { codigo: "bg7k2m4p", comercioId: "resto-nueva-cordoba" });
let c = await comercio("resto-nueva-cordoba");
registrar("A", "desconectar el Google de B", "denegado", `token de B = '${c.google_refresh_token}'`, c.google_refresh_token === "tok-b");

let r = await accionArgs("accionObtenerTapsPorHora", ["bg7k2m4p", "resto-nueva-cordoba", "2026-09-01"]);
let cuerpo = (await r.text()).trim();
registrar("A", "leer los taps por hora de B", "lista vacía", cuerpo.slice(-20), cuerpo.endsWith("[]"));

r = await accionArgs("accionObtenerTapsPorHora", ["bg7k2m4p", "barberia-guemes", "2026-09-01"]);
cuerpo = (await r.text()).trim();
registrar("A", "leer SUS taps por hora (control positivo)", "24 horas", cuerpo.slice(-20), cuerpo.includes('"hora":23'));

await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "codigo-inventado", comercioId: "barberia-guemes", autoResponderPositivas: "on", autoResponderUmbral: "5",
});
c = await comercio("barberia-guemes");
registrar("anónimo", "acción del portal con código inventado", "denegado", `auto = ${c.auto_responder_positivas}`, c.auto_responder_positivas === false);

await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes", autoResponderPositivas: "on", autoResponderUmbral: "5",
});
c = await comercio("barberia-guemes");
registrar("A", "cambiar SU automatización (control positivo)", "permitido",
  `auto = ${c.auto_responder_positivas}/${c.auto_responder_umbral}`, c.auto_responder_positivas === true && c.auto_responder_umbral === 5);

// ---------- Gate de Google y cuenta en baja ----------
await sql`UPDATE comercios SET google_refresh_token = 'tok-g' WHERE id = 'gym-guemes'`;
await accionForm("accionDesconectarGoogleComercioPortal", { codigo: "gg8u3i6o", comercioId: "gym-guemes" });
c = await comercio("gym-guemes");
registrar("código sin Google", "desconectar Google en un portal con gate", "denegado", `token = '${c.google_refresh_token}'`, c.google_refresh_token === "tok-g");

await sql`UPDATE comercios SET estado = 'baja' WHERE id = 'vet-cerro'`;
await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "vc4r7t2y", comercioId: "vet-cerro", autoResponderPositivas: "on", autoResponderUmbral: "5",
});
c = await comercio("vet-cerro");
registrar("ex cliente (baja)", "acción del portal con su código", "denegado", `auto = ${c.auto_responder_positivas}`, c.auto_responder_positivas === false);
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'vet-cerro'`;

// ---------- Sucursales: su código propio NO abre el portal ----------
// S = sucursal de A creada acá (no está en db/seed.sql) con su propio
// codigo_acceso en la base, como las crea crearCliente. El portal se abre
// solo con el código de la cuenta raíz (C2 del security audit 2026-10).
await sql`DELETE FROM links_nfc WHERE id = 'barberia-guemes-centro-mostrador'`;
await sql`DELETE FROM comercios WHERE id = 'barberia-guemes-centro'`;
await sql`CREATE TEMP TABLE sucursal_prueba AS SELECT * FROM comercios WHERE id = 'barberia-guemes'`;
await sql`UPDATE sucursal_prueba SET id = 'barberia-guemes-centro', nombre = 'Barbería Güemes Centro',
          codigo_acceso = 'suc7k2m4', comercio_padre_id = 'barberia-guemes'`;
await sql`INSERT INTO comercios SELECT * FROM sucursal_prueba`;
await sql`DROP TABLE sucursal_prueba`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
          VALUES ('barberia-guemes-centro-mostrador', 'barberia-guemes-centro', 'Mostrador', 'resena')`;

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "suc7k2m4", comercioId: "barberia-guemes-centro", linkId: "barberia-guemes-centro-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
u = await urlLink("barberia-guemes-centro-mostrador");
registrar("código propio de una sucursal", "editar el cartel de la sucursal", "denegado", `url de S = '${u}'`, u === "");

r = await fetch(`${BASE}/portal/suc7k2m4`, { headers: { "x-real-ip": ipNueva() } });
registrar("código propio de una sucursal", "abrir el portal", "404", `HTTP ${r.status}`, r.status === 404);

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes-centro", linkId: "barberia-guemes-centro-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://centro.example",
});
u = await urlLink("barberia-guemes-centro-mostrador");
registrar("A", "editar el cartel de SU sucursal (control positivo)", "permitido", `url de S = '${u}'`, u === "https://centro.example");

await sql`UPDATE comercios SET estado = 'baja' WHERE id = 'barberia-guemes-centro'`;
await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "bg7k2m4p", comercioId: "barberia-guemes-centro", linkId: "barberia-guemes-centro-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://otra.example",
});
u = await urlLink("barberia-guemes-centro-mostrador");
registrar("A", "editar el cartel de una sucursal dada de baja", "denegado", `url de S = '${u}'`, u === "https://centro.example");
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'barberia-guemes-centro'`;

// ---------- Competidores que arma el propio cliente ----------
await sql`DELETE FROM competidores WHERE comercio_id IN ('resto-nueva-cordoba', 'gym-guemes')`;
const [{ id: compB }] = await sql`INSERT INTO competidores (comercio_id, nombre, google_place_id)
  VALUES ('resto-nueva-cordoba', 'Competidor de B', 'ChIJcompetidorDeBprueba01') RETURNING id`;
await accionArgs("accionQuitarCompetidorPortal", ["bg7k2m4p", "barberia-guemes", compB]);
await accionArgs("accionQuitarCompetidorPortal", ["bg7k2m4p", "resto-nueva-cordoba", compB]);
let [{ n: compBQuedan }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE id = ${compB}`;
registrar("A", "quitar un competidor de B", "denegado", `filas = ${compBQuedan}`, compBQuedan === 1);

await accionArgs("accionAgregarCompetidorPortal", ["gg8u3i6o", "gym-guemes", "ChIJcompetidorIntruso0001", "Intruso"]);
let [{ n: compG }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE comercio_id = 'gym-guemes'`;
registrar("código sin Google", "agregar un competidor en un portal con gate", "denegado", `filas = ${compG}`, compG === 0);

await accionArgs("accionQuitarCompetidorPortal", ["rn9x3c5v", "resto-nueva-cordoba", compB]);
[{ n: compBQuedan }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE id = ${compB}`;
registrar("B", "quitar SU competidor (control positivo)", "permitido", `filas = ${compBQuedan}`, compBQuedan === 0);

r = await fetch(`${BASE}/portal/rn9x3c5v`, { headers: { "x-real-ip": ipNueva() } });
cuerpo = await r.text();
registrar("quien tiene el código de B", "abrir el portal de B", "ve solo a B",
  `HTTP ${r.status}, ¿aparece A? ${cuerpo.includes("Barbería")}`, r.status === 200 && !cuerpo.includes("Barbería"));

// ---------- Carteles de clientes borrados: no se pueden reclamar ----------
// Solo es reclamable inventario nunca usado (activo, sin etiqueta ni destino).
await sql`DELETE FROM links_nfc WHERE id IN ('p-9999-e2e001', 'huerfano-mostrador')`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino) VALUES
          ('p-9999-e2e001', NULL, '', 'nfc', 'e2e', 'resena'),
          ('huerfano-mostrador', NULL, 'Mostrador', 'nfc', '', 'resena')`;
await accionArgs("activarCartel", ["huerfano-mostrador", { nombre: "Intruso", url: "https://g.page/r/intruso-huerfano/review", pin: "4829" }]);
registrar("anónimo", "reclamar un link huérfano (de un cliente borrado)", "denegado",
  `url = '${await urlLink("huerfano-mostrador")}'`, (await urlLink("huerfano-mostrador")) === "");
r = await fetch(`${BASE}/t/huerfano-mostrador`, { headers: { "x-real-ip": ipNueva() } });
registrar("anónimo", "abrir el cartel de un cliente borrado", "404 (no ofrece activarlo)", `HTTP ${r.status}`, r.status === 404);
await accionArgs("activarCartel", ["p-9999-e2e001", { nombre: "Mi negocio", url: "https://g.page/r/bueno-e2e/review", pin: "5182" }]);
registrar("comprador", "activar una pieza de inventario (control positivo)", "permitido",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");

// Un comprador anónimo no puede convertir su pieza en un redireccionador a
// cualquier sitio: el destino tiene que ser de Google.
await sql`DELETE FROM links_nfc WHERE id = 'p-9999-e2e004'`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino) VALUES ('p-9999-e2e004', NULL, '', 'nfc', 'e2e', 'resena')`;
await accionArgs("activarCartel", ["p-9999-e2e004", { nombre: "Phishing", url: "https://phishing.example/login", pin: "5182" }]);
registrar("comprador", "activar su pieza con un destino que no es de Google", "denegado",
  `url = '${await urlLink("p-9999-e2e004")}'`, (await urlLink("p-9999-e2e004")) === "");
await accionArgs("editarCartel", ["p-9999-e2e001", "5182", { nombre: "Phishing", url: "https://phishing.example/login" }]);
registrar("comprador", "cambiar el destino de su pieza a otro sitio (con PIN correcto)", "denegado",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");

// ---------- Llavero de piezas: cambiar sin PIN solo desde el celular que la maneja ----------
await accionArgs("editarCartel", ["p-9999-e2e001", "", { nombre: "Sin PIN", url: "https://g.page/r/intruso-sin-pin/review" }]);
registrar("anónimo", "cambiar una pieza sin PIN ni llavero", "denegado",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");
await accionArgs("editarCartel", ["p-9999-e2e001", "", { nombre: "Falsa", url: "https://g.page/r/intruso-falso/review" }], {
  pagina: "/t/p-9999-e2e001", cookie: "mf_llavero=p-9999-e2e001.AAAAAAAAAAAAAAAA",
});
registrar("llavero falsificado", "cambiar una pieza ajena sin PIN", "denegado",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");

await sql`DELETE FROM links_nfc WHERE id = 'p-9999-e2e005'`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino) VALUES ('p-9999-e2e005', NULL, '', 'nfc', 'e2e', 'resena')`;
r = await accionArgs("activarCartel", ["p-9999-e2e005", { nombre: "Revendedor", url: "https://g.page/r/revendedor-1/review", pin: "2468" }], {
  pagina: "/t/p-9999-e2e005",
});
// La activación devuelve un ticket que el navegador canjea en /t/llavero.
const ticket = ((await r.text()).match(/"ticket":"([^"]+)"/) ?? [])[1] ?? "";
const canjear = (t) =>
  fetch(`${BASE}/t/llavero`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ipNueva() },
    body: JSON.stringify({ op: "sumar-ticket", ticket: t }),
  });
const [, hastaT, firmaT] = ticket.split(".");
r = await canjear(`p-9999-e2e001.${hastaT}.${firmaT}`);
registrar("comprador", "pasar el ticket de SU pieza recién activada a otra pieza", "denegado", `HTTP ${r.status}, cookie ${llaveroDe(r) ? "sí" : "no"}`, r.status === 400 && !llaveroDe(r));
r = await canjear(ticket);
const llaveroPropio = llaveroDe(r);
registrar("comprador", "activar una pieza le da el llavero de esa pieza", "cookie mf_llavero", llaveroPropio ? "sí" : "no", llaveroPropio.includes("p-9999-e2e005."));
await accionArgs("editarCartel", ["p-9999-e2e005", "", { nombre: "Local 2", url: "https://g.page/r/revendedor-2/review" }], {
  pagina: "/t/p-9999-e2e005", cookie: llaveroPropio,
});
registrar("comprador", "cambiar su pieza sin PIN desde su celular (control positivo)", "permitido",
  `url = '${await urlLink("p-9999-e2e005")}'`, (await urlLink("p-9999-e2e005")) === "https://g.page/r/revendedor-2/review");
const conOtraPieza = llaveroPropio.replace("p-9999-e2e005.", "p-9999-e2e001.");
await accionArgs("editarCartel", ["p-9999-e2e001", "", { nombre: "Ajena", url: "https://g.page/r/intruso-ajena/review" }], {
  pagina: "/t/p-9999-e2e001", cookie: `${llaveroPropio}; ${conOtraPieza}`,
});
registrar("comprador", "usar el llavero de SU pieza contra otra pieza", "denegado",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");
const pinAntes = (await uno(sql`SELECT pin_salt AS s FROM links_nfc WHERE id = 'p-9999-e2e001'`)).s;
await accionArgs("entregarPieza", ["p-9999-e2e001", "7364"], { pagina: "/t/p-9999-e2e001", cookie: conOtraPieza });
const pinDespues = (await uno(sql`SELECT pin_salt AS s FROM links_nfc WHERE id = 'p-9999-e2e001'`)).s;
registrar("comprador", "entregar (cambiar el PIN de) una pieza ajena", "denegado", pinAntes === pinDespues ? "PIN igual" : "PIN cambiado", pinAntes === pinDespues);
r = await accionArgs("entregarPieza", ["p-9999-e2e005"], { pagina: "/t/p-9999-e2e005", cookie: llaveroPropio });
const pinEntregado = ((await r.text()).match(/"pin":"(\d+)"/) ?? [])[1] ?? "";
await accionArgs("editarCartel", ["p-9999-e2e005", "", { nombre: "Ya no es mía", url: "https://g.page/r/revendedor-3/review" }], {
  pagina: "/t/p-9999-e2e005", cookie: llaveroPropio,
});
registrar("revendedor", "cambiar una pieza que ya entregó (llavero viejo)", "denegado",
  `url = '${await urlLink("p-9999-e2e005")}'`, (await urlLink("p-9999-e2e005")) === "https://g.page/r/revendedor-2/review");

// Dejar en blanco: solo quien maneja la pieza, y la deja reclamable de nuevo.
await accionArgs("dejarEnBlanco", ["p-9999-e2e001"], { pagina: "/t/mis-piezas", cookie: conOtraPieza });
registrar("comprador", "dejar en blanco una pieza ajena", "denegado",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://g.page/r/bueno-e2e/review");
await accionArgs("dejarEnBlanco", ["p-9999-e2e005"], { pagina: "/t/mis-piezas", cookie: llaveroPropio });
registrar("revendedor", "dejar en blanco una pieza que ya entregó (llavero viejo)", "denegado",
  `url = '${await urlLink("p-9999-e2e005")}'`, (await urlLink("p-9999-e2e005")) === "https://g.page/r/revendedor-2/review");
r = await accionArgs("sumarPieza", ["p-9999-e2e005", pinEntregado], { pagina: "/t/p-9999-e2e005/editar" });
const llaveroDuenio = llaveroDe(r);
await accionArgs("dejarEnBlanco", ["p-9999-e2e005"], { pagina: "/t/mis-piezas", cookie: llaveroDuenio });
const enBlanco = await uno(sql`SELECT url_destino, autogestionado, pin_hash FROM links_nfc WHERE id = 'p-9999-e2e005'`);
registrar("dueño", "dejar en blanco su pieza (control positivo)", "sin destino ni PIN",
  `url = '${enBlanco.url_destino}', PIN ${enBlanco.pin_hash ? "sí" : "no"}`,
  Boolean(llaveroDuenio) && enBlanco.url_destino === null && !enBlanco.autogestionado && !enBlanco.pin_hash);
await accionArgs("activarCartel", ["p-9999-e2e005", { nombre: "Otro local", url: "https://g.page/r/otro-local/review", pin: "8053" }], {
  pagina: "/t/p-9999-e2e005",
});
registrar("comprador", "activar una pieza que se dejó en blanco", "permitido",
  `url = '${await urlLink("p-9999-e2e005")}'`, (await urlLink("p-9999-e2e005")) === "https://g.page/r/otro-local/review");

// El contacto del comprador solo se guarda si marcó la casilla de aceptación.
await sql`DELETE FROM links_nfc WHERE id IN ('p-9999-e2e002', 'p-9999-e2e003')`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino) VALUES
          ('p-9999-e2e002', NULL, '', 'nfc', 'e2e', 'resena'),
          ('p-9999-e2e003', NULL, '', 'nfc', 'e2e', 'resena')`;
await accionArgs("activarCartel", ["p-9999-e2e003", { nombre: "Fácil", url: "https://g.page/r/pin-facil/review", pin: "1234" }], {
  pagina: "/t/p-9999-e2e003",
});
registrar("comprador", "activar con un PIN trivial (1234)", "denegado",
  `url = '${await urlLink("p-9999-e2e003")}'`, (await urlLink("p-9999-e2e003")) === "");
await accionArgs("activarCartel", ["p-9999-e2e002", {
  nombre: "Sin permiso", url: "https://g.page/r/bueno-e2e-2/review", pin: "5182", email: "sinpermiso@ejemplo.test", aceptaNovedades: false,
}]);
let contacto = (await uno(sql`SELECT contacto_email AS e FROM links_nfc WHERE id = 'p-9999-e2e002'`)).e;
registrar("comprador", "dejar su mail SIN marcar la casilla", "no se guarda",
  `mail = '${contacto}', url = '${await urlLink("p-9999-e2e002")}'`, contacto === "" && (await urlLink("p-9999-e2e002")) === "https://g.page/r/bueno-e2e-2/review");
await accionArgs("activarCartel", ["p-9999-e2e003", {
  nombre: "Con permiso", url: "https://g.page/r/bueno-e2e-3/review", pin: "5182", email: "conpermiso@ejemplo.test", aceptaNovedades: true,
}]);
contacto = (await uno(sql`SELECT contacto_email AS e FROM links_nfc WHERE id = 'p-9999-e2e003'`)).e;
registrar("comprador", "dejar su mail marcando la casilla (control positivo)", "se guarda", `mail = '${contacto}'`, contacto === "conpermiso@ejemplo.test");

if (MODO !== "produccion") {
  // Borrar un cliente borra sus carteles: no quedan huérfanos reclamables.
  await sql`DELETE FROM comercios WHERE id = 'e2e-borrable'`;
  await sql`DELETE FROM links_nfc WHERE id = 'e2e-borrable-mesa'`;
  await sql`INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado)
            VALUES ('e2e-borrable', 'e2e-borrable-cod', 'Borrable E2E', 'Otro', 'Centro', 'Base', 'activo')`;
  await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, destino) VALUES ('e2e-borrable-mesa', 'e2e-borrable', 'Mesa', 'resena')`;
  await accionForm("accionEliminarCliente", { id: "e2e-borrable", confirmarNombre: "Borrable E2E" }, {
    pagina: "/admin/clientes", cookie: await cookiePasswordValida(),
  });
  await accionArgs("activarCartel", ["e2e-borrable-mesa", { nombre: "Intruso", url: "https://g.page/r/intruso-borrado/review", pin: "4829" }]);
  const [{ n: linkBorrado }] = await sql`SELECT count(*)::int AS n FROM links_nfc WHERE id = 'e2e-borrable-mesa'`;
  const [{ n: comercioBorrado }] = await sql`SELECT count(*)::int AS n FROM comercios WHERE id = 'e2e-borrable'`;
  registrar("anónimo", "reclamar el cartel de un cliente recién borrado", "no existe",
    `comercio = ${comercioBorrado}, link = ${linkBorrado}`, comercioBorrado === 0 && linkBorrado === 0);
}

// ---------- Acciones de admin sin sesión ----------
const [{ n: comerciosAntes }] = await sql`SELECT count(*)::int AS n FROM comercios`;
for (const pagina of ["/portal/x", "/login", "/admin/clientes"]) {
  await accionForm("accionEliminarCliente", { id: "taller-alberdi" }, { pagina });
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM comercios`;
  registrar("anónimo", `borrar un cliente vía POST a ${pagina}`, "denegado", `comercios ${comerciosAntes} → ${n}`, n === comerciosAntes);
}
await accionForm("accionAgregarAdmin", { email: "atacante@ejemplo.test" });
let [{ n: adminsAtacante }] = await sql`SELECT count(*)::int AS n FROM admins WHERE email = 'atacante@ejemplo.test'`;
registrar("anónimo", "agregarse como admin", "denegado", `filas = ${adminsAtacante}`, adminsAtacante === 0);

await accionForm("accionEliminarCliente", { id: "taller-alberdi" }, {
  pagina: "/admin/clientes", cookie: "admin_session=123.falsa; admin_google_session=x.y",
});
const [{ n: comerciosDespues }] = await sql`SELECT count(*)::int AS n FROM comercios`;
registrar("cookies falsificadas", "borrar un cliente", "denegado", `comercios = ${comerciosDespues}`, comerciosDespues === comerciosAntes);

for (const [ruta, esperado] of [
  ["/admin", [307, 308]], ["/admin/clientes", [307, 308]], ["/api/admin/qr?slug=x", [401]],
  ["/api/places-search?q=pizza", [401]], ["/api/admin/hardware/qr-lote?lote=x", [401]],
]) {
  r = await fetch(BASE + ruta, { redirect: "manual" });
  registrar("anónimo", `GET ${ruta}`, esperado.join("/"), `HTTP ${r.status}`, esperado.includes(r.status));
}
for (const [headers, desc] of [[{}, "sin Authorization"], [{ Authorization: "Bearer adivinado" }, "Bearer incorrecto"]]) {
  r = await fetch(`${BASE}/api/cron/sync-google`, { headers });
  registrar("anónimo", `cron ${desc}`, "401", `HTTP ${r.status}`, r.status === 401);
}

// ---------- Límites de intentos ----------
const ipPortal = ipNueva();
let ultimo;
for (let i = 0; i < 21; i++) ultimo = (await fetch(`${BASE}/portal/bg7k2m4p`, { headers: { "x-real-ip": ipPortal } })).status;
registrar("anónimo", "21 visitas al portal desde la misma IP", "404 al pasar el límite", `último HTTP ${ultimo}`, ultimo === 404);

// ---------- Login del panel ----------
async function cookiePasswordValida() {
  const exp = String(Date.now() + 60 * 60 * 1000);
  const firma = crypto.createHmac("sha256", PASSWORD).update(`pw.${exp}`).digest("base64url");
  return `admin_session=${exp}.${firma}`;
}

if (MODO === "produccion") {
  r = await accionForm("accionLogin", { password: PASSWORD }, { pagina: "/login" });
  const destino = r.headers.get("location") ?? "";
  registrar("equipo", "entrar con la contraseña correcta en producción", "rechazado (solo Google)", destino, destino.includes("solo-google"));

  r = await fetch(`${BASE}/admin`, { redirect: "manual", headers: { cookie: await cookiePasswordValida() } });
  registrar("equipo", "abrir /admin con una cookie de contraseña VÁLIDA", "redirige a /login",
    `HTTP ${r.status} ${r.headers.get("location") ?? ""}`, [307, 308].includes(r.status));

  cuerpo = await (await fetch(`${BASE}/login`)).text();
  registrar("anónimo", "/login muestra campo de contraseña", "no", `¿aparece? ${cuerpo.includes('type="password"')}`, !cuerpo.includes('type="password"'));
} else {
  const ipLogin = ipNueva();
  const destinos = [];
  for (let i = 0; i < 11; i++) {
    r = await accionForm("accionLogin", { password: `mal-${i}` }, { pagina: "/login", ip: ipLogin });
    destinos.push(r.headers.get("location") ?? "");
  }
  registrar("anónimo", "11 contraseñas incorrectas desde la misma IP", "bloqueado", destinos.at(-1), destinos.at(-1).includes("limite"));

  r = await fetch(`${BASE}/admin`, { redirect: "manual", headers: { cookie: await cookiePasswordValida() } });
  registrar("equipo", "abrir /admin con cookie de contraseña válida (control positivo)", "200", `HTTP ${r.status}`, r.status === 200);
}

// ---------- Reporte ----------
await sql.end();
const fallas = resultados.filter((x) => !x.ok);
for (const x of resultados) {
  console.log(`${x.ok ? "✔" : "✘"} [${x.identidad}] ${x.intento} — esperado: ${x.esperado} · real: ${x.real}`);
}
console.log(`\n${resultados.length - fallas.length}/${resultados.length} OK (modo ${MODO})`);
process.exit(fallas.length > 0 ? 1 : 0);
