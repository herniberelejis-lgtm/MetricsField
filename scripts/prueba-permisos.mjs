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
async function accionArgs(nombre, args, { ip = ipNueva() } = {}) {
  return fetch(`${BASE}/portal/x`, {
    method: "POST",
    headers: { "Next-Action": ACCION[nombre], Accept: "text/x-component", "x-real-ip": ip },
    body: JSON.stringify(args),
  });
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

r = await fetch(`${BASE}/portal/rn9x3c5v`, { headers: { "x-real-ip": ipNueva() } });
cuerpo = await r.text();
registrar("quien tiene el código de B", "abrir el portal de B", "ve solo a B",
  `HTTP ${r.status}, ¿aparece A? ${cuerpo.includes("Barbería")}`, r.status === 200 && !cuerpo.includes("Barbería"));

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
