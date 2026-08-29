# MetricsField Loyalty — el producto completo

> **Este documento es la fuente de verdad de Loyalty.** Reemplaza a los cinco
> archivos sueltos que había antes (brief técnico de julio, addendum de Apple
> Wallet, auditoría, análisis estratégico, base técnica). Si algo de esos
> contradice a esto, vale esto.
>
> Última actualización: agosto 2026 · Estado: **pre-producto, en desarrollo**

---

## 1 · Qué es, en una frase

**Reviews consigue que el cliente hable bien de vos en Google. Loyalty consigue
que ese mismo cliente vuelva — y que sepas quién es.**

Técnicamente: una tarjeta de fidelización que vive en la billetera digital que
el cliente ya tiene instalada (Google Wallet o Apple Wallet). Sin apps que
descargar, sin plástico, sin usuario ni contraseña.

Es **un solo producto con dos puertas de entrada**, según qué tipo de cliente lo
usa:

| Vertical | Cómo entra el cliente final | Momento |
|---|---|---|
| **Comercio físico** | Toca el standee NFC (o escanea el QR) en el mostrador | Cuando está en el local |
| **Tienda digital** (Mercado Libre) | Escanea un QR impreso en un papel dentro del paquete | Cuando abre lo que compró |

Las dos terminan en el mismo lugar: la tarjeta en la wallet, con puntos y
misiones. El motor es el mismo; cambia el disparador.

---

## 2 · El dolor que resuelve

> *"Conseguimos la visita, pero perdemos el contacto."*

Este es el problema real, y hoy no lo resuelve ningún producto nuestro.

### Lo que un comercio sabe hoy con Reviews

- Cuánta gente tocó el cartel (por día y por hora)
- Qué rating tiene en Google y qué dicen las reseñas
- Cuántas visitas, llamadas y clics en "cómo llegar" tuvo su ficha

Todo eso es **agregado y anónimo**. La tabla `taps` guarda `link_id`,
`creado_en` y `user_agent` — nada más. No hay identidad. El comercio sabe *cuánta*
gente vino, nunca *quién*.

Y hay un límite todavía más duro: el campo `autor` de una reseña de Google es
texto libre elegido por esa persona. No hay forma técnica de saber si "Juan P."
es la misma persona física que otra reseña firmada "Juanito 🍕". Google no nos
da identidad, y no va a dárnosla.

### Las tres consecuencias

1. **El comercio no tiene los datos de su cliente.** Alguien entra, compra, se
   va. No queda ni un teléfono para volver a hablarle.
2. **La retención depende de la memoria del cliente.** Sin un canal de
   recordatorio propio, el cliente que volvería con gusto simplemente se olvida.
3. **No se puede medir la recurrencia.** No es que se pierdan clientes
   recurrentes: es que no hay forma de saber cuántos se pierden ni de actuar.

### Lo que cambia con Loyalty

El comercio pasa de tener **un número** (cuántos taps) a tener **una base de
clientes propia**: nombres, teléfonos, frecuencia de visita, quién dejó de venir.
Y un canal directo a la pantalla de bloqueo de cada uno, sin costo por mensaje y
sin depender de que Google, Meta o Mercado Libre se lo permitan.

---

## 3 · Cómo se conecta con Reviews

Esta es la parte que hace que Loyalty sea barato de construir y difícil de
copiar: **no es un producto nuevo, es una capa sobre lo que ya está instalado.**

### Lo que se reusa tal cual

| Pieza que ya existe | Cómo la usa Loyalty |
|---|---|
| El hardware NFC/QR ya impreso e instalado | Mismo standee, mismo `/t/<slug>` — no hay que fabricar nada nuevo |
| El inventario de piezas (`/admin/hardware`) | Una pieza se marca con destino `loyalty` en vez de `resena` |
| La tabla `comercios` | Se le agregó una columna: `tiene_loyalty` |
| El panel de admin y el portal del cliente | Loyalty suma secciones, no reemplaza nada |
| `lib/ratelimit.ts` (Upstash) | El cooldown antifraude usa el mismo helper, no uno nuevo |
| La relación comercial con el comercio | Ya son clientes: el upsell no requiere venta fría |

### El único punto de contacto con el código de producción

`app/t/[slug]/page.tsx` — **un solo `if`**:

```
Cliente toca el cartel  →  /t/<slug>
                              │
                    ¿destino === 'loyalty'
                     Y comercio.tiene_loyalty
                     Y LOYALTY_ENABLED === 'true'?
                              │
                    ┌─────────┴─────────┐
                   SÍ                   NO
                    │                    │
              /l/<comercio>      Reseña de Google
              (Loyalty)          (comportamiento de siempre)
```

Si falta cualquiera de las tres condiciones, cae al comportamiento de siempre.
Nunca hay un callejón sin salida. **Si se borra el módulo entero, Reviews queda
exactamente igual.**

### Entitlements: un comercio, tres configuraciones posibles

La columna `comercios.tiene_loyalty` (booleana) define qué compró cada comercio:

| Configuración | `tiene_loyalty` | Qué ve el comercio |
|---|---|---|
| Reviews solo | `false` | Lo de siempre |
| Loyalty solo | `true`, sin piezas de reseña | Solo la parte de fidelización |
| **Pack completo** | `true` + piezas de reseña | Las dos cosas, mismo panel, misma factura |

El pack no requiere construir nada: **ya está soportado**. Es una decisión de
precio, no de desarrollo.

### Por qué el combo es más que la suma

Reviews captura el **momento de satisfacción** (la reseña pública en Google).
Loyalty captura a la **persona** (contacto + canal directo).

Ningún competidor de fidelización que revisamos tiene la pata de reputación
online. Y ninguna herramienta de reseñas tiene la de retención. El que ya tiene
el hardware instalado en el local es el único que puede hacer las dos cosas con
un solo tap.

---

## 4 · El flujo completo, paso a paso

### Vertical 1 — Comercio físico

```
1. TAP          Cliente apoya el celular en el standee del mostrador
                (o escanea el QR impreso, que es el respaldo)
                          ↓
2. LANDING      Se abre /l/<comercio> — web, no app. Menos de 20 segundos
                de punta a punta.
                          ↓
3. REGISTRO     Nombre + teléfono. Tres checkboxes de consentimiento
                (datos / wallet / marketing) — el de marketing es opcional.
                          ↓
4. EMISIÓN      El sistema detecta la plataforma:
                · Android → link "Agregar a Google Wallet"
                · iPhone  → archivo .pkpass "Agregar a Apple Wallet"
                          ↓
5. PRIMER SELLO La tarjeta se guarda con los puntos de bienvenida ya
                cargados. El cliente ve valor antes de hacer nada más.
                          ↓
6. MISIONES     Opcional. Si quiere sumar más puntos, puede dejar una reseña
   (opcional)   en Google, seguir al comercio en redes, o referir a alguien.
                Si no quiere, ya tiene su tarjeta igual.
```

### Vertical 2 — Tienda digital (Mercado Libre)

Idéntico del paso 2 en adelante. Cambia solo el paso 1:

```
1. UNBOXING     El comprador abre el paquete y encuentra un papel impreso
                con un QR. Lo escanea en el momento de mayor satisfacción.
```

**Restricción crítica de esta vertical:** el papel dentro del paquete no puede
invitar a comprar fuera de Mercado Libre, ni pedir seguir redes sociales
externas, ni pedir una reseña *positiva*. Mercado Libre penaliza el desvío de
tráfico y la manipulación de opiniones — puede llegar a la suspensión de la
cuenta del vendedor. El papel debe hablar de garantía, soporte y beneficios que
se ejecutan **dentro** del ecosistema de ML.

> **Estado de la vertical digital:** diseñada, no construida. El dashboard de
> Mercado Libre que existe hoy es una herramienta de una sola cuenta (la
> nuestra) con base local — antes de conectarle Loyalty hay que convertirlo en
> multi-cliente, que es un trabajo aparte y más grande. Ver §10.

---

## 5 · Qué datos vamos a obtener

Esta tabla es el corazón de la propuesta de valor. Cada dato sale de una acción
concreta del cliente, con su consentimiento.

| Dato | De dónde sale | Para qué le sirve al comercio |
|---|---|---|
| Nombre y teléfono | El cliente los carga al registrarse | Tener una base de contactos propia, por primera vez |
| Email (opcional) | Mismo formulario | Canal de respaldo si la wallet falla |
| Consentimiento versionado | Los 3 checkboxes, guardados con fecha y versión del texto | Cumplir la Ley 25.326 y poder demostrarlo |
| Fecha de cada visita | Cada tap que otorga puntos | Frecuencia real por persona, no un promedio |
| Última visita | Derivado del anterior | Detectar quién dejó de venir (churn) |
| Saldo de puntos | Suma del ledger | Saber cuánto vale cada cliente |
| Qué misiones completó | Log de eventos | Entender qué incentivo funciona |
| Qué beneficios canjeó | Tabla de canjes | Qué premio mueve la aguja |
| Tap → wallet (%) | Eventos `tap` vs `wallet_guardada` | La métrica que valida el producto entero |
| Retorno a 30 días (%) | Eventos de tap por cliente | La métrica que valida el *negocio* |

### La regla que ordena todo esto

**Todo se calcula sobre la tabla `eventos_loyalty`, que se escribe desde el día
uno.** Los KPIs son consultas sobre ese log, no un cálculo aparte que hay que
mantener sincronizado. Lo que no se captura desde el principio, no se
reconstruye después.

Cada evento guarda `ip_hash` (SHA-256), **nunca la IP en texto plano**. Esto
corrige a propósito una limitación conocida de la tabla `taps` de Reviews, que
no guarda nada que permita revisar un patrón sospechoso días después.

---

## 6 · El sistema de puntos y las misiones

### Cómo funcionan los puntos

El saldo de un cliente es la **suma de sus movimientos**, nunca un número que se
sobreescribe (`SUM(delta)` sobre la tabla `movimientos_puntos`). Esto se llama
ledger *append-only* y tiene tres consecuencias prácticas:

- **No hay bugs de concurrencia.** Dos taps simultáneos no se pisan.
- **La auditoría es gratis.** Siempre se puede ver de dónde salió cada punto.
- **Un doble click no duplica puntos.** Cada movimiento lleva una clave de
  idempotencia (`idem_clave`) única: el segundo intento choca y no inserta nada.

### Las misiones — y la verdad sobre cuáles se pueden verificar

Las misiones son **opcionales**. El cliente ya tiene su tarjeta con los puntos de
bienvenida; si quiere sumar más y se toma el trabajo, bien. Si no, no pasa nada.

| Misión | ¿Verificable? | Cómo funciona |
|---|---|---|
| **Referir a un amigo** | ✅ **Sí, automático** | El punto se acredita solo cuando el amigo hace su propio primer tap. No depende de la palabra de nadie. |
| **Compra mínima** | ✅ Sí | Dato propio del comercio |
| **Retorno activo** (volver antes de N días) | ✅ Sí | Se calcula sobre el log de eventos |
| **Cumpleaños** | ✅ Sí | Fecha cargada por el cliente |
| **Dejar reseña en Google** | ⚠️ **No — autodeclarado** | Verificar que *esta persona* dejó *esta reseña* requiere OAuth de Google del cliente final, que está fuera de alcance por decisión propia. Se le cree. |
| **Seguir en redes** | ⚠️ **No — autodeclarado** | Meta no ofrece API pública para confirmar "el usuario X sigue a la cuenta Y" sin integración OAuth de Meta Business. Se le cree. |

**Por qué el sistema de honor está bien acá:** el competidor directo que
revisamos hace exactamente lo mismo con la misma misión. Y hay un refuerzo
barato disponible: Reviews ya sincroniza las reseñas nuevas de Google todos los
días vía Places API. Se puede cruzar el volumen de reseñas nuevas de la semana
contra el volumen de misiones de reseña reclamadas, y marcar para revisión
manual lo que no cuadre. No es prueba, es una señal de auditoría que no cuesta
nada porque el dato ya llega solo.

**Regla legal que no se negocia:** la misión premia **el acto de opinar**, nunca
la calificación. Condicionar puntos a una reseña positiva es manipulación de
opiniones — Google lo penaliza y Mercado Libre también. Es la misma familia de
problema que el "star-gate" que ya se eliminó de Reviews por esta razón.

### Los beneficios (el canje)

Cada comercio arma su propio catálogo: café gratis, 15% de descuento, sello
digital, acceso VIP, promo en hora valle. El canje en el mostrador usa un código
QR de **un solo uso** con transacción atómica: valida el saldo, inserta el
movimiento negativo, marca el canje como validado y actualiza la wallet. No se
puede canjear dos veces el mismo código.

---

## 7 · Antifraude — cómo evitamos que nos carguen taps que no existieron

**El problema:** ni el NFC ni el QR prueban presencia física. Una vez que alguien
tiene la URL (fotografiando el QR, por ejemplo), la puede volver a abrir desde
cualquier lado. El `idem_clave` evita duplicar *un mismo envío*, pero no evita
que alguien repita la acción completa.

### Nivel 1 — lo que se implementa ahora (costo cero, sin hardware nuevo)

| Control | Cómo funciona |
|---|---|
| **Cooldown de 20 horas** | Un solo tap-que-otorga-puntos por cliente y comercio cada 20h. Usa `lib/ratelimit.ts`, el mismo helper que ya protege `/t/[slug]`. |
| **Geolocalización blanda** | Se compara la ubicación del navegador contra el `lat`/`lng` del comercio. No es criptografía — se puede falsear — pero sube la barrera del fraude oportunista. |
| **Horario del comercio** | Un tap a las 3 AM en una cafetería que cierra a las 20 es señal directa. |
| **NFC vs QR diferenciado** | El QR es fotografiable a distancia; el NFC exige apoyar el teléfono. Cooldown más estricto para el canal QR. |
| **Cola de revisión** | Volumen fuera de rango → aparece en el panel de admin para revisión manual. No bloquea, avisa. |

### Nivel 2 — solo si el fraude se vuelve un problema **medido**

Existe un chip NFC (NTAG 424 DNA) que genera una firma criptográfica distinta en
cada tap, haciendo el replay técnicamente imposible sin que el cliente instale
nada. Tiene sobrecosto real por unidad. **No hace falta para el piloto.** Si el
log de eventos muestra fraude real — evidencia, no sospecha — ahí se justifica.

### La distinción que hay que tener clara

Reviews tiene una regla firme: **nunca bloquear un tap real**, porque negarle a
un cliente el acceso a dejar una reseña es el peor resultado posible.

Loyalty bloquea el **segundo premio del día**, no el acceso. Son categorías
distintas de riesgo. Nadie queda sin poder dejar su reseña por culpa del
antifraude de Loyalty.

---

## 8 · Cómo se conecta con el panel

### El portal del cliente (`/portal/<codigo>`)

Hoy el comercio ve: taps, rating, reseñas, quejas, checklist SEO, benchmarking.
Todo **agregado y anónimo**.

Loyalty suma una sección nueva con lo que nunca tuvo:

- Cuántas tarjetas activas tiene
- Quiénes son (nombre, teléfono, última visita)
- Cuántos volvieron en los últimos 30 días
- Quiénes dejaron de venir
- Qué beneficios se canjearon
- Configuración de sus misiones y su catálogo de premios

**Cambio importante de naturaleza:** el portal es hoy de **solo lectura**. El
canje en mostrador es la primera escritura del lado del comercio. Eso exige
tratar esa pantalla con el mismo cuidado de seguridad que el panel de admin, no
con el de una vista.

### El panel de admin (`/admin`)

Suma una sección para el equipo: activar/desactivar Loyalty por comercio, ver el
estado de emisión de las tarjetas (si la API de Google o Apple falló para
alguien), y la cola de revisión de anomalías del antifraude.

### El cuarto sistema de acceso

Hoy hay tres formas de entrar al sistema, que no se pisan entre sí:

1. Cliente → su portal (el código privado es la credencial)
2. Equipo → panel de admin (contraseña compartida o Google con allowlist)
3. Cliente → conexión de su Google Business Profile (permiso de datos, no login)

Loyalty agrega el **cuarto**: el **cliente final** (el consumidor). Cookie
propia, ve solo sus propias filas, rate limit por IP en todo lo público nuevo.
**Es la primera vez que el sistema guarda datos personales de consumidores** —
por eso el consentimiento versionado y la ampliación de la política de
privacidad no son opcionales.

---

## 9 · Modelo de negocio

Misma lógica comercial que Reviews, que ya está probada:

| Componente | Tipo | Qué cubre |
|---|---|---|
| **Activación** | Pago único | El soporte físico (standee NFC / QR de mesa / papel impreso). Queda del comercio para siempre. |
| **Suscripción** | Mensual recurrente | El motor de wallet, misiones configurables, notificaciones y el panel de analíticas |
| **Email marketing** | Upsell futuro | Diseño, envío y automatización de campañas sobre la base propia del comercio |

### Por qué el cliente no se va (los costos de salida)

- **El historial analítico.** Cancelar implica perder la trazabilidad de meses.
- **La base de clientes fidelizados.** Las tarjetas emitidas y los puntos viven
  en nuestra infraestructura. Si el comercio se va, el programa se desarma
  frente a sus propios clientes — que ya tienen la tarjeta en el celular.
- **El hardware ya instalado.** La inversión inicial se apalanca en el uso
  continuo del software.

### El upsell natural

Todo cliente actual de Reviews es un candidato a Loyalty **sin venta fría**: ya
tiene el hardware puesto, ya nos paga, ya confía. El pack está soportado
técnicamente desde el día uno.

**Recomendación:** no vender el pack ampliamente hasta que el piloto de Loyalty
cierre sus cuatro targets (§13). Vender como "premium" algo que todavía no probó
que funciona es la trampa que ya evitamos una vez.

---

## 10 · Estado real del desarrollo

> Todo esto vive en el PR **#90**, rama `claude/loyalty-a1-migraciones` →
> `desarrollo`. Todavía **no está mergeado ni desplegado**.

### Hecho y verificado

| PR | Qué incluye | Estado |
|---|---|---|
| **A1** | Migración: 9 tablas + `ALTER comercios` (`tiene_loyalty`, `lat`, `lng`) | ✅ Escrito |
| **A2** | Flag `LOYALTY_ENABLED`, branch en el router del tap, landing `/l/<codigo>`, `lib/db/loyalty.ts` | ✅ Escrito |
| **A3** | Motor de puntos: ledger, antifraude, Google Wallet (Issuer API), Apple Wallet (`.pkpass`) | ✅ Escrito |

**Verificación:** `tsc --noEmit` limpio, **49/49 tests pasan** (13 nuevos). La
firma PKCS#7 de los pases de Apple se comprobó con **OpenSSL** contra una cadena
de certificados de prueba — no solo "no tira excepción", se validó de verdad.

`next build` no se pudo probar en el entorno de desarrollo por falta de
`DATABASE_URL` (sin acceso a Neon desde ahí). **Alguien con acceso tiene que
correrlo antes de mergear.**

### Falta construir

| PR | Qué | Bloqueante de |
|---|---|---|
| **A4** | Formulario de registro + consentimiento + primer sello en la landing | Todo lo demás |
| **A5** | Misiones: lógica, configuración por comercio, acreditación | El valor diferencial |
| **A6** | Canje en mostrador (QR de un solo uso) | Cerrar el ciclo |
| **A7** | Sección de admin + métricas en el portal | Que el comercio vea el valor |
| **A8** | Tests del flujo crítico completo | Mergear con confianza |
| **A9** | Legal (política de privacidad ampliada) + hardening | Salir a producción |

### Tareas que no son de código y bloquean el lanzamiento

- [ ] **Cuenta de Apple Developer Program** (~99 USD/año) — sin esto no hay pases
      de Apple. Los certificados (Pass Type ID + WWDR) se generan una vez y
      **vencen aproximadamente cada año**: alguien tiene que tenerlo en el
      calendario o se corta la emisión de tarjetas nuevas.
- [ ] **Cuenta de Google Wallet Issuer** (gratis) + cuenta de servicio en GCP
- [ ] **Correr la migración 011 a mano en Neon** — no se auto-aplica, es la
      regla de oro del repo
- [ ] **Ampliar la política de privacidad** — primera vez que guardamos datos de
      consumidores
- [ ] **Elegir 2-3 comercios piloto** entre los clientes actuales de Reviews

---

## 11 · Decisiones ya tomadas (no re-litigar)

Para que nadie vuelva a abrir estas discusiones sin información nueva:

| Decisión | Por qué |
|---|---|
| **Mismo repo, no uno nuevo** | Módulo aditivo detrás de un flag. El patrón se llama *modular monolith* y es el consenso de la industria para esta etapa. Microservicios acá sería complejidad prematura. |
| **Apple Wallet en Fase A, no en Fase C** | El competidor directo ya tiene Google + Apple funcionando desde el día uno. Salir solo con Android capaba artificialmente la única métrica que importa (tap → wallet). |
| **Apple como pase estático en Fase A** | El pase se guarda con el saldo del momento. Las actualizaciones automáticas por APNs son un subsistema entero — se hacen en Fase B para no bloquear el lanzamiento. |
| **Sin OAuth nuevo de terceros** | Meta, Shopify, GA4 quedan fuera. Por eso las misiones sociales son autodeclaradas. |
| **Postgres/Neon, sin ORM, Server Actions** | Es lo que ya corre en producción. No se cambia el motor a mitad de camino. |
| **La base propia es la fuente de verdad** | Google y Apple son una *proyección*. Si su API cae, la membresía queda pendiente y un cron reintenta. Nunca se pierde un punto por una caída externa. |
| **Dos implementaciones independientes por vertical** | Física y digital comparten el diseño conceptual, no el código. Cada repo tiene su propio stack y su propia noción de identidad. |

---

## 12 · Lo que todavía falta definir

Honestidad sobre los huecos abiertos:

1. **¿Offline en caja?** Si un comercio piloto tiene mala conectividad, hace
   falta una capa PWA con cola local. Si todos tienen wifi decente, es
   sobre-ingeniería. **Depende de qué comercios elijamos.**
2. **El reparto de tareas A4-A9.** El plan original asumía un equipo que cambió.
3. **De dónde salen los assets de marca** (logo del comercio para la tarjeta).
4. **La vertical de Mercado Libre completa.** El dashboard actual es
   single-tenant con base local: convertirlo en SaaS multi-cliente (migrar a
   Postgres, construir login, hostear) es un proyecto en sí mismo, comparable en
   tamaño a todo lo que ya se construyó ahí. **No es "un ratito antes de
   Loyalty".**
5. **Nadie pidió esto todavía.** No hay un comercio concreto esperando Loyalty.
   Es la tarea más importante de todas y no es de desarrollo: **conseguir que un
   dueño real diga "esto lo necesito"** antes de terminar las seis PRs que
   faltan.

---

## 13 · Cómo sabemos si funcionó (go/no-go del piloto)

Seis semanas, 2-3 comercios. Los cuatro números salen solos del log de eventos:

| Métrica | Target | Qué significa si no se cumple |
|---|---|---|
| **Tap → wallet guardada** | > 30% | La fricción es demasiado alta. Problema de flujo, no de producto. |
| **Tarjetas activas por comercio** | ≥ 150 | El volumen del local no alcanza para que el programa tenga sentido. |
| **Clientes que vuelven en 30 días** | ≥ 25% | Los puntos no mueven la conducta. Problema de producto. |
| **Comercios que renuevan pagando** | 2 de 3 | El comercio no percibe el valor. Problema de negocio. |

**Medir tap → wallet separado por plataforma (Android vs iPhone).** Si se mira
solo el número agregado, no hay forma de saber si Apple realmente aportó o si
Android sostenía el promedio.

Si no se cumplen: se frena Fase B/C y se revisa el producto. Sin drama — para
eso existe el corte.

---

## 14 · Dónde está cada cosa en el código

| Necesito... | Está en |
|---|---|
| Las 9 tablas nuevas | `db/migrations/011_loyalty_fundaciones.sql` |
| El esquema canónico completo | `db/schema.sql` |
| Ledger, membresías, eventos | `lib/db/loyalty.ts` |
| Cooldown y hash de IP | `lib/loyalty-antifraude.ts` |
| Google Wallet | `lib/wallet/google.ts` |
| Apple Wallet (.pkpass) | `lib/wallet/apple.ts` |
| El branch del router | `app/t/[slug]/page.tsx` |
| La landing pública | `app/(loyalty)/l/[codigo]/page.tsx` |
| Variables de entorno necesarias | `.env.example` |
| Reglas de integridad de taps (Reviews) | `docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html` |
