const { Ratelimit } = require("@upstash/ratelimit");
const { Redis } = require("@upstash/redis");

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limitadoresRedis = new Map();

function limitadorRedis(maximo, ventanaMs) {
  const clave = `${maximo}:${ventanaMs}`;
  let l = limitadoresRedis.get(clave);
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maximo, `${ventanaMs} ms`),
      analytics: false,
      prefix: "ratelimit",
    });
    limitadoresRedis.set(clave, l);
  }
  return l;
}

const mapaMemoria = new Map();

function permitirMemoria(clave, maximo, ventanaMs) {
  const ahora = Date.now();
  const actual = mapaMemoria.get(clave);
  if (!actual || ahora > actual.reinicia) {
    mapaMemoria.set(clave, { conteo: 1, reinicia: ahora + ventanaMs });
    return true;
  }
  if (actual.conteo >= maximo) return false;
  actual.conteo += 1;
  return true;
}

function ipDelRequest(req) {
  return (
    req.headers["x-real-ip"] ||
    String(req.headers["x-forwarded-for"] ?? "")
      .split(",")[0]
      .trim() ||
    req.ip ||
    "desconocida"
  );
}

async function permitir(clave, maximo, ventanaMs) {
  if (redis) {
    const { success } = await limitadorRedis(maximo, ventanaMs).limit(clave);
    return success;
  }
  return permitirMemoria(clave, maximo, ventanaMs);
}

let ultimaLimpieza = Date.now();

function limpiarVencidos() {
  if (redis) return;
  const ahora = Date.now();
  if (ahora - ultimaLimpieza < 60_000) return;
  ultimaLimpieza = ahora;
  for (const [k, v] of mapaMemoria) {
    if (ahora > v.reinicia) mapaMemoria.delete(k);
  }
}

module.exports = { ipDelRequest, permitir, limpiarVencidos };
