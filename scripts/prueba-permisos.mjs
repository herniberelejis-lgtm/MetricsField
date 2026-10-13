// Prueba cruzada de permisos contra la app REAL (build de producción
// corriendo con `next start`) y una base Postgres con db/seed.sql. Corre en
// el CI en cada PR; también a mano:
//
//   DATABASE_URL=... ADMIN_PASSWORD=... node scripts/prueba-permisos.mjs
//
// Identidades (datos de db/seed.sql, nunca datos reales):
//   A = barberia-guemes (código e2e-bg7k2m4p) · B = resto-nueva-cordoba (e2e-rn9x3c5v)
//   G = gym-guemes (e2e-gg8u3i6o) con gate de Google · X = vet-cerro (e2e-vc4r7t2y) en baja
//   (los códigos de db/seed.sql están publicados en el repo, así que en
//   producción son de solo lectura — ver lib/portal-demo.ts; acá se rotan
//   con el prefijo e2e- para poder probar escrituras en los dos modos)
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
// Este script reescribe datos en masa (links, códigos, comercios): jamás
// contra la base de producción.
if (/neon\.tech/i.test(process.env.DATABASE_URL ?? "")) {
  console.error("prueba-permisos: DATABASE_URL apunta a Neon. Esto es solo para una base de prueba.");
  process.exit(2);
}
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
await sql`UPDATE comercios SET codigo_acceso = 'e2e-' || codigo_acceso
          WHERE codigo_acceso IN ('bg7k2m4p', 'rn9x3c5v', 'cg2h8j6l', 'ta5q1w9e', 'vc4r7t2y', 'gg8u3i6o', 'en1a5s9d')`;
await sql`UPDATE links_nfc SET url_destino = NULL`;
await sql`UPDATE comercios SET google_refresh_token = '', google_conectado_en = NULL,
          auto_responder_positivas = false, auto_responder_umbral = 4`;
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'vet-cerro'`;
await sql`INSERT INTO portal_usuarios (comercio_id, email) VALUES ('gym-guemes', 'duenio@ejemplo.test')
          ON CONFLICT DO NOTHING`;

// ---------- Portal: A contra B y B contra A ----------
await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes", linkId: "resto-nueva-cordoba-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
let u = await urlLink("resto-nueva-cordoba-mostrador");
registrar("A", "editar el cartel de B (comercioId de A)", "denegado", `url de B = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "resto-nueva-cordoba", linkId: "resto-nueva-cordoba-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
u = await urlLink("resto-nueva-cordoba-mostrador");
registrar("A", "editar el cartel de B (comercioId de B)", "denegado", `url de B = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-rn9x3c5v", comercioId: "resto-nueva-cordoba", linkId: "barberia-guemes-mostrador",
  etiqueta: "x", urlDestino: "https://malo.example",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("B", "editar el cartel de A", "denegado", `url de A = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes", linkId: "barberia-guemes-mostrador",
  etiqueta: "x", urlDestino: "javascript:alert(document.cookie)",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("A", "guardar un destino javascript:", "rechazado", `url de A = '${u}'`, u === "");

await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes", linkId: "barberia-guemes-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://propio.example",
});
u = await urlLink("barberia-guemes-mostrador");
registrar("A", "editar SU propio cartel (control positivo)", "permitido", `url de A = '${u}'`, u === "https://propio.example");

await sql`UPDATE comercios SET google_refresh_token = 'tok-b' WHERE id = 'resto-nueva-cordoba'`;
await accionForm("accionDesconectarGoogleComercioPortal", { codigo: "e2e-bg7k2m4p", comercioId: "resto-nueva-cordoba" });
let c = await comercio("resto-nueva-cordoba");
registrar("A", "desconectar el Google de B", "denegado", `token de B = '${c.google_refresh_token}'`, c.google_refresh_token === "tok-b");

let r = await accionArgs("accionObtenerTapsPorHora", ["e2e-bg7k2m4p", "resto-nueva-cordoba", "2026-09-01"]);
let cuerpo = (await r.text()).trim();
registrar("A", "leer los taps por hora de B", "lista vacía", cuerpo.slice(-20), cuerpo.endsWith("[]"));

r = await accionArgs("accionObtenerTapsPorHora", ["e2e-bg7k2m4p", "barberia-guemes", "2026-09-01"]);
cuerpo = (await r.text()).trim();
registrar("A", "leer SUS taps por hora (control positivo)", "24 horas", cuerpo.slice(-20), cuerpo.includes('"hora":23'));

await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "codigo-inventado", comercioId: "barberia-guemes", autoResponderPositivas: "on", autoResponderUmbral: "5",
});
c = await comercio("barberia-guemes");
registrar("anónimo", "acción del portal con código inventado", "denegado", `auto = ${c.auto_responder_positivas}`, c.auto_responder_positivas === false);

await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes", autoResponderPositivas: "on", autoResponderUmbral: "5",
});
c = await comercio("barberia-guemes");
registrar("A", "cambiar SU automatización (control positivo)", "permitido",
  `auto = ${c.auto_responder_positivas}/${c.auto_responder_umbral}`, c.auto_responder_positivas === true && c.auto_responder_umbral === 5);

// ---------- Gate de Google y cuenta en baja ----------
await sql`UPDATE comercios SET google_refresh_token = 'tok-g' WHERE id = 'gym-guemes'`;
await accionForm("accionDesconectarGoogleComercioPortal", { codigo: "e2e-gg8u3i6o", comercioId: "gym-guemes" });
c = await comercio("gym-guemes");
registrar("código sin Google", "desconectar Google en un portal con gate", "denegado", `token = '${c.google_refresh_token}'`, c.google_refresh_token === "tok-g");

await sql`UPDATE comercios SET estado = 'baja' WHERE id = 'vet-cerro'`;
await accionForm("accionActualizarAutomatizacionResenasPortal", {
  codigo: "e2e-vc4r7t2y", comercioId: "vet-cerro", autoResponderPositivas: "on", autoResponderUmbral: "5",
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
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes-centro", linkId: "barberia-guemes-centro-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://centro.example",
});
u = await urlLink("barberia-guemes-centro-mostrador");
registrar("A", "editar el cartel de SU sucursal (control positivo)", "permitido", `url de S = '${u}'`, u === "https://centro.example");

await sql`UPDATE comercios SET estado = 'baja' WHERE id = 'barberia-guemes-centro'`;
await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "e2e-bg7k2m4p", comercioId: "barberia-guemes-centro", linkId: "barberia-guemes-centro-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://otra.example",
});
u = await urlLink("barberia-guemes-centro-mostrador");
registrar("A", "editar el cartel de una sucursal dada de baja", "denegado", `url de S = '${u}'`, u === "https://centro.example");
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'barberia-guemes-centro'`;

// ---------- Competidores que arma el propio cliente ----------
await sql`DELETE FROM competidores WHERE comercio_id IN ('resto-nueva-cordoba', 'gym-guemes')`;
const [{ id: compB }] = await sql`INSERT INTO competidores (comercio_id, nombre, google_place_id)
  VALUES ('resto-nueva-cordoba', 'Competidor de B', 'ChIJcompetidorDeBprueba01') RETURNING id`;
await accionArgs("accionQuitarCompetidorPortal", ["e2e-bg7k2m4p", "barberia-guemes", compB]);
await accionArgs("accionQuitarCompetidorPortal", ["e2e-bg7k2m4p", "resto-nueva-cordoba", compB]);
let [{ n: compBQuedan }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE id = ${compB}`;
registrar("A", "quitar un competidor de B", "denegado", `filas = ${compBQuedan}`, compBQuedan === 1);

await accionArgs("accionAgregarCompetidorPortal", ["e2e-gg8u3i6o", "gym-guemes", "ChIJcompetidorIntruso0001", "Intruso"]);
let [{ n: compG }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE comercio_id = 'gym-guemes'`;
registrar("código sin Google", "agregar un competidor en un portal con gate", "denegado", `filas = ${compG}`, compG === 0);

await accionArgs("accionQuitarCompetidorPortal", ["e2e-rn9x3c5v", "resto-nueva-cordoba", compB]);
[{ n: compBQuedan }] = await sql`SELECT count(*)::int AS n FROM competidores WHERE id = ${compB}`;
registrar("B", "quitar SU competidor (control positivo)", "permitido", `filas = ${compBQuedan}`, compBQuedan === 0);

r = await fetch(`${BASE}/portal/e2e-rn9x3c5v`, { headers: { "x-real-ip": ipNueva() } });
cuerpo = await r.text();
registrar("quien tiene el código de B", "abrir el portal de B", "ve solo a B",
  `HTTP ${r.status}, ¿aparece A? ${cuerpo.includes("Barbería")}`, r.status === 200 && !cuerpo.includes("Barbería"));

// ---------- Loyalty: canje en caja, visitas, tarjeta y misiones ----------
// X = cliente final socio de A; Y = socio de B. El server corre con
// LOYALTY_ENABLED=true y LOYALTY_PII_KEY (ver el workflow); las cookies y
// tokens se firman acá con la misma clave, igual que lib/loyalty-firma.ts.
const CLAVE_LOYALTY = process.env.LOYALTY_PII_KEY ?? "";
const firmaL = (texto) => crypto.createHmac("sha256", CLAVE_LOYALTY).update(texto).digest("base64url");
const cookieCliente = (id) => {
  const exp = Date.now() + 60 * 60 * 1000;
  return `loyalty_cliente=${id}.${exp}.${firmaL(`sesion:${id}:${exp}`)}`;
};
const tokenVisita = (comercioId) => {
  const t = Date.now();
  return encodeURIComponent(`${t}.${firmaL(`visita:${comercioId}:${t}`)}`);
};
const saldoDe = async (m) =>
  Number((await uno(sql`SELECT COALESCE(SUM(delta),0)::int AS s FROM movimientos_puntos WHERE membresia_id = ${m}`)).s);

await sql`DELETE FROM clientes_finales WHERE id IN ('cf-prueba-x', 'cf-prueba-y')`;
await sql`DELETE FROM beneficios WHERE comercio_id IN ('barberia-guemes', 'resto-nueva-cordoba', 'gym-guemes')`;
await sql`DELETE FROM misiones WHERE comercio_id IN ('barberia-guemes', 'resto-nueva-cordoba')`;
await sql`UPDATE comercios SET tiene_loyalty = true WHERE id IN ('barberia-guemes', 'resto-nueva-cordoba', 'gym-guemes')`;
for (const id of ["barberia-guemes", "resto-nueva-cordoba", "gym-guemes"]) {
  await sql`INSERT INTO programas_loyalty (comercio_id, puntos_bienvenida, puntos_por_visita, activo)
            VALUES (${id}, 100, 10, true)
            ON CONFLICT (comercio_id) DO UPDATE SET puntos_bienvenida = 100, puntos_por_visita = 10, activo = true`;
  await sql`INSERT INTO beneficios (id, comercio_id, nombre, costo_puntos) VALUES (${`ben-${id}`}, ${id}, 'Café', 50)`;
}
await sql`INSERT INTO misiones (id, comercio_id, tipo, puntos, verificacion)
          VALUES ('mis-a', 'barberia-guemes', 'resena_google', 20, 'autodeclarada'),
                 ('mis-b', 'resto-nueva-cordoba', 'resena_google', 20, 'autodeclarada')`;
await sql`INSERT INTO clientes_finales (id, telefono, nombre) VALUES
          ('cf-prueba-x', '3510000001', 'Equis'), ('cf-prueba-y', '3510000002', 'Ye')`;
await sql`INSERT INTO membresias (id, cliente_final_id, comercio_id) VALUES
          ('mem-x-a', 'cf-prueba-x', 'barberia-guemes'), ('mem-y-b', 'cf-prueba-y', 'resto-nueva-cordoba')`;
// Bienvenida de hace dos días: así el cooldown de 20 h no tapa la visita.
await sql`INSERT INTO movimientos_puntos (membresia_id, delta, motivo, idem_clave, creado_en) VALUES
          ('mem-x-a', 100, 'bienvenida', 'bienvenida:mem-x-a', now() - interval '2 days'),
          ('mem-y-b', 100, 'bienvenida', 'bienvenida:mem-y-b', now() - interval '2 days')`;
const nuevoCanje = async (codigo, membresia, comercioId, vence = "15 minutes") =>
  sql`INSERT INTO canjes (id, membresia_id, beneficio_id, comercio_id, costo_puntos, expira_en)
      VALUES (${codigo}, ${membresia}, ${`ben-${comercioId}`}, ${comercioId}, 50, now() + ${vence}::interval)`;
const canjeValidado = async (codigo) => (await uno(sql`SELECT validado FROM canjes WHERE id = ${codigo}`)).validado;

await nuevoCanje("PRUEB2", "mem-x-a", "barberia-guemes");
await accionArgs("accionValidarCanjePortal", ["e2e-rn9x3c5v", "resto-nueva-cordoba", "PRUEB2"]);
await accionArgs("accionValidarCanjePortal", ["e2e-rn9x3c5v", "barberia-guemes", "PRUEB2"]);
registrar("B", "validar en su caja un canje de un socio de A", "denegado",
  `validado = ${await canjeValidado("PRUEB2")}, saldo X = ${await saldoDe("mem-x-a")}`,
  (await canjeValidado("PRUEB2")) === false && (await saldoDe("mem-x-a")) === 100);

await accionArgs("accionValidarCanjePortal", ["e2e-gg8u3i6o", "gym-guemes", "PRUEB2"]);
registrar("código sin Google", "validar un canje en un portal con gate", "denegado",
  `validado = ${await canjeValidado("PRUEB2")}`, (await canjeValidado("PRUEB2")) === false);

await accionArgs("accionValidarCanjePortal", ["e2e-bg7k2m4p", "barberia-guemes", "prueb2"]);
registrar("A", "validar el canje de SU socio (control positivo)", "permitido",
  `validado = ${await canjeValidado("PRUEB2")}, saldo X = ${await saldoDe("mem-x-a")}`,
  (await canjeValidado("PRUEB2")) === true && (await saldoDe("mem-x-a")) === 50);

await accionArgs("accionValidarCanjePortal", ["e2e-bg7k2m4p", "barberia-guemes", "PRUEB2"]);
registrar("A", "validar dos veces el mismo código", "descuenta una sola vez", `saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 50);

await nuevoCanje("VENC34", "mem-x-a", "barberia-guemes", "-1 minutes");
await accionArgs("accionValidarCanjePortal", ["e2e-bg7k2m4p", "barberia-guemes", "VENC34"]);
registrar("A", "validar un código vencido", "denegado", `validado = ${await canjeValidado("VENC34")}`,
  (await canjeValidado("VENC34")) === false && (await saldoDe("mem-x-a")) === 50);

const verTarjeta = (comercioId, query, cookie) =>
  fetch(`${BASE}/l/${comercioId}${query}`, { headers: { "x-real-ip": ipNueva(), ...(cookie ? { cookie } : {}) } });

await verTarjeta("barberia-guemes", "", cookieCliente("cf-prueba-x"));
registrar("X", "abrir su tarjeta sin tocar el cartel", "no suma", `saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 50);

await verTarjeta("barberia-guemes", `?v=${tokenVisita("resto-nueva-cordoba")}`, cookieCliente("cf-prueba-x"));
registrar("X", "sumar en A con el token de visita de B", "no suma", `saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 50);

r = await verTarjeta("barberia-guemes", `?v=${tokenVisita("barberia-guemes")}`, cookieCliente("cf-prueba-x"));
registrar("X", "tocar el cartel de A (control positivo)", "+10", `HTTP ${r.status}, saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 60);

await verTarjeta("barberia-guemes", `?v=${tokenVisita("barberia-guemes")}`, cookieCliente("cf-prueba-x"));
registrar("X", "tocar el cartel dos veces en 20 h", "suma una sola", `saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 60);

r = await verTarjeta("barberia-guemes", "", "loyalty_cliente=cf-prueba-y.9999999999999.firmatrucha");
cuerpo = await r.text();
registrar("anónimo", "cookie de cliente falsificada", "ve el alta, no una tarjeta",
  `HTTP ${r.status}, ¿muestra saldo? ${cuerpo.includes("puntos</p>")}`, !cuerpo.includes("Equis") && !cuerpo.includes("Ye<"));

const tokenTarjetaX = encodeURIComponent(`mem-x-a.${firmaL("tarjeta:mem-x-a")}`);
r = await fetch(`${BASE}/l/resto-nueva-cordoba/entrar?tarjeta=${tokenTarjetaX}`, { redirect: "manual", headers: { "x-real-ip": ipNueva() } });
registrar("X", "usar el link de su tarjeta de A en el club de B", "sin sesión", `set-cookie: ${Boolean(r.headers.get("set-cookie"))}`,
  !r.headers.get("set-cookie"));
r = await fetch(`${BASE}/l/barberia-guemes/entrar?tarjeta=${tokenTarjetaX}`, { redirect: "manual", headers: { "x-real-ip": ipNueva() } });
registrar("X", "link de su tarjeta en A (control positivo)", "recupera la sesión", `set-cookie: ${Boolean(r.headers.get("set-cookie"))}`,
  (r.headers.get("set-cookie") ?? "").includes("loyalty_cliente=cf-prueba-x."));

await accionForm("accionReclamarMision", { comercioId: "barberia-guemes", misionId: "mis-b" }, {
  pagina: "/l/barberia-guemes", cookie: cookieCliente("cf-prueba-x"),
});
registrar("X", "cobrar en A una misión de B", "denegado", `saldo X = ${await saldoDe("mem-x-a")}`, (await saldoDe("mem-x-a")) === 60);
for (let i = 0; i < 2; i++) {
  await accionForm("accionReclamarMision", { comercioId: "barberia-guemes", misionId: "mis-a" }, {
    pagina: "/l/barberia-guemes", cookie: cookieCliente("cf-prueba-x"),
  });
}
registrar("X", "cobrar dos veces la misión de A", "suma una sola (+20)", `saldo X = ${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === 80);

await accionForm("accionDarseDeBaja", { comercioId: "resto-nueva-cordoba" }, {
  pagina: "/l/resto-nueva-cordoba", cookie: cookieCliente("cf-prueba-x"),
});
let [{ n: membresiaY }] = await sql`SELECT count(*)::int AS n FROM membresias WHERE id = 'mem-y-b'`;
registrar("X", "dar de baja la tarjeta de otra persona en B", "denegado", `membresía de Y = ${membresiaY}`, membresiaY === 1);

await accionForm("accionDarseDeBaja", { comercioId: "resto-nueva-cordoba" }, {
  pagina: "/l/resto-nueva-cordoba", cookie: cookieCliente("cf-prueba-y"),
});
[{ n: membresiaY }] = await sql`SELECT count(*)::int AS n FROM clientes_finales WHERE id = 'cf-prueba-y'`;
registrar("Y", "borrar su tarjeta y sus datos (control positivo)", "borrado", `cliente Y = ${membresiaY}`, membresiaY === 0);

// ---------- Lote de regresiones del audit run-2 ----------
// Código publicado en el repo (el propio de db/seed.sql, sin el prefijo
// e2e-): en producción, solo lectura.
await sql`UPDATE comercios SET codigo_acceso = 'ta5q1w9e' WHERE id = 'taller-alberdi'`;
await accionForm("accionActualizarUrlLinkPortal", {
  codigo: "ta5q1w9e", comercioId: "taller-alberdi", linkId: "taller-alberdi-mostrador",
  etiqueta: "Mostrador", urlDestino: "https://malo.example/demo",
});
const urlDemo = await urlLink("taller-alberdi-mostrador");
if (MODO === "produccion") {
  registrar("anónimo con un código publicado", "cambiar el destino de un cartel de la demo", "denegado", `url = '${urlDemo}'`, urlDemo === "");
} else {
  registrar("código publicado en preview", "cambiar el destino (control positivo)", "permitido", `url = '${urlDemo}'`, urlDemo === "https://malo.example/demo");
}
await sql`UPDATE comercios SET codigo_acceso = 'e2e-ta5q1w9e' WHERE id = 'taller-alberdi'`;

// Piezas: solo es reclamable inventario nunca usado.
await sql`DELETE FROM links_nfc WHERE id IN ('p-9999-e2e001', 'huerfano-mostrador')`;
await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino) VALUES
          ('p-9999-e2e001', NULL, '', 'nfc', 'e2e', 'resena'),
          ('huerfano-mostrador', NULL, 'Mostrador', 'nfc', '', 'resena')`;
await accionArgs("activarCartel", ["huerfano-mostrador", "Intruso", "https://malo.example/huerfano", "1234"]);
registrar("anónimo", "reclamar un link huérfano (de un cliente borrado)", "denegado",
  `url = '${await urlLink("huerfano-mostrador")}'`, (await urlLink("huerfano-mostrador")) === "");
await accionArgs("activarCartel", ["p-9999-e2e001", "Mi negocio", "https://bueno.example/", "4321"]);
registrar("comprador", "activar una pieza de inventario (control positivo)", "permitido",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://bueno.example/");

// PIN: tope por pieza que no depende de la IP.
for (let i = 0; i < 11; i++) {
  await accionArgs("editarCartel", ["p-9999-e2e001", String(1000 + i), "X", "https://malo.example/pin"]);
}
await accionArgs("editarCartel", ["p-9999-e2e001", "4321", "X", "https://malo.example/pin"]);
registrar("anónimo rotando IPs", "11 PIN incorrectos y después el correcto", "bloqueado por pieza",
  `url = '${await urlLink("p-9999-e2e001")}'`, (await urlLink("p-9999-e2e001")) === "https://bueno.example/");

// Canje: dos códigos de la misma persona validados a la vez no gastan dos veces.
const saldoAntesConc = await saldoDe("mem-x-a");
await nuevoCanje("CONC01", "mem-x-a", "barberia-guemes");
await nuevoCanje("CONC02", "mem-x-a", "barberia-guemes");
await Promise.all([
  accionArgs("accionValidarCanjePortal", ["e2e-bg7k2m4p", "barberia-guemes", "CONC01"]),
  accionArgs("accionValidarCanjePortal", ["e2e-bg7k2m4p", "barberia-guemes", "CONC02"]),
]);
const validadosConc = Number((await canjeValidado("CONC01")) === true) + Number((await canjeValidado("CONC02")) === true);
registrar("X con dos códigos", `validar los dos a la vez con saldo ${saldoAntesConc} (costo 50 c/u)`, "uno solo",
  `validados = ${validadosConc}, saldo = ${await saldoDe("mem-x-a")}`,
  validadosConc === 1 && (await saldoDe("mem-x-a")) === saldoAntesConc - 50);

// Cuenta pausada: el club deja de sumar, pero el socio puede borrarse.
await sql`UPDATE comercios SET estado = 'pausado' WHERE id = 'barberia-guemes'`;
const saldoPausa = await saldoDe("mem-x-a");
await sql`DELETE FROM movimientos_puntos WHERE membresia_id = 'mem-x-a' AND motivo = 'visita'`;
const saldoSinVisitas = await saldoDe("mem-x-a");
r = await verTarjeta("barberia-guemes", `?v=${tokenVisita("barberia-guemes")}`, cookieCliente("cf-prueba-x"));
cuerpo = await r.text();
registrar("X", "tocar el cartel de una cuenta pausada", "no suma; ofrece borrarse",
  `HTTP ${r.status}, saldo ${saldoPausa}→${await saldoDe("mem-x-a")}`,
  (await saldoDe("mem-x-a")) === saldoSinVisitas && cuerpo.includes("Borrar mi tarjeta"));
r = await verTarjeta("barberia-guemes", "");
registrar("anónimo", "abrir el club de una cuenta pausada", "404", `HTTP ${r.status}`, r.status === 404);
await sql`UPDATE comercios SET estado = 'activo' WHERE id = 'barberia-guemes'`;

// La confirmación de baja no revela si un comercio existe.
const conBaja = async (id) => {
  const resp = await verTarjeta(id, "?baja=1");
  return `${resp.status}:${(await resp.text()).includes("borramos tu tarjeta")}`;
};
const [bajaExiste, bajaNoExiste] = [await conBaja("taller-alberdi"), await conBaja("no-existe-e2e")];
registrar("anónimo", "/l/<id>?baja=1 de un comercio real vs uno inventado", "misma respuesta",
  `${bajaExiste} vs ${bajaNoExiste}`, bajaExiste === bajaNoExiste);

// Teléfono tomado por otro: el equipo lo libera (necesita sesión de admin).
await sql`DELETE FROM clientes_finales WHERE id = 'cf-prueba-z'`;
await sql`INSERT INTO clientes_finales (id, telefono, nombre) VALUES ('cf-prueba-z', '3510000003', 'Okupa')`;
await accionForm("accionLiberarTelefonoLoyalty", { id: "barberia-guemes", telefono: "351 000 0003" });
let [{ n: okupa }] = await sql`SELECT count(*)::int AS n FROM clientes_finales WHERE id = 'cf-prueba-z'`;
registrar("anónimo", "liberar un teléfono sin sesión de admin", "denegado", `filas = ${okupa}`, okupa === 1);
if (MODO !== "produccion") {
  const comoEquipo = { pagina: "/admin/clientes/barberia-guemes/loyalty", cookie: await cookiePasswordValida() };
  await accionForm("accionLiberarTelefonoLoyalty", { id: "barberia-guemes", telefono: "351 000 0003" }, comoEquipo);
  [{ n: okupa }] = await sql`SELECT count(*)::int AS n FROM clientes_finales WHERE id = 'cf-prueba-z'`;
  registrar("equipo", "liberar un teléfono sin confirmar (solo muestra de quién es)", "no borra", `filas = ${okupa}`, okupa === 1);
  await accionForm("accionLiberarTelefonoLoyalty", { id: "barberia-guemes", telefono: "351 000 0003", confirmar: "on" }, comoEquipo);
  [{ n: okupa }] = await sql`SELECT count(*)::int AS n FROM clientes_finales WHERE id = 'cf-prueba-z'`;
  registrar("equipo", "liberar un teléfono confirmando (control positivo)", "liberado", `filas = ${okupa}`, okupa === 0);

  // Borrar un cliente borra sus carteles: no quedan huérfanos reclamables.
  await sql`DELETE FROM comercios WHERE id = 'e2e-borrable'`;
  await sql`DELETE FROM links_nfc WHERE id = 'e2e-borrable-mesa'`;
  await sql`INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado)
            VALUES ('e2e-borrable', 'e2e-borrable-cod', 'Borrable E2E', 'Otro', 'Centro', 'Base', 'activo')`;
  await sql`INSERT INTO links_nfc (id, comercio_id, etiqueta, destino) VALUES ('e2e-borrable-mesa', 'e2e-borrable', 'Mesa', 'resena')`;
  await accionForm("accionEliminarCliente", { id: "e2e-borrable", confirmarNombre: "Borrable E2E" }, {
    pagina: "/admin/clientes", cookie: await cookiePasswordValida(),
  });
  await accionArgs("activarCartel", ["e2e-borrable-mesa", "Intruso", "https://malo.example/borrado", "1234"]);
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
for (let i = 0; i < 21; i++) ultimo = (await fetch(`${BASE}/portal/e2e-bg7k2m4p`, { headers: { "x-real-ip": ipPortal } })).status;
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
