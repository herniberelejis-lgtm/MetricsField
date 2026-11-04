# Auditoría de MetricsField Reviews para contenido

**Verificado contra:** rama `main`, commit `74ebab2` (PR #255), que es lo que
corre en producción en app.metricsfield.com. Todo lo de esta tabla está en
`main`; nada sale de una rama sin fusionar.

**Interruptores:** en producción **no los pude leer** (Vercel no me deja ver
las variables). El equipo confirmó el 04/11/2026 que **están todos
encendidos**: `GOOGLE_BUSINESS_PROFILE_HABILITADO`, `GOOGLE_REVIEWS_API_ENABLED`
y `RESPUESTAS_IA_HABILITADAS`. Lo tomo como dato del equipo, marcado
"según el equipo". Si alguno se apaga, las filas que dependen de él dejan de
poder afirmarse.

## Qué hace el producto

| Qué hace | Dónde lo verifiqué | Estado | ¿Se puede afirmar en público? |
|---|---|---|---|
| El cartel (sticker, tarjeta o exhibidor) lleva a una URL corta `/t/<slug>`; al tocarlo o escanearlo, el celular abre la página de reseña de Google del comercio | `app/t/[slug]/page.tsx` | main | **Sí** |
| Todos van al mismo link público de Google, sin pantallas intermedias ni preguntas previas (no hay "star-gate") | `app/t/[slug]/page.tsx` → `RedireccionSuave` | main | **Sí**. Es una garantía del producto |
| Funciona por NFC (apoyar el celular) y por QR (escanear con la cámara) | `lib/qr.ts`, `PanelEscaneos` (NFC vs QR) | main | **Sí** |
| Cada toque o escaneo se cuenta; se guardan solo la fecha y hora, la pieza y el user-agent del navegador. **No** se guarda nombre, teléfono, mail ni ubicación de quien toca | `registrarTap` en `lib/db/links.ts`, tabla `taps` en `db/schema.sql` | main | **Sí**: "No guardamos datos personales de tus clientes" |
| No se cuentan los bots ni las vistas previas de links, y hay un tope por IP para que nadie infle los números | `UA_BOT` y `permitir(...)` en `app/t/[slug]/page.tsx` | main | **Con matiz**: "los números se filtran para que sean reales", sin prometer precisión total |
| Un toque **no** es una reseña: el sistema cuenta interacciones con el cartel; la reseña la decide el cliente | Ídem: se cuenta antes de salir a Google y no hay forma de saber qué hizo después | main | **Sí**, y conviene decirlo |
| El destino del cartel se cambia desde el panel sin reimprimir la pieza | comentario y lógica de `urlDestino`, `/t/[slug]/editar` | main | **Sí** |
| Piezas autogestionadas (Mercado Libre): el primer toque abre un formulario para configurarla; queda protegida con un PIN de 4 dígitos (rechaza PIN fáciles como 1234); "Mis piezas" para cambiarla o dejarla en blanco | `ActivarCartel`, `lib/pin.ts`, `/t/mis-piezas` | main | **Sí** |
| Portal del comercio `/portal/<código>`: el código privado es la credencial, solo lectura, cada comercio ve solo lo suyo | `lib/portal-auth.ts`, `app/portal/[codigo]` | main | **Sí**: "cada comercio ve solo sus datos" |
| Portal · **Resumen**: reseñas de hoy y del mes, toques del mes, proyección del mes, reseñas negativas, horas de más movimiento, pieza más usada, temas que se repiten en las reseñas, conclusiones | `PanelResumen` | main | **Sí** |
| Portal · **Reseñas**: lista de reseñas con respuesta sugerida para aprobar o editar, y menciones del personal | `PanelResenas` | main + `GOOGLE_REVIEWS_API_ENABLED` (según el equipo: encendido) | **Sí**, según el equipo |
| Portal · **Dispositivos y Escaneos**: toques por pieza, por día, NFC vs QR | `PanelDispositivos`, `PanelEscaneos` | main | **Sí** |
| Portal · **Calificación**: calificación y total de reseñas, evolución mes a mes, cuántas de 5★ faltan para la meta | `PanelRating`, `lib/conclusiones.ts` | main; el dato sale de Places API | **Sí**. "Te faltan X de 5★ para el 4,7" es una cuenta, no una promesa |
| Portal · **Competidores**: la calificación y las reseñas de los competidores que el comercio elige, y cómo cambian cada semana | `PanelCompetidores`, `lib/seguimiento-competencia.ts` | main + `GOOGLE_PLACES_API_KEY` | **Con matiz**: es una comparación entre los locales que vos elegís, **no** una "posición en Maps" |
| Portal · **El mes**: resumen mensual, recomendación y checklist | `PanelMes` | main | **Sí** |
| Visitas al perfil, llamadas y "cómo llegar" | `lib/gbp.ts`, `businessProfileHabilitado()` | main + `GOOGLE_BUSINESS_PROFILE_HABILITADO` (según el equipo: encendido) + el comercio tiene que **conectar su perfil** | **Con matiz**: "si conectás tu perfil de Google, ves visitas, llamadas y cómo llegar" |
| Conexión con Google Business Profile desde el portal: pide iniciar sesión con Google y el permiso `business.manage` sobre **su propio** perfil. Se usa para leer las métricas y las reseñas y para publicar las respuestas. El token se guarda cifrado | `lib/google-oauth.ts` (`PORTAL_SCOPE`), `lib/crypto.ts` | main | **Sí**: "lo conectás con tu cuenta y lo podés desconectar cuando quieras". No es un login a MetricsField |
| Respuestas automáticas (opcional, la prende el comercio): solo reseñas de 4-5★ (umbral elegido) **sin** quejas, sin links ni teléfonos, en castellano y no muy largas. Hasta 5 por día por comercio, nunca repite el texto de las últimas 40. Las demás quedan para responder a mano | `lib/auto-respuesta.ts` | main + `GOOGLE_REVIEWS_API_ENABLED` | **Sí**, describiendo las reglas |
| Si Google rechaza una respuesta automática, se **pausan** las automáticas, la reseña vuelve a la lista y se le avisa al dueño por mail | `lib/db/google-sync.ts` (respuestas rechazadas), `lib/alertas.ts` | main | **Sí** |
| Redacción con IA (Claude): opcional; menciona lo que dijo el cliente; recibe solo el texto, las estrellas, el nombre del comercio y el tono, **nunca** el nombre del autor; si falla, usa la plantilla | `lib/respuestas-ia.ts` | main + `RESPUESTAS_IA_HABILITADAS` (según el equipo: encendido) | **Con matiz**: "las respuestas se redactan según lo que dijo cada cliente". No decir que "la IA responde sola todo" |
| Informe de cada lunes por mail al dueño: cómo lo encontraron en Google, sus reseñas y cuántas se respondieron, la comparación con la competencia y lo que hizo MetricsField | `lib/informe-semanal.ts`, cron lunes 12:00 UTC = 9:00 de Córdoba (`vercel.json`) | main | **Sí**: "todos los lunes te llega un resumen" |
| Sincronización diaria con Google | cron `/api/cron/sync-google` a las 03:05 UTC (00:05 de Córdoba) | main | **Sí**: "los datos se actualizan todos los días" |
| Panel del equipo `/admin`: solo login con Google y una lista de admins | `middleware.ts`, `lib/auth.ts` | main | No hace falta en las piezas (es interno) |

## Límites conocidos

- Un toque no es una reseña; no se sabe si el cliente terminó dejándola.
- Las métricas de Google (visitas, llamadas) dependen de que el comercio conecte
  su perfil y de que Google mantenga habilitada la API.
- La calificación y el total de reseñas los informa Google; MetricsField no los
  controla.
- NFC: casi todos los celulares actuales lo tienen; en algunos iPhone viejos o
  con NFC apagado se usa el QR.
- El permiso de Google vence y hay que reconectarlo (el portal avisa antes).

## (a) Beneficios que SÍ podés afirmar

1. Tu cliente llega a tu página de reseñas de Google con un toque o un escaneo, sin apps ni pasos de más.
2. Todos van al mismo lugar: Google. No filtramos ni elegimos a quién.
3. Ves cuántas veces usaron cada pieza, qué día y a qué hora.
4. Ves tus reseñas, tu calificación y cómo cambian mes a mes.
5. Te sugerimos una respuesta para cada reseña; vos la aprobás o la editás.
6. Si querés, las reseñas positivas simples se responden solas, con reglas y con tope.
7. Comparás tu calificación con la de los competidores que elijas.
8. Todos los lunes te llega un resumen por mail.
9. No guardamos datos personales de quienes tocan la pieza.
10. Cambiás a dónde lleva la pieza sin reimprimirla.

## (b) Frases que NO hay que usar

- "Más reseñas", "más clientes", "más ventas", "duplicá tus reseñas" (el producto no lo garantiza).
- "Mejor posicionamiento", "aparecé primero en Google", "subí en Maps" (y nada de "posición en Maps").
- "Solo los clientes contentos", "evitá las malas reseñas", "filtrá" (sería review gating).
- "Reseña en segundos" o "cada toque es una reseña" (un toque no es una reseña).
- Cualquier premio, descuento o sorteo a cambio de la reseña.
- "Partner de Google", "oficial de Google", "aprobado por Google".
- "La IA responde todo por vos".
- Precios, prueba gratis y "Review Check" (a confirmar).

## (c) Preguntas para el equipo

1. ¿Hoy hay algún comercio real con el perfil de Google conectado y viendo visitas y llamadas? Si no, ¿mostramos esas métricas en las piezas igual (con datos de ejemplo) o las dejamos para cuando haya un caso real?
2. ¿Las respuestas automáticas y la IA están prendidas en algún comercio real, o solo están habilitadas?
3. ¿Qué CTA usamos por defecto en Reviews: DEMO o INFO?
4. ¿El exhibidor sigue a la venta? (aparece como "Standee" en el seed y en las fotos).
