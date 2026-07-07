# Auditoría Zero-Trust de arquitectura y seguridad — Julio 2026

> **Estado: IMPLEMENTADA (julio 2026).** Todas las alertas rojas RF-01 a
> RF-08 y las optimizaciones de la matriz están corregidas en esta misma
> rama (ver commits "RF-…" y "Re-auditoría (ciclo 2)"). Un segundo ciclo de
> revisión con 8 ángulos independientes encontró y corrigió además: formato
> de sesión unificado en `lib/sesion.ts` (Node y Edge compartían dos copias
> que podían divergir), rechazos del cron que se tragaban en silencio,
> filtro de bots que descontaba taps reales y duplicación de helpers.
> Pendientes aceptados y documentados: migrar capturas a Vercel Blob,
> rate limit global (Upstash) en vez de por instancia, y cifrado app-level
> de `google_refresh_token`. La migración `003_indices_fk.sql` hay que
> correrla a mano en Neon. Tras el deploy, el equipo debe volver a
> loguearse una vez (las cookies viejas quedan inválidas a propósito).

Alcance: todo el repositorio (Next.js 15 App Router + Neon Postgres + Vercel).
Método: rastreo de flujos de datos request → código → base → respuesta, con
verificación línea por línea de la capa de auth, las server actions, las rutas
API, el esquema SQL y el árbol de dependencias (`npm audit`: **0 vulnerabilidades**).

Este documento es el registro permanente; los fixes se listan con ubicación
exacta y código propuesto. La migración de índices ya está entregada en
`db/migrations/003_indices_fk.sql` (correr a mano en Neon, como siempre).

---

## 1. Mapa arquitectónico

```
Cliente final (tap NFC / QR)                Equipo (panel)                 Comercio (portal)
        │                                        │                               │
        ▼                                        ▼                               ▼
┌──────────────────────────── Vercel Edge — middleware.ts ────────────────────────────┐
│ Solo valida sesión para /admin/* (cookie password SHA-256 o cookie Google HMAC).    │
│ El matcher corre en TODAS las rutas aunque solo proteja /admin (ver O-3).           │
└──────────────────────────────────────────────────────────────────────────────────────┘
        │                                        │                               │
        ▼ Node serverless                        ▼ Node serverless               ▼ Node serverless
/t/[slug]/page.tsx                        app/admin/**/page.tsx           /portal/[codigo]/page.tsx
  getLink → registrarTap →                  requireAdmin() en cada          getClientePorCodigo →
  star-gate o redirect                      server action (app/actions)     7 lecturas en Promise.all
        │                                        │                               │
        ▼                                        ▼                               ▼
              lib/db.ts (SQL parametrizado, driver postgres) → lib/sql.ts
                        (singleton, max:5, prepare:false ✅)
                                    │
                                    ▼
                          Neon (PgBouncer pooler)

Flujos secundarios:
- Cron diario:  Vercel Cron → GET /api/cron/sync-google (Bearer CRON_SECRET)
                → Places API + GBP Performance + Reviews API (flag apagado) → Neon.
- OAuth equipo: /api/admin/oauth/start → Google → /callback → allowlist `admins`
                → cookie admin_google_session (HMAC con GOOGLE_OAUTH_CLIENT_SECRET).
- OAuth GBP:    /api/portal/google/oauth/start (state = codigo.nonce en cookie)
                → /callback → refresh token guardado en comercios.google_refresh_token.
- Feedback:     server action pública enviarFeedback (app/t/actions.ts) con rate
                limit en memoria por IP.
```

**Runtimes:** solo `middleware.ts` corre en Edge. Todas las páginas, actions y
rutas API son Node serverless (el driver `postgres` exige Node). No hay librerías
pesadas en Edge; `jszip` solo se carga en `/api/admin/hardware/qr-lote` (Node). ✅

**Caché:** todas las páginas con datos son `force-dynamic`; no hay ISR ni riesgo
de cachear datos de un usuario globalmente. Los fetch a Google usan `no-store`. ✅

**Env vars:** único prefijo `NEXT_PUBLIC_` es `NEXT_PUBLIC_WHATSAPP_NUMBER`
(dato público por diseño). Ninguna credencial expuesta al cliente. ✅

---

## 2. Registro de vulnerabilidades críticas (alertas rojas)

### RF-01 — La sesión de Google no expira ni puede revocarse
- **Ubicación:** `lib/auth.ts:39-59` (crear/leer cookie), `middleware.ts:58-70`.
- **Causa raíz:** el payload firmado es solo `{email, nombre}` — sin `exp`. El
  `maxAge: 60*60*24*30` del callback solo instruye al navegador; el valor firmado
  es válido **para siempre** si alguien lo conserva. Peor: ni el middleware ni
  `tieneSesionAdmin` re-chequean la allowlist `admins`, así que un admin
  **eliminado** de la tabla sigue entrando indefinidamente con su cookie vieja.
  En un modelo zero-trust esto es la falla más grave del sistema.
- **Fix:**

```ts
// lib/auth.ts — payload con vencimiento
export function crearCookieSesionGoogle(email: string, nombre: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 días, verificado server-side
  const payload = Buffer.from(JSON.stringify({ email, nombre, exp })).toString("base64url");
  return `${payload}.${firmarPayload(payload)}`;
}

// en leerCookieSesionGoogle, tras el JSON.parse:
const data = JSON.parse(...) as { email?: string; nombre?: string; exp?: number };
if (!data.email) return null;
if (!data.exp || Date.now() > data.exp) return null; // sesión vencida

// requireAdmin: re-chequear la allowlist en CADA mutación (revocación efectiva).
// (import { esAdminPermitido } from "./db" — no genera ciclo: db.ts no importa auth.ts)
export async function requireAdmin(): Promise<void> {
  if (!(await tieneSesionAdmin())) {
    throw new Error("No autorizado. Iniciá sesión en el panel.");
  }
  const email = await emailAdminActual();
  if (email && !(await esAdminPermitido(email))) {
    throw new Error("Tu acceso fue revocado.");
  }
}
```

  En `middleware.ts:65-69` agregar el mismo chequeo de `exp` al parsear el payload
  (el middleware no puede tocar la DB — la revocación real queda en `requireAdmin`,
  que es donde ocurren las mutaciones; las páginas de lectura quedan cubiertas al
  vencer la cookie).

### RF-02 — Cookie de contraseña determinística: “pass-the-hash” permanente
- **Ubicación:** `lib/auth.ts:67-68`, `app/login/actions.ts:17`, `middleware.ts:81-82`.
- **Causa raíz:** el valor de la cookie es `SHA-256(ADMIN_PASSWORD)` — un valor
  **fijo** para todos y para siempre. Quien lo capture una vez (log, XSS futuro,
  laptop compartida) tiene acceso permanente sin conocer la contraseña, hasta que
  se cambie `ADMIN_PASSWORD`. Además el hash sin salt es fuerza-bruteable offline.
- **Fix:** token con vencimiento firmado por HMAC (la contraseña como clave de
  firma, nunca como contenido):

```ts
// lib/auth.ts
export function crearCookiePassword(): string {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const firma = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update(`pw.${exp}`)
    .digest("base64url");
  return `${exp}.${firma}`;
}

export function cookiePasswordValida(valor: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const [exp, firma] = valor.split(".");
  if (!exp || !firma || Date.now() > Number(exp)) return false;
  const esperada = crypto
    .createHmac("sha256", password)
    .update(`pw.${exp}`)
    .digest("base64url");
  return iguales(firma, esperada);
}
```

  Replicar la verificación en `middleware.ts` con WebCrypto (igual que ya hace
  `firmaValidaGoogle`). Cambiar `ADMIN_PASSWORD` invalida todas las sesiones, como hoy.

### RF-03 — Login por contraseña sin rate limit y con comparación no constante
- **Ubicación:** `app/login/actions.ts:12` (`intento !== password`).
- **Causa raíz:** la única contraseña que protege TODO el panel se puede probar
  sin límite (fuerza bruta online) y la comparación `!==` filtra información por
  timing. Ya existe `lib/ratelimit.ts` y no se usa acá.
- **Fix:**

```ts
import { headers } from "next/headers";
import crypto from "node:crypto";
import { permitir, limpiarVencidos } from "@/lib/ratelimit";

export async function accionLogin(fd: FormData): Promise<void> {
  limpiarVencidos();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";
  if (!permitir(`login:${ip}`, 10, 15 * 60_000)) {
    redirect("/login?error=limite"); // máx 10 intentos por IP cada 15 min
  }

  const password = process.env.ADMIN_PASSWORD;
  const intento = String(fd.get("password") ?? "");
  const ok =
    !!password &&
    intento.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(intento), Buffer.from(password));
  if (!ok) redirect("/login?error=1");
  // ... setear cookie (versión RF-02) y redirect("/admin")
}
```

### RF-04 — Cero cabeceras de seguridad (clickjacking, MIME sniffing, sin HSTS)
- **Ubicación:** no existe `next.config.*` y `vercel.json` no define `headers`.
- **Causa raíz:** ninguna respuesta lleva `X-Frame-Options`/`frame-ancestors`,
  `X-Content-Type-Options`, `Referrer-Policy` ni `Strict-Transport-Security`.
  `/login` y `/portal/[codigo]` son enmarcables desde cualquier sitio (clickjacking
  sobre el formulario de contraseña y los botones del portal).
- **Fix:** crear `next.config.ts`:

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

  (Una CSP completa con `script-src` requiere trabajo aparte por los estilos
  inline de Next/Tailwind — `frame-ancestors 'none'` es el 80% del valor con 0 riesgo.)

### RF-05 — `enviarFeedback` acepta cualquier `comercioId` y explota con 500
- **Ubicación:** `app/t/actions.ts:35` (`crearFeedback(comercioId, …)` directo).
- **Causa raíz:** el `comercioId` viene del cliente sin verificar existencia. Un
  id inexistente viola la FK y la excepción sin manejar devuelve un error 500 al
  usuario del star-gate. Un id válido (los slugs son adivinables: `slugify(nombre)`)
  permite inyectar feedback falso a cualquier comercio sin haber tocado el cartel.
  Además `lib/ratelimit.ts` es memoria **por instancia** serverless: cada cold
  start y cada instancia paralela resetean el contador — protección débil.
- **Fix:**

```ts
import { getCliente, crearFeedback } from "@/lib/db";

// ...tras validar estrellas/texto y el rate limit:
const cliente = await getCliente(comercioId);
if (!cliente) return { ok: false, error: "Comercio inválido." };

await crearFeedback(cliente.id, { ... });
```

  Mediano plazo: mover el rate limit a Upstash Redis (`@upstash/ratelimit`) para
  que sea global entre instancias — ya está anotado en el propio archivo.

### RF-06 — El cron diario puede morir por timeout a mitad de sincronización
- **Ubicación:** `app/api/cron/sync-google/route.ts` (sin `maxDuration`);
  `lib/db.ts:275-282, 383-390, 455-469` (bucles secuenciales).
- **Causa raíz:** el handler encadena 4 sincronizaciones que hacen 1-3 llamadas
  HTTP externas **por comercio, en serie**. Con el timeout default de Vercel la
  función se corta sin log útil y los últimos comercios quedan sin sincronizar
  todos los días (fallo silencioso que crece con cada cliente nuevo).
- **Fix:**

```ts
// app/api/cron/sync-google/route.ts — arriba del handler
export const maxDuration = 300; // 5 min (plan Pro); en Hobby: 60
export const dynamic = "force-dynamic";
```

  y paralelismo acotado en los bucles (patrón para los tres `…Todos`):

```ts
// lib/db.ts — sincronizarGoogleTodos con lotes de 5 en paralelo
export async function sincronizarGoogleTodos(): Promise<{ total: number; actualizados: number }> {
  const rows = await sql`SELECT id FROM comercios WHERE google_place_id != ''`;
  let actualizados = 0;
  for (let i = 0; i < rows.length; i += 5) {
    const lote = rows.slice(i, i + 5);
    const resultados = await Promise.allSettled(
      lote.map((row) => sincronizarGoogle(row.id as string)),
    );
    for (const r of resultados) {
      if (r.status === "fulfilled" && r.value) actualizados += 1;
    }
  }
  return { total: rows.length, actualizados };
}
```

  Menor, mismo archivo: `auth !== \`Bearer ${secret}\`` en la línea 23 no es
  comparación en tiempo constante — usar `timingSafeEqual` como en `lib/auth.ts`.

### RF-07 — Mutaciones multi-paso sin transacción (escrituras parciales reales)
- **Ubicación:** `lib/db.ts:181-189` (`crearCliente`: INSERT comercios + INSERT
  links_nfc), `lib/db.ts:654-677` (`generarLotePiezas`: cálculo de correlativo +
  N INSERTs sueltos).
- **Causa raíz:** si el segundo INSERT de `crearCliente` falla, queda un comercio
  sin su link de mostrador (estado que la UI asume imposible). En
  `generarLotePiezas`, dos admins generando lote a la vez leen el mismo `max` y
  colisionan en la PK a mitad de lote → lote a medias. El driver `postgres`
  soporta `sql.begin` y funciona con PgBouncer en transaction mode.
- **Fix:**

```ts
// crearCliente — atómico
await sql.begin(async (tx) => {
  await tx`
    INSERT INTO comercios (id, codigo_acceso, nombre, /* … */)
    VALUES (${id}, ${codigoAcceso}, ${datos.nombre} /* … */)
  `;
  await tx`
    INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
    VALUES (${`${id}-mostrador`}, ${id}, ${"Mostrador"}, ${"resena"})
  `;
});

// generarLotePiezas — correlativo y alta en la misma transacción,
// con lock consultivo para serializar generaciones concurrentes
const creadas = await sql.begin(async (tx) => {
  await tx`SELECT pg_advisory_xact_lock(hashtext('lote_piezas'))`;
  const rows = await tx`SELECT id FROM links_nfc WHERE id LIKE 'p-%'`;
  // …calcular max y armar `nuevas` igual que hoy…
  for (const id of nuevas) {
    await tx`
      INSERT INTO links_nfc (id, comercio_id, etiqueta, tipo, lote, destino)
      VALUES (${id}, NULL, '', ${tipo}, ${lote}, 'resena')
    `;
  }
  return tx`SELECT *, 0 AS taps FROM links_nfc WHERE id = ANY(${nuevas})`;
});
```

### RF-08 — FKs sin índice: seq scans en cada portal y CASCADEs lentos
- **Ubicación:** `db/schema.sql` — `links_nfc.comercio_id`, `feedback.comercio_id`,
  `resenas.comercio_id`, `audits_geo.comercio_id`, `competidores.comercio_id`,
  `ventas_nfc.comercio_id` no tienen índice.
- **Causa raíz:** Postgres no indexa FKs solo. Cada carga de `/portal/[codigo]`
  dispara 7 consultas filtradas por `comercio_id` que hoy son seq scans; y
  `DELETE FROM comercios` (ON DELETE CASCADE) escanea las 6 tablas completas.
- **Fix entregado:** `db/migrations/003_indices_fk.sql` (correr a mano en Neon) +
  índices espejados en `db/schema.sql` como referencia canónica. Sin cambio de código.

---

## 3. Matriz de optimización y refactorización

| Archivo | Problema actual | Impacto | Corrección |
|---|---|---|---|
| `lib/db.ts:110-113` (`getClientes`) | **N+1**: `ensambleCliente` hace 2 consultas por cliente → `1 + 2N` queries. Lo llaman `/admin`, `/admin/analytics`, `/admin/reportes`, `/admin/finanzas`, `/admin/hardware` y `/admin/clientes`. Con 50 clientes = 101 queries por pageview sobre un pool de `max: 5`. | **Alto** | Traer todo en 3 consultas y ensamblar en memoria (código abajo, ①) |
| `app/t/[slug]/page.tsx:18,43` | Cada tap hace 4+ consultas (`getLink` con JOIN+COUNT de taps que la página no usa, `getClientePorLinkId` + `ensambleCliente` que carga histórico y ventas que el star-gate no muestra). Es la ruta más caliente del producto. | **Alto** | Una consulta dedicada `getDatosTap(slug)` que traiga link + nombre/rubro/google_review_url del comercio en un solo JOIN, sin histórico ni COUNT |
| `middleware.ts:95` | El matcher corre el middleware Edge en **todas** las rutas (landing, portal, taps) aunque solo protege `/admin` — latencia y facturación Edge inútiles en la ruta del tap. | **Medio** | `matcher: ["/admin/:path*"]` |
| `lib/db.ts:195-222` (`actualizarCliente`) y `598-625` (`actualizarLink`) | Read-modify-write en JS sin transacción: dos ediciones concurrentes se pisan (lost update). `regenerarCodigo` reescribe TODAS las columnas solo para cambiar una. | **Medio** | `UPDATE … SET campo = COALESCE(${valor}, campo)` en una sola sentencia, como ya hace `actualizarFeedback` |
| `lib/db.ts:1229-1242` (`agregarCapturas`/`eliminarCaptura`) | Read-splice-write sin transacción: con dos operaciones concurrentes se borra la captura equivocada o se pierde una subida. | **Medio** | En SQL atómico: `UPDATE prospectos SET capturas = capturas - ${index}` (jsonb) y `capturas = capturas \|\| ${sql.json(nuevas)}` |
| `app/actions.ts:436-456` + `prospectos.capturas` | Imágenes de hasta 4 MB guardadas como data-URL base64 dentro de un JSONB; `getProspectos()` las carga TODAS para el listado → filas de decenas de MB, presión de memoria serverless y transferencia Neon. | **Alto** (crece con el uso) | Migrar a Vercel Blob (guardar URL en el JSONB); mientras tanto, excluir `capturas` del SELECT del listado y traerlas solo al abrir un prospecto |
| `app/t/[slug]/page.tsx:24-26` | `registrarTap` cuenta cualquier GET: los crawlers (Google, WhatsApp preview del link, etc.) inflan la métrica de taps que se le muestra al cliente. | **Medio** | Filtrar user-agents de bots conocidos (`/bot\|crawler\|spider\|preview\|facebookexternalhit/i`) antes de insertar |
| `lib/db.ts:252-268` (`sincronizarGoogle`) | Lee `resenas_total` del mes anterior y luego upserta: dos syncs concurrentes (cron + botón manual) pueden calcular `resenas_nuevas` distinto según el orden. | Bajo | Calcular `resenas_nuevas` dentro del propio `INSERT … ON CONFLICT` con un sub-select, o aceptar el riesgo (ventana mínima) |

**① `getClientes` sin N+1:**

```ts
export async function getClientes(): Promise<Cliente[]> {
  const [comercios, metricas, ventas] = await Promise.all([
    sql`SELECT * FROM comercios ORDER BY fecha_alta ASC`,
    sql`SELECT * FROM metricas_mensuales ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc ORDER BY fecha ASC`,
  ]);

  const metricasPor = new Map<string, MetricaMensual[]>();
  for (const m of metricas) {
    const lista = metricasPor.get(m.comercio_id as string) ?? [];
    lista.push(mapMetrica(m));
    metricasPor.set(m.comercio_id as string, lista);
  }
  const ventasPor = new Map<string, VentaNFC[]>();
  for (const v of ventas) {
    const lista = ventasPor.get(v.comercio_id as string) ?? [];
    lista.push(mapVenta(v));
    ventasPor.set(v.comercio_id as string, lista);
  }

  // mapClienteBase = el cuerpo actual de ensambleCliente sin las 2 consultas
  return comercios.map((row) =>
    mapClienteBase(row, metricasPor.get(row.id as string) ?? [], ventasPor.get(row.id as string) ?? []),
  );
}
```

---

## 4. Auditoría de Neon DB e integridad del estado

**Lo que está bien (y no hay que tocar):**
- `prepare: false` en `lib/sql.ts:35` — correcto y obligatorio con PgBouncer
  (regla crítica del proyecto, respetada).
- Singleton de conexión reutilizado entre invocaciones de la misma instancia;
  sin fugas de conexión detectadas (ninguna ruta abre clientes propios).
- **100% de las consultas parametrizadas** vía template literals del driver
  `postgres` — cero concatenación de SQL, cero riesgo de inyección. Verificado
  en todo `lib/db.ts` y las rutas.
- `server-only` en todos los módulos de datos: imposible importarlos a un bundle
  de cliente.

**Hallazgos:**
1. **Configuración del pool para serverless** (`lib/sql.ts:28-36`): `max: 5` por
   instancia sin `idle_timeout` ni `connect_timeout`. Con un pico de tráfico,
   20 instancias × 5 = 100 conexiones contra el pooler, y las ociosas quedan
   colgadas hasta que Neon las corte. Recomendado:
   ```ts
   postgres(connectionString, {
     ssl: connectionString.includes("neon.tech") ? "require" : undefined,
     max: 2,              // por instancia serverless alcanza de sobra
     idle_timeout: 20,    // devolver conexiones ociosas al pooler
     connect_timeout: 10, // fallar rápido en cold start con Neon dormida
     prepare: false,      // NO TOCAR (PgBouncer)
   });
   ```
2. **La URL con `-pooler` no se valida:** el código funciona igual con la URL
   directa (5432, sin pooler), que en serverless agota las conexiones reales de
   Neon. Vale un chequeo suave: `if (connectionString.includes("neon.tech") &&
   !connectionString.includes("-pooler")) console.warn(...)`.
3. **Detección de SSL por substring `neon.tech`** es frágil (un cambio de host o
   un proxy la rompen en silencio). Más robusto: `sslmode=require` en la propia
   URL (ya documentado en `.env.example`) y dejar `ssl` sin forzar en código.
4. **Transacciones:** ver RF-07. Fuera de eso, las mutaciones restantes son de
   una sola sentencia (atómicas por sí mismas) — correcto.
5. **Índices:** ver RF-08 (migración 003 entregada). `taps` ya tiene
   `idx_taps_link_fecha` que cubre los GROUP BY del portal. ✅
6. **Artefactos huérfanos:** `metricas_mensuales.posicion_maps` es legacy
   declarado (la app no la lee ni escribe). No se droppea en esta auditoría —
   regla del proyecto: ningún DROP sin confirmación explícita. Queda anotado
   para una migración manual futura.
7. **`comercios.codigo_acceso` tiene 32 bits de entropía** (`randomBytes(4)` →
   8 hex). Es la credencial permanente del portal y no hay rate limit en
   `/portal/[codigo]`. Fuerza bruta online es poco práctica (2³²) pero el margen
   es fino para una credencial sin expiración. Subir a `randomBytes(8)` (16 hex,
   2⁶⁴) solo afecta códigos nuevos/regenerados — cambio de una línea en
   `generarCodigo()` (`lib/db.ts:142-144`).
8. **`google_refresh_token` en texto plano** en la tabla `comercios`. Si la DB o
   un backup se filtra, esos tokens dan acceso de lectura/gestión a las fichas de
   los clientes hasta que se revoquen. Recomendado (no urgente): cifrado a nivel
   aplicación (AES-256-GCM con una env var `TOKEN_ENCRYPTION_KEY`) al guardar/leer.
9. **Integridad referencial:** cascadas coherentes (`ON DELETE CASCADE` en todo
   lo que depende de un comercio; `SET NULL` en `links_nfc` devuelve la pieza al
   inventario — correcto para el modelo de hardware pre-impreso). El índice único
   parcial `resenas_origen_google_id_idx` previene duplicados del sync. ✅
10. **Errores silenciosos:** `registrarAuditoria` traga errores por diseño
    (documentado y razonable: la auditoría no debe romper la acción). Los
    `console.error` de `lib/places.ts`, `lib/google-oauth.ts` y
    `lib/google-reviews.ts` degradan a `null/false` que los llamadores manejan —
    aceptable, aunque un contador de fallos en la respuesta del cron haría los
    fallos visibles en los logs de Vercel Cron.

---

## 5. Prompt de refinamiento recursivo (siguiente turno)

> Sobre la rama `claude/zero-trust-security-audit-tdjzq9`, implementá las
> correcciones de las alertas rojas RF-01 a RF-07 del reporte
> `docs/AUDITORIA-ZERO-TRUST-2026-07.md`, en este orden de prioridad:
> (1) expiración + revocación de sesiones en `lib/auth.ts`, `middleware.ts` y
> `app/api/admin/oauth/callback/route.ts`; (2) cookie de contraseña firmada con
> HMAC y rate limit del login; (3) `next.config.ts` con cabeceras de seguridad;
> (4) validación de `comercioId` en `enviarFeedback`; (5) `maxDuration` y
> paralelismo acotado en el cron; (6) transacciones en `crearCliente` y
> `generarLotePiezas`; (7) `getClientes` sin N+1 y el matcher del middleware
> restringido a `/admin/:path*`. Verificá cada paso con `npx tsc --noEmit` y
> `npm run build`, cuidando que las sesiones existentes del equipo no se
> invaliden de forma sorpresiva (documentá si hace falta re-login). Commiteá en
> español, un commit por alerta.
