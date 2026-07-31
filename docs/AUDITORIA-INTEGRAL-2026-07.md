# Executive Audit Summary — MetricsField (ex Taply)

**Fecha:** 2026-07-31 · **Rama auditada:** `main` (commit `454ff67`) ·
**Método:** pipeline gstack (CSO/OWASP+STRIDE, review, plan-eng-review,
design/devex, docs) ejecutado a mano sobre el repo. `npm audit`, grep de
secretos/XSS/fugas y lectura completa de la capa de datos, auth y rutas.

> **Nota de alcance honesta.** Las Fases 4 (QA en navegador real) y 5
> (benchmark en vivo) **no se pudieron ejecutar**: este entorno no tiene
> salida de red hacia `app.metricsfield.com` (política del sandbox, 403 en
> el túnel) ni acceso a la base Neon, y la app es 100% `force-dynamic`
> (cada página necesita la DB para renderizar). Al final de este documento
> quedan los comandos exactos para correr esas dos fases ustedes mismos.
> No se fabricó ningún resultado de esas fases.

---

## Estado de salud global

| Área | Puntaje /10 | Resumen |
|---|---|---|
| Seguridad (Fase 1) | **8.5** | Base muy sólida: sesiones firmadas con vencimiento, PIN con scrypt+salt, comparaciones en tiempo constante, SQL 100% parametrizado, headers de seguridad, escape de HTML en emails, saneo de URLs. Pendientes acotados, ninguno crítico. |
| Arquitectura y código (Fase 2) | **8.0** | Capa de datos limpia, mutaciones atómicas/transaccionales, N+1 resuelto. Mayor deuda: **cero tests automatizados** y sin monitoreo de errores. |
| Diseño / UX / DX (Fase 3) | **7.0** | UI consistente con tokens de marca, sin "AI slop" evidente. DX con fricción: migraciones manuales en Neon y ausencia de suite de pruebas. Revisión estática solamente. |
| QA funcional (Fase 4) | **N/D** | No ejecutable desde este entorno (sin red ni DB). Instrucciones para correrla abajo. |
| Rendimiento (Fase 5) | **N/D** | No ejecutable en vivo. Análisis estático de queries incluido en Fase 2. |
| Documentación (Fase 6) | **5.5** | Buen `CONTEXTO-Y-PROGRESO.md`, pero **drift real** entre docs y código (detalle abajo). Rename Taply→MetricsField a medias. |

**Salud global ponderada (áreas ejecutables): ~7.5/10.** Producto maduro y
bien defendido para su etapa; el mayor riesgo estructural no es una brecha,
es la **falta total de pruebas automatizadas** sobre lógica de dinero
(finanzas/cobros), auth y el star-gate (base legal del producto).

---

## Hallazgos priorizados

### P0 — Crítico (romper o filtrar ya)
**Ninguno.** No se encontró ninguna vulnerabilidad de severidad crítica ni
brecha explotable directa. La auditoría zero-trust previa
(`AUDITORIA-ZERO-TRUST-2026-07.md`) cerró los vectores graves y el código
nuevo (autogestión, email) se sumó ya endurecido.

### P1 — Alto (resolver esta semana)

**P1-1 · Sin pruebas automatizadas sobre lógica sensible.**
No existe framework de tests (confirmado en `CLAUDE.md`). El star-gate
(`app/t/[slug]/page.tsx`), la verificación de sesión (`lib/sesion.ts`), el
PIN (`lib/pin.ts`) y los cobros (`app/admin/finanzas`) no tienen ninguna
red de seguridad. Un refactor futuro puede romper la base legal del
producto (esconder el link de Google) o el cálculo de un cobro sin que
nada avise. *Acción:* sumar Vitest con una decena de tests de caracterización
sobre esas cuatro zonas antes del próximo cambio grande.

**P1-2 · Rate limit en memoria por instancia (bypass horizontal).**
`lib/ratelimit.ts` guarda los contadores en un `Map` en memoria. En Vercel
cada instancia serverless tiene el suyo: un atacante que caiga en instancias
distintas (o fuerce cold starts) multiplica el límite efectivo. Afecta a las
cuatro defensas que dependen de él: **login de admin**, feedback público,
taps y **activación/edición de autogestión con PIN**. Es la única barrera
real contra fuerza bruta del PIN y del login. *Acción:* migrar a un store
compartido (Upstash Redis / Vercel KV) — es un reemplazo de `permitir()`,
no toca a los llamadores.

### P2 — Medio (planificar)

**P2-1 · Códigos de hardware secuenciales + PIN de baja entropía.**
`lib/db.ts:generarLotePiezas` emite códigos correlativos (`p-0001`, `p-0002`…)
y el PIN de autogestión es de 4-8 dígitos. La activación
(`activarAutogestion`) es atómica y la edición verifica PIN con scrypt en
tiempo constante — bien — pero con los códigos enumerables, la **única**
defensa contra reclamar piezas en masa o probar PINs es el rate limit por
IP (ver P1-2, que hoy es débil). El propio código lo reconoce en el
comentario. *Acción:* combinar con P1-2 y considerar un sufijo aleatorio en
el código de las piezas del canal Mercado Libre.

**P2-2 · Vulnerabilidades transitivas en `sharp`/libvips (vía Next.js).**
`npm audit`: 2 high (CVE-2026-33327/33328/35590/35591) en libvips, arrastradas
por `sharp`, dependencia transitiva del optimizador de imágenes de Next 15.
**Exploitabilidad práctica baja:** MetricsField ya no procesa imágenes
subidas por usuarios (la subida de capturas fue eliminada) y usa SVG/emoji
inline, no `next/image` con fuentes externas. Aun así conviene cerrarlo.
*Acción:* `npm update next` a la última 15.x parcheada (NO al 14.2.35 que
sugiere `npm audit` — es un downgrade mayor). Reverificar con `npm audit`.

**P2-3 · `google_refresh_token` en texto plano.**
`comercios.google_refresh_token` se guarda sin cifrar. Si la DB o un backup
se filtra, esos tokens dan acceso a las fichas de Business Profile de los
clientes hasta revocarlos. *Acción:* cifrado a nivel app (AES-256-GCM con
`TOKEN_ENCRYPTION_KEY`) al guardar/leer. No urgente (hoy en modo Prueba).

**P2-4 · Sin monitoreo de errores.**
Los fallos degradan a `console.error` (cron, email, Places). En serverless
esos logs se pierden salvo que alguien los mire en Vercel. Un cron que falla
a mitad de sync, o el SMTP caído, es invisible. *Acción:* Sentry (o similar)
en las rutas de cron y en `enviarEmail`.

**P2-5 · Documentación desincronizada del código (ver Fase 6).**

---

## Fase 1 — Seguridad (CSO: OWASP + STRIDE)

### Fortalezas verificadas (no tocar, están bien)
- **Sesiones:** cookies con vencimiento firmado por HMAC, formato unificado
  Node/Edge en `lib/sesion.ts`, comparación en tiempo constante. Revocación
  de admins Google en cada mutación (`requireAdmin`).
- **PIN de autogestión:** `scrypt` + salt random + `timingSafeEqual`, nunca
  en texto plano (`lib/pin.ts`).
- **SQL 100% parametrizado** vía template literals del driver `postgres` —
  cero concatenación, cero inyección. Verificado en toda la capa de datos.
- **XSS:** sin `dangerouslySetInnerHTML` en el árbol; el email al dueño
  escapa autor/texto de reseña (`lib/alertas.ts:escapeHtml`) anticipando la
  Reviews API.
- **Open redirect / header injection:** `urlSegura()` en `/t/[slug]` limpia
  caracteres de control y valida `new URL()` antes de cada `redirect()`.
- **Secretos:** ninguno hardcodeado; solo `NEXT_PUBLIC_BASE_URL` y
  `NEXT_PUBLIC_WHATSAPP_NUMBER` expuestos al cliente (ambos públicos por
  diseño). Cron protegido con `CRON_SECRET` en tiempo constante.
- **Rutas API:** todas las de `/api/admin/*` verifican sesión; las de OAuth
  portal usan el código + state cookie anti-CSRF; ninguna ruta admin quedó
  sin guard.

### STRIDE (resumen)
| Amenaza | Estado |
|---|---|
| **S**poofing | Mitigado: sesiones firmadas, allowlist Google, PIN scrypt. Residual: rate limit débil (P1-2). |
| **T**ampering | Mitigado: SQL parametrizado, UPDATEs atómicos, transacciones. |
| **R**epudiation | Mitigado: tabla `auditoria` con email por acción (Google) o "sin identificar" (password compartida). |
| **I**nformation disclosure | Residual: refresh token en claro (P2-3); mensajes de error de infra no se filtran (ya saneado en `requireAdmin`). |
| **D**enial of Service | Residual: rate limit por instancia (P1-2); cron con `maxDuration` y lotes acotados. |
| **E**levation of privilege | Mitigado: `requireAdmin` en toda action; portal aislado por código; autogestión solo sobre piezas libres. |

---

## Fase 2 — Arquitectura y código

- **Capa de datos (`lib/db.ts`):** patrón consistente snake_case→camelCase,
  mutaciones de una sentencia o en `sql.begin`, N+1 de `getClientes`
  resuelto, ruta caliente `/t/[slug]` en una sola query. Sólido.
- **Deuda principal:** **cero tests** (P1-1) y **sin monitoreo** (P2-4).
- **Riesgo de estado:** el esquema canónico (`db/schema.sql`) y las
  migraciones (`db/migrations/00X`) se mantienen a mano y en paralelo — es
  fácil que diverjan. Recomendado: un chequeo que valide que aplicar todas
  las migraciones sobre vacío produce exactamente `schema.sql`.
- **Rendimiento (estático):** los índices FK de la migración 003 cubren los
  filtros del portal; los `sincronizar*Todos` corren en lotes de 5 en
  paralelo con log por comercio. Sin N+1 remanentes detectados.

## Fase 3 — Diseño / UX / DX (revisión estática)

- **UI:** componentes propios con tokens de marca (`tailwind.config.ts`),
  clases responsive presentes, sin señales de "AI slop" (no hay copy
  genérico ni layouts rotos evidentes en el JSX). Revisión **estática** — no
  se abrió navegador (ver nota de alcance).
- **DX:** onboarding del dev razonable (`.env.example` completo,
  `CLAUDE.md`), pero dos fricciones: (1) migraciones que hay que correr a
  mano en Neon sin verificación automática; (2) sin `npm test`. El ciclo
  `tsc --noEmit` + `next build` es el único gate.

## Fase 4 — QA de navegador · **BLOQUEADA (entorno)**
No ejecutable: sin red hacia la URL en vivo ni DB local. Para correrla
ustedes con gstack, desde una máquina con la app levantada o contra el
preview de Vercel:
```
/qa https://app.metricsfield.com        # con gstack instalado
# o localmente:  npm run dev  →  /qa http://localhost:3000
```
Flujos a cubrir: login (password + Google), portal por código, star-gate
1-3★ vs 4-5★, activación de cartel autogestionado con PIN, edición con PIN
correcto/incorrecto, generación y asignación de hardware.

## Fase 5 — Benchmark · **BLOQUEADA (entorno)**
No ejecutable en vivo. Para correrla:
```
/benchmark https://app.metricsfield.com
```
Focos esperados por el análisis estático: TTFB de páginas `force-dynamic`
(cada una pega a Neon; el cold start del pooler domina), y el peso del
bundle del portal (el más pesado del build, ~111 kB First Load JS).

## Fase 6 — Documentación (drift real encontrado)

1. **`docs/CONTEXTO-Y-PROGRESO.md` afirma "magic bytes en uploads"** — no
   existe: la subida de capturas de prospectos **fue eliminada** del código,
   y cuando existía validaba por `type`, nunca por magic bytes. Corregir la
   afirmación (sección 5, "Seguridad").
2. **URL de producción desactualizada:** el doc dice
   `geo-seo-analytics.vercel.app`; la app en vivo es `app.metricsfield.com`.
3. **Rename Taply→MetricsField a medias:** la UI ya dice "MetricsField"
   (`app/login/page.tsx`, emails), pero `CLAUDE.md`, `README.md` y partes de
   los docs siguen diciendo "Taply". Unificar.
4. **`schema.sql` como referencia** puede quedar atrás de las migraciones
   006/007/008 — verificar que refleje `autogestionado`, `pin_hash`,
   `pin_salt`, `nombre_negocio`, `email_notificaciones`, `hora_resena`.

---

## Plan de acción sugerido

| Orden | Acción | Esfuerzo | Fase |
|---|---|---|---|
| 1 | Rate limit compartido (Upstash/Vercel KV) — cierra P1-2 y refuerza P2-1 | Medio | 1 |
| 2 | Vitest + ~10 tests de caracterización (star-gate, sesión, PIN, cobros) | Medio | 2 |
| 3 | `npm update next` a 15.x parcheada + reverificar `npm audit` | Bajo | 1 |
| 4 | Sentry en cron y `enviarEmail` | Bajo | 2 |
| 5 | Cifrar `google_refresh_token` (AES-GCM) | Medio | 1 |
| 6 | Corregir los 4 puntos de drift documental de la Fase 6 | Bajo | 6 |
| 7 | Correr `/qa` y `/benchmark` en vivo (Fases 4-5) desde una máquina con red | — | 4-5 |

---

*Reporte generado siguiendo la metodología del ecosistema gstack. Fases 4 y
5 pendientes de ejecución en un entorno con acceso a la app en vivo.*
