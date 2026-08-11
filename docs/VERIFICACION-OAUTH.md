# Cómo hacer, paso a paso — verificación OAuth

Seguí este orden, cada paso depende del anterior.

---

## 1. Verificar `metricsfield.com` en Search Console

1. Andá a **search.google.com/search-console**, entrá con la MISMA cuenta de Google que administra el proyecto en Cloud Console (importante: tiene que ser la misma).
2. Arriba a la izquierda, donde dice "Agregar propiedad" → elegí el tipo **"Dominio"** (no "Prefijo de URL" — el de dominio verifica todo junto, incluido `app.metricsfield.com`, con un solo paso).
3. Escribí `metricsfield.com` (sin `https://`, sin `www`) → Continuar.
4. Google te va a mostrar un **registro TXT** para agregar a tu DNS — copiá ese valor.
5. Andá al proveedor de DNS donde está cargado el dominio (el mismo lugar donde está el CNAME de `app.metricsfield.com` que dice CLAUDE.md) → agregá un registro nuevo tipo **TXT**, en el dominio raíz (`@` o vacío, no un subdominio), pegando el valor que te dio Google.
6. Volvé a Search Console → botón **Verificar**. Puede tardar desde minutos hasta unas horas en propagar — si falla al toque, esperá un rato y reintentá, no está mal hecho.

## 2. Dominios autorizados en Cloud Console

1. Andá a **console.cloud.google.com/apis/credentials/consent**, con el proyecto correcto seleccionado arriba.
2. Buscá la sección **"Authorized domains"** (dominios autorizados).
3. Agregá `metricsfield.com`. Si `app.metricsfield.com` no aparece ya en la lista, agregalo también.
4. Guardar.

## 3. Completar la pantalla de consentimiento OAuth

Misma página que el paso 2, sección de datos de la app:

| Campo | Valor |
|---|---|
| App name | `MetricsField` |
| App logo | El isotipo del manual de marca (subí el archivo de logo que tengan en alta resolución) |
| Application home page | `https://metricsfield.com` |
| Application privacy policy link | `https://app.metricsfield.com/privacidad` |
| Application terms of service (opcional, pero sumá si tenés) | `https://app.metricsfield.com/terminos` |
| Developer contact information | `info@metricsfield.com` |

Guardar.

## 4. Confirmar los scopes declarados

1. Misma pantalla de consentimiento → sección **"Scopes"** → **"Add or remove scopes"**.
2. Tienen que estar marcados: `.../auth/business.manage`, `openid`, `email`, `profile`. Si ya funcionaba el login antes, probablemente ya estén cargados — solo confirmalos, no hace falta sacar ni agregar nada más.

## 5. Confirmar los Redirect URIs

1. Andá a **console.cloud.google.com/apis/credentials** → click en el "OAuth 2.0 Client ID" que están usando.
2. En **"Authorized redirect URIs"**, confirmá que estén cargadas EXACTO estas dos (copiá y pegá, no las tipees a mano):
   ```
   https://app.metricsfield.com/api/portal/google/oauth/callback
   https://app.metricsfield.com/api/admin/oauth/callback
   ```

## 6. Agregar la cuenta que va a grabar como Test User

1. Pantalla de consentimiento OAuth → sección **"Test users"** → **"Add users"**.
2. Agregá el email de Google que van a usar para grabar el video (Hernán, o la cuenta que decidan).

## 7. Conseguir datos reales para mostrar en el video

Esto no es un paso de Google, es logística interna: la cuenta que graba tiene que estar conectada a una ficha de Business Profile con datos de verdad (visitas, llamadas, clics), no una vacía en cero. Dos caminos:
- Usar un comercio real que ya tengan cargado y que ya haya conectado su Google (si existe alguno).
- Si no hay ninguno todavía, armar uno de prueba con una ficha real de Google Maps y esperar unos días a que junte datos antes de grabar — no se puede apurar esto, los datos de Business Profile no aparecen al instante.

Coordinar esto con Luis, que ya tiene entre sus tareas cargar comercios de demo.

## 8. Grabar el video

- Grabador: el nativo de Windows alcanza — **`Win + G`** abre la barra de juegos, tiene botón de grabar pantalla. O Loom/OBS si prefieren.
- Antes de grabar: abrí el navegador en **ventana de incógnito** (para no arrastrar una sesión de Google ya logueada) y cambiá el idioma de la cuenta de prueba a inglés (myaccount.google.com → Datos y privacidad → Idioma) o el idioma del navegador — así el selector de `accounts.google.com` va a aparecer en inglés directamente, sin tener que cambiarlo a mano en cámara.
- Seguí el guion paso a paso que ya está armado (archivo `guion-video-oauth.md`) tal cual, sin saltear ningún paso.

## 9. Publicar el video

1. Andá a **youtube.com** → ícono de cámara arriba a la derecha → **"Subir video"**.
2. Al subir, en la configuración de privacidad elegí **"Oculto"** (Unlisted) — no "Público" ni "Privado". Oculto significa que solo quien tenga el link lo puede ver, no aparece en búsquedas ni en tu canal.
3. Copiá el link que te da YouTube — eso es lo que va en el formulario de verificación.

## 10. Chequear que no haya geobloqueo

Los revisores de Google entran desde IPs de Estados Unidos. Formas simples de chequear:
- Usar una VPN con salida en EE.UU. y abrir `metricsfield.com` y `app.metricsfield.com/privacidad` — tienen que cargar normal, sin bloqueo ni captcha raro.
- O una herramienta gratis tipo **site24x7.com/check-website-availability.html**, que prueba la carga del sitio desde varios países a la vez.
- Si nadie configuró nunca un firewall/WAF con reglas de país (lo más probable si es un deploy simple sin capas extra), no hay nada para hacer acá — solo confirmar con quien administra el hosting de `metricsfield.com` que no hay nada de eso activado.

## 11. Mandar la verificación

1. Pantalla de consentimiento OAuth → botón **"Publish app"** (si todavía está en modo "Testing") y después **"Submit for verification"** / "Preparar para verificación".
2. Te va a pedir justificar por qué necesitan el scope `business.manage`. Texto sugerido para pegar ahí:

   > MetricsField is a reputation management platform for local businesses. Each business connects its own Google Business Profile account (never ours) to let the business view its own performance metrics — profile views, phone calls, and direction requests — inside its private dashboard on our platform. We do not publish or modify any content on the business listing. Access is fully optional and controlled by the business owner, who can revoke it at any time.

3. Pegá el link del video de YouTube donde lo pida.
4. Enviar.

---

Después de mandarlo, Google suele tardar unos días (a veces más) en responder — puede llegar un mail pidiendo aclaraciones antes del OK final, es normal, no significa rechazo.

---

# Guion — video de verificación OAuth (scope business.manage)

Actualizado con lo que confirmó Gemini — coincide con casi todo lo que ya
teníamos, y agrega 3 cosas nuevas marcadas como **NUEVO** más abajo.

## Checklist previo — no saltear ninguno

**Landing pública (metricsfield.com)**
- [ ] Registrar `https://metricsfield.com` (no `app.metricsfield.com`) como Application home page.
- [ ] Confirmar que describe claramente qué hace MetricsField.
- [ ] Confirmar que el nombre "MetricsField" y el logo coinciden EXACTO con lo cargado en la Cloud Console.
- [ ] Link visible a `https://app.metricsfield.com/privacidad`.

**Google Cloud Console / Search Console**
- [ ] **NUEVO — Search Console:** la cuenta de Google de la Cloud Console tiene que figurar como Propietario Verificado de `metricsfield.com` en Search Console. Si nadie verificó ese dominio todavía, hay que hacerlo antes de cargar la home page en el formulario — es un paso aparte, con su propio tiempo de propagación DNS.
- [ ] **NUEVO — Authorized domains:** agregar `metricsfield.com` a la lista de dominios autorizados del proyecto en Cloud Console (además de `app.metricsfield.com`, que ya debería estar por los redirect URIs).
- [ ] Pantalla de consentimiento OAuth cargada así — ya coincide con el código, no hay que cambiar nada:
  - Nombre de la app: `MetricsField`
  - Application home page: `https://metricsfield.com`
  - Application privacy policy link: `https://app.metricsfield.com/privacidad`
  - Redirect URIs: `https://app.metricsfield.com/api/portal/google/oauth/callback` y `https://app.metricsfield.com/api/admin/oauth/callback`
  - Scopes: `business.manage` (sensible, el que necesita el video) + `openid email profile` (no sensibles, login del equipo)

**Entorno de prueba**
- [ ] Agregar el email de la cuenta que va a grabar como Test User en Cloud Console (mientras la app esté en modo Testing, cualquier cuenta no agregada ve "acceso bloqueado").
- [ ] **NUEVO — datos reales:** esa cuenta de prueba tiene que tener acceso a una ficha de Google Business Profile REAL (o de prueba) con datos de verdad — visitas, llamadas, clics. No alcanza con conectar una cuenta vacía: en el paso 6 del guion hay que MOSTRAR números, no una pantalla en cero. Definir con Luis qué comercio de prueba usar (¿la ficha de un comercio real ya cargado, o armar una?).

**Grabación**
- [ ] Selector de idioma de `accounts.google.com` (abajo a la izquierda) en "English" al momento de grabar.
- [ ] Nombre y logo de la app en la pantalla de consentimiento, EXACTOS a lo cargado en Cloud Console.
- [ ] Una sola toma continua, sin cortes ni edición que oculte pasos.
- [ ] **NUEVO — publicación:** subir el video a YouTube como "Unlisted"/Oculto, o a Google Drive con acceso de lectura público. El link va en el formulario de verificación.

**Servidor — riesgo fácil de pasar por alto**
- [ ] **NUEVO — sin geobloqueo:** confirmar que no haya ninguna regla de WAF/firewall/CDN bloqueando o restringiendo por país en `metricsfield.com` ni en `app.metricsfield.com/privacidad` — los revisores de Google entran desde IPs de Estados Unidos. Si hay algo tipo Cloudflare delante de la landing con reglas geográficas, revisarlo antes de mandar.

## Guion, paso a paso (sin cambios respecto a la versión anterior — Gemini confirmó la misma estructura)

**1. Punto de partida (5-10s)**
Abrir `https://app.metricsfield.com/portal/[código de un comercio de prueba]`. Aclarar en voz/subtítulo que es el panel privado de ese comercio, accedido con su código propio.

**2. Iniciar la conexión (5s)**
Click en "Conectar tu Google Business Profile" → dispara `GET /api/portal/google/oauth/start`.

**3. Pantalla de consentimiento de Google (10-15s, sin cortar)**
Mostrar completa: URL `accounts.google.com`, nombre de la app, el scope `business.manage`, e idioma en inglés.

**4. Otorgar el permiso (5s)**
Click en "Allow" con la cuenta de prueba.

**5. Volver a la app (10s)**
Redirección a `/portal/[código]?google=conectado`, mostrar el estado "conectado".

**6. Mostrar qué hace la app con el permiso (15-20s) — la parte que más pesa en la revisión**
Panel de rating: visitas al perfil, llamadas, clics en "cómo llegar" — **con datos reales, no en cero** (ver checklist de arriba). Aclarar en voz/subtítulo que esos datos vienen exclusivamente del scope `business.manage` y se muestran solo a ese comercio.

**7. Revocar el acceso (10s)**
Botón de desconexión del portal (`DesconectarGoogleBoton`) o `myaccount.google.com/permissions`.

**Duración total: 60-90 segundos.**

## Lo único que sigo sin poder verificar yo mismo

El repo de `metricsfield.com` no está conectado a esta sesión, así que no puedo confirmar directamente: si el dominio ya está verificado en Search Console, si hay geobloqueo configurado, o si el texto/logo de esa landing ya está listo. Si querés, conectá ese repo (decime el nombre en GitHub) y lo reviso yo mismo en vez de ir por capturas de pantalla.
