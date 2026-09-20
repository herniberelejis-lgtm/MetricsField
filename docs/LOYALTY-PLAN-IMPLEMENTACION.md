# Loyalty — plan de implementación

> **Para quien ejecuta.** Cada PR de acá es autocontenido: objetivo, archivos que
> toca, criterios de aceptación y cómo se verifica. El *por qué* de cada decisión
> está en `docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md` — leerlo antes de empezar.
>
> **Reglas del repo que aplican a todo lo de acá** (de `CLAUDE.md`):
> - Todo en español: código, comentarios, commits, UI.
> - Nunca pushear directo a `main`. Una rama por PR.
> - Ciclo por tarea: `npx tsc --noEmit` + `npm test` + `npm run build`.
> - Los cambios de esquema **no se auto-aplican**: se entregan como `.sql` para
>   correr a mano en Neon. Nunca asumir que ya se aplicó.
> - No borrar un test para que pase un cambio.

---

## Estado de partida

Lo que ya está escrito y **se conserva**: el flag `LOYALTY_ENABLED`, la rama del
router en `app/t/[slug]/page.tsx`, el scaffold de la landing, y la lógica de firma
de `lib/wallet/google.ts` y `lib/wallet/apple.ts`.

Lo que se **reescribe**: `db/migrations/012_loyalty_fundaciones.sql`,
`lib/db/loyalty.ts` y `lib/loyalty-antifraude.ts`.

**PR #90 ya está mergeado a `desarrollo`** (no a `main` — falta A4). El archivo de
migración se renumeró de `011` a `012` al ponerse al día contra `main` (otro PR ya
tenía el 011); el contenido es el mismo que motivó este plan. La migración
**nunca se corrió en Neon** — `desarrollo` tiene el código pero no hay una sola
fila de estas tablas en la base real —, por eso se reescribe el archivo en vez de
migrar datos reales. `LOYALTY_ENABLED` sigue en `false`: el módulo es código
muerto en producción y en el preview de `desarrollo`.

**Esta rama de trabajo parte de `desarrollo`, no de `claude/loyalty-a1-migraciones`**
— esa rama ya cumplió su función y no conviene seguir acumulando commits ahí.

---

## L0 · Cuentas y trámites (sin código, en paralelo, empezar ya)

No es de desarrollo pero **bloquea el lanzamiento** y tiene el plazo más largo de
todo el proyecto.

> **El camino crítico es Apple, no Google.** El enrollment como organización está
> reportado en **2 a 7+ semanas** en los foros oficiales de Apple durante 2026,
> sin plazo comprometido. La estrategia de abajo lo esquiva.

### Primero: dos verificaciones que pueden ahorrar semanas (30 min en total)

- [ ] **Lookup de D-U-N-S** → `developer.apple.com/enroll/duns-lookup/`
      D&B asigna números sin que la empresa los pida: **puede que MetricsField ya
      tenga uno.** Si existe, se usa al instante y se ahorran 5-7 días hábiles. Si
      no, se solicita ahí mismo (gratis) y el reloj arranca en ese momento.
      ⚠️ Exige sociedad formalmente constituida — nombres de fantasía y
      monotributo no califican.
- [ ] **Revisar el tipo del payments profile del Workspace.** Workspace ya se
      factura contra uno, y Google permite reutilizarlo.
      ⚠️ **La elección Individual vs Business es irreversible.** Si el del
      Workspace quedó como *Individual*, **no reutilizarlo**: crear uno nuevo como
      *Business*. Ahorrar dos días acá no vale marcar el issuer para siempre.

### Apple — entrar por la puerta rápida

- [ ] **Enrollment como INDIVIDUAL el primer día** (99 USD, aprobación ~24-48 h).
      Desbloquea emitir pases reales en dos días en vez de dos meses.
      El nombre legal del titular tiene que ir **exacto**; es la única causa de
      demora que Apple documenta explícitamente.
- [ ] **Pass Type ID + certificado** apenas se apruebe. Es self-service e
      inmediato, sin revisión humana.
- [ ] **Abrir en paralelo el caso de conversión a organización** con soporte de
      Apple. Corre de fondo semanas sin frenar nada, y la membresía se transfiere
      sin pagar de nuevo.
- [ ] 🔴 **Antes de emitir pases a consumidores reales, confirmar por escrito con
      soporte de Apple que la conversión individual → organización preserva el
      Team ID.** Los `Pass Type ID` cuelgan del Team ID y `pass.json` lleva
      `teamIdentifier`: si el Team ID cambiara en la conversión, **todos los pases
      ya emitidos quedarían huérfanos en el teléfono de la gente.** Las fuentes
      disponibles dicen que se preserva, pero **no está confirmado en
      documentación oficial de Apple**. Es barato preguntarlo y caro asumirlo.
- [ ] Recordatorio en calendario a 30 días del vencimiento del certificado.

### Google — llegar con todo completo

Solo hay **dos prerrequisitos formales**, pero uno tiene una trampa:

- [ ] **Business Profile completo + payments profile vinculado.**
- [ ] **Al menos una `loyaltyClass` creada** — ya está hecho.
- [ ] ⚠️ **Prerrequisito oculto: los sitios que la clase referencia también se
      revisan.** Los ToS son explícitos. El sitio tiene que estar **publicado y
      con política de privacidad** antes de solicitar, o la revisión se traba ahí.
- [ ] Revisar la clase contra las *brand guidelines* (cantidad de módulos, logo,
      hero image) antes de solicitar.
- [ ] **Recién entonces pedir el publishing access.** El botón solo aparece cuando
      los prerrequisitos están completos: si no está, falta algo.
- [ ] Cuenta de servicio en GCP con rol *Wallet Object Issuer*; credenciales en
      Vercel como *sensitive*.

> **Los screenshots ya no son requisito formal.** No perder tiempo armándolos,
> aunque un contacto de Google puede pedirlos después.
>
> **Google no publica ningún plazo** y no hay reportes sólidos de la comunidad.
> Trabajar con un rango estimado de 2-10 días hábiles, comunicado como
> incertidumbre y nunca como compromiso a un comercio.
>
> **No lanzar con Google en Demo Mode.** El "[TEST ONLY]" en el pase quema la
> credibilidad frente al comercio. O se espera la aprobación, o se sale solo con
> Apple.

### Legal

- [ ] Anexo de tratamiento de datos para firmar con cada comercio piloto
      (revisado por abogado).

### Consecuencia para el producto

Las dos pistas están **desacopladas**: se puede lanzar con la que se apruebe
primero. La landing debe detectar la plataforma y mostrar **solo el botón
disponible**, con un "próximamente" para la otra. Nunca mostrar un botón que
falla. Esto entra en los criterios de aceptación de **L4**.

---

## L1 · Esquema, rol y cliente de base

**Objetivo.** Dejar la base lista y separada, sin tocar nada de la app todavía.

**Archivos**
- `db/migrations/012_loyalty_fundaciones.sql` — reescribir completo con el SQL de
  §4 del documento de arquitectura.
- `db/migrations/013_loyalty_rol.sql` — nuevo, con los `GRANT`/`REVOKE`.
- `db/schema.sql` — reflejar el esquema `loyalty` y **quitar** las columnas
  `lat`/`lng` de `comercios` (se habían agregado para la geolocalización blanda,
  que quedó fuera del alcance).
- `lib/sql-loyalty.ts` — nuevo, cliente Postgres con `LOYALTY_DATABASE_URL`,
  copiando la configuración de `lib/sql.ts` (`prepare: false`, `max: 2`,
  `ssl: require` en Neon). **`prepare: false` es obligatorio**, igual que en el
  cliente principal.
- `.env.example` — agregar `LOYALTY_DATABASE_URL`, `LOYALTY_PII_KEY`,
  `LOYALTY_IP_PEPPER`, con el comentario de qué son y cómo generarlas.

**Criterios de aceptación**
- El archivo `.sql` corre limpio en una base vacía y es idempotente en lo posible.
- `REVOKE UPDATE, DELETE ON loyalty.movimientos` está presente.
- `db/schema.sql` y la migración coinciden exactamente.
- `npx tsc --noEmit` y `npm run build` pasan.

**Entregable aparte:** un mensaje corto que diga exactamente qué correr en el SQL
Editor de Neon y en qué orden.

---

## L2 · Identidad, sesión y cifrado de datos personales

**Objetivo.** La membresía como credencial y los datos personales cifrados.

**Archivos**
- `lib/loyalty/identidad.ts` — nuevo:
  - `generarToken()` → 32 bytes de `crypto.randomBytes`, base64url.
  - `hashToken(token)` → SHA-256, para guardar y para buscar.
  - `normalizarTelefono(entrada)` → E.164 argentino. **Sin esto el `UNIQUE` del
    índice ciego no sirve**: `351 555 1234`, `+543515551234` y `03515551234`
    tienen que dar el mismo resultado.
  - `hmacTelefono(e164)` → HMAC-SHA256 con `LOYALTY_PII_KEY`.
  - `cifrar(texto)` / `descifrar(buf)` → AES-256-GCM con `LOYALTY_PII_KEY`.
  - `hmacIp(ip)` → HMAC-SHA256 con `LOYALTY_IP_PEPPER`.
- `lib/loyalty/sesion.ts` — nuevo: cookie `loyalty_membresia`, `HttpOnly`,
  `Secure`, `SameSite=Lax`, y lectura de la membresía a partir del token.
- `test/loyalty-identidad.test.ts` — nuevo.
- Borrar `lib/loyalty-antifraude.ts` (su `hashearIp` queda reemplazado por
  `hmacIp`; el cooldown se va al ledger en L3). Actualizar
  `test/loyalty-antifraude.test.ts` en consecuencia.

**Criterios de aceptación**
- Tests, escritos antes del código:
  - `normalizarTelefono` unifica al menos seis formatos reales distintos.
  - `cifrar`/`descifrar` es ida y vuelta, y dos cifrados del mismo texto dan
    ciphertext distinto (IV aleatorio).
  - `hmacTelefono` es determinístico y cambia si cambia la clave.
  - `hashToken` de dos tokens distintos no colisiona; el token no aparece en el hash.
- Ninguna función de este módulo toca la base (deben testearse sin `DATABASE_URL`).

---

## L3 · Motor de puntos

**Objetivo.** El ledger a prueba de concurrencia. **Es el PR más importante de
todos** — acá es donde el sistema puede perder dinero.

**Archivos**
- `lib/db/loyalty.ts` — reescribir: `registrarMovimiento` con la transacción de §5
  del documento de arquitectura, `obtenerOCrearMembresia`, `registrarEvento`,
  `registrarVisita` (que arma la `idem_clave` con la ventana de 20h).
- `test/loyalty-ledger.test.ts` — nuevo.

**Criterios de aceptación**
- `registrarMovimiento` corre dentro de `sqlLoyalty.begin()`, **una sola
  transacción**.
- Un `delta` negativo que dejaría el saldo bajo cero **no aplica** y no deja fila
  en el ledger.
- Reenviar la misma `idem_clave` no duplica puntos y el llamador lo recibe como
  éxito, no como error.
- La `idem_clave` de una visita es `visita:<membresia_id>:<floor(epoch/72000)>`.
- **Ninguna llamada a `lib/ratelimit.ts` para el cooldown.** Redis queda solo para
  anti-DoS por IP.
- Test de concurrencia: dos canjes simultáneos sobre el mismo saldo justo →
  exactamente uno aplica, el saldo termina en cero, nunca negativo.

> Si no hay base de test disponible, el test de concurrencia se marca como
> pendiente y se verifica a mano en la rama de preview contra Neon, dejando el
> resultado anotado en el PR. **No se mergea sin esa verificación.**

---

## L4 · Registro, consentimiento y emisión de la tarjeta

**Objetivo.** El flujo que mide tap → wallet. Es el corazón del piloto.

**Archivos**
- `app/(loyalty)/l/[codigo]/page.tsx` — la landing real. Busca por
  `programas.codigo_publico`, no por `comercios.id`.
- `app/(loyalty)/l/[codigo]/actions.ts` — nuevo. Server Action de registro.
- `components/loyalty/FormularioAlta.tsx` — nuevo.
- `app/(loyalty)/tarjeta/page.tsx` — nuevo. La tarjeta viva del cliente (saldo,
  beneficios disponibles, baja).
- `lib/wallet/google.ts` — corregir `generarLinkGuardar` para que el JWT
  referencie el objeto por ID, sin payload inline.
- `lib/wallet/apple.ts` — sacar el saldo de `headerFields`; dejar nombre del
  miembro y link a la tarjeta web.

**Criterios de aceptación — seguridad**
- La Server Action **no acepta `programa_id`, `comercio_id` ni puntos desde el
  cliente**. El programa se resuelve del segmento de URL en el servidor; los
  puntos de bienvenida salen de la base.
- Toda entrada se valida antes de usarse: nombre de 1 a 80 caracteres, teléfono
  normalizable, email opcional con formato válido.
- Rate limit por IP en el alta (`lib/ratelimit.ts`, acá sí corresponde).
- La respuesta es **idéntica** exista o no ese teléfono en el programa. No filtrar
  si alguien ya está registrado.
- La cookie de sesión se emite con el token nuevo; en la base solo va el hash.

**Criterios de aceptación — legal** (todos bloqueantes)
- Tres checkboxes **desmarcados por defecto**: datos, wallet, marketing. Los dos
  primeros obligatorios, marketing opcional y visiblemente separado.
- Checkbox de declaración de 16 años o más.
- Bloque informativo del art. 6 **visible en el formulario**, no detrás de un link.
- El texto del checkbox de datos dice explícitamente que se guardan en servidores
  fuera de la Argentina y que se comparten con Google y Apple para emitir el pase.
- Se guarda `version`, `texto_hash`, `user_agent` e `ip_hmac` en
  `loyalty.consentimientos`.

**Criterios de aceptación — eventos**
- Se registra `tap`, `registro` y `wallet_guardada` con `plataforma` detectada del
  user agent. Sin esto no se puede calcular el KPI del piloto separado por
  Android/iPhone, que es un requisito explícito.

---

## L5 · Canje

**Objetivo.** Cerrar el ciclo. Sin esto no hay motivo para volver, y el piloto no
puede medir recurrencia.

**Archivos**
- `app/(loyalty)/tarjeta/actions.ts` — pedir canje.
- `app/portal/[codigo]/canjes/page.tsx` — nuevo. Pantalla del comercio, en vivo.
- `app/portal/[codigo]/canjes/actions.ts` — nuevo. Confirmar entrega.
- `components/portal/CanjesPendientes.tsx` — nuevo.
- `lib/db/loyalty.ts` — `pedirCanje`, `confirmarCanje`, `vencerCanjes`.

**Criterios de aceptación**
- Pedir un canje crea la fila en `pendiente` con `expira_en = now() + 5 min` y
  **no descuenta puntos**.
- Confirmar usa el `UPDATE ... WHERE id AND programa_id AND estado='pendiente' AND
  expira_en > now()` de §6. **Nunca leer primero y decidir después.**
- El descuento ocurre en la misma transacción que la confirmación, con
  `idemClave = 'canje:<canje_id>'`.
- Toda action del portal empieza validando sesión y que el `programa_id`
  pertenezca al comercio de esa sesión. Un canje de otro comercio devuelve el
  mismo error genérico que uno inexistente.
- `confirmado_por` guarda el email del empleado.
- Un canje vencido no se puede confirmar. Un cron los marca `vencido`.
- Test: confirmar dos veces el mismo canje descuenta **una sola vez**.

---

## L6 · Métricas del piloto

**Objetivo.** Que los cuatro números del go/no-go salgan solos del log de eventos.

**Archivos**
- `lib/db/loyalty-metricas.ts` — nuevo.
- `components/portal/LoyaltyResumen.tsx` — nuevo, sección en el portal.
- Sección en `/admin` para activar Loyalty por comercio y ver estado de emisión.

**Criterios de aceptación**
- Tap → wallet guardada, **separado por plataforma**.
- Tarjetas activas: membresías con **≥ 1 visita confirmada**, no altas totales.
- Clientes que volvieron a 30 días.
- Canjes confirmados.
- El portal **no muestra el teléfono completo** en listados. Se descifra solo en
  la ficha individual y queda registrado quién la abrió.

---

## L7 · Legal, hardening y encendido

**Objetivo.** Lo último antes de poner `LOYALTY_ENABLED=true`.

- [ ] Política de privacidad ampliada y versionada, publicada.
- [ ] Términos del programa: cómo se ganan, pierden y vencen los puntos; qué pasa
      si el comercio se da de baja; edad mínima.
- [ ] Baja total y baja solo de marketing, separadas, desde la tarjeta del cliente.
- [ ] El borrado revoca además el pase en Google y Apple.
- [ ] Runbook de rotación de claves escrito.
- [ ] Revisión de que ningún log de Vercel imprima teléfonos, nombres ni tokens.
- [ ] Si se exporta a CSV: prefijar con `'` todo campo que empiece con `=`, `+`,
      `-` o `@` (inyección de fórmulas en planillas).
- [ ] Pasada del agente `security-reviewer` sobre todo el módulo.
- [ ] Anexo de datos firmado con cada comercio piloto.

**Solo entonces:** `LOYALTY_ENABLED=true` y `tiene_loyalty` en los comercios del
piloto.

---

## Orden y dependencias

```
L0 cuentas  ─────────────────────────────────────────►  (bloquea L4 y el piloto)

L1 esquema ──► L2 identidad ──► L3 motor ──► L4 registro ──► L5 canje ──► L6 métricas ──► L7 encendido
```

L0 corre en paralelo desde el día uno. L1 a L3 no dependen de las cuentas y se
pueden hacer mientras Google y Apple responden.

**El único orden que no se puede alterar:** L3 antes que L4 y L5. Construir el
flujo de registro sobre un ledger que puede quedar en saldo negativo es construir
sobre arena.
