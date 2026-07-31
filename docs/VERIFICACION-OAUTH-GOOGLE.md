# Verificación OAuth de Google — MetricsField

Todo lo necesario para el trámite de verificación de la app OAuth (scopes
sensibles/restringidos) vive acá, para no depender de un chat viejo o un
artefacto que puede vencer. Complementa a `docs/CONTEXTO-Y-PROGRESO.md`
(sección 6, punto 2).

Son **dos trámites separados con Google**:
1. **Verificación del consent screen OAuth** — lo que cubre este documento.
2. **Acceso a las Business Profile APIs** (en particular la Reviews API v4,
   `mybusiness.googleapis.com`, la que necesita `lib/google-reviews.ts` para
   publicar respuestas automáticas) — todavía no se pidió; ver la nota al
   final.

---

## 1 · Scopes que pide la app

Definidos en `lib/google-oauth.ts`:

| Scope | Quién lo autoriza | Para qué |
|---|---|---|
| `https://www.googleapis.com/auth/business.manage` | Cada **cliente**, desde su portal (`/portal/[codigo]`) | Leer su propia ficha de Google Business Profile: rating, reseñas, visitas al perfil, llamadas, clics de "cómo llegar" |
| `openid email profile` | Cada persona del **equipo**, en `/login` | Identificar quién hizo cada acción en `/admin/actividad` — nada de datos de negocio |

`business.manage` es de solo lectura en el uso actual: la app **no** publica
ni modifica nada en la ficha del comercio. Hay código para responder reseñas
automáticamente (`lib/google-reviews.ts`, función que hace POST a
`.../reviews/{review}/reply`), pero está apagado por
`GOOGLE_REVIEWS_API_ENABLED=false` y **no se menciona en este trámite** — ver
la nota al final.

---

## 2 · Textos para pegar en Google Cloud Console

### Nombre de la app
```
MetricsField
```

### Descripción corta (consent screen, 1-2 frases)
```
MetricsField is an online reputation management platform for local businesses in Córdoba, Argentina. It helps businesses track their Google Business Profile performance and reviews in a private dashboard.
```

### Descripción larga (formulario de verificación / pedido de acceso a las Business Profile APIs)
```
MetricsField is a reputation-management platform used by local businesses (restaurants, salons, clinics, gyms, auto shops) in Córdoba, Argentina. Each business places a physical NFC sign in their store that directs customers to leave a public Google review — no intermediate screens, the same link for every customer regardless of rating.

To automate their reporting, a business owner connects their own Google account via OAuth (business.manage scope). MetricsField then reads that business's own Google Business Profile data — star rating, public review count and content, and performance metrics (profile views, phone calls, and "get directions" requests) — and displays it in a private dashboard only that business can access. This replaces manual data entry the business would otherwise do by hand.

Separately, our internal team signs in to our own admin panel using Google (openid, email, profile scopes only) solely to identify which team member performed each action in our audit log — no Business Profile data is involved in that login.

We do not use this data for advertising, do not sell it, and do not share it with third parties. Full detail is in our privacy policy: https://app.metricsfield.com/privacidad
```

### Justificación del scope `business.manage`
```
Used exclusively so a business owner can grant MetricsField read access to their own Google Business Profile: star rating, review count and content, and performance metrics (profile views, calls, direction requests). This lets the business see their results in our dashboard without entering data manually. Access is initiated and authorized directly by the business owner for their own listing only — MetricsField never requests access to a listing on a business's behalf without that business completing the OAuth flow themselves.
```

### Justificación de `openid` / `email` / `profile`
```
Used only for our internal team's login to our own admin panel, to identify which team member performed each action in our internal audit log. Not used for any Business Profile or customer-facing feature.
```

### URLs (ya en vivo, bilingües ES/EN con toggle)
```
Homepage:         https://app.metricsfield.com
Privacy Policy:   https://app.metricsfield.com/privacidad
Terms of Service: https://app.metricsfield.com/terminos
```

---

## 3 · Guion del video de demo

~4 minutos, narrado en inglés (consent screen de Google también en inglés al
grabar — selector abajo a la izquierda de la pantalla de Google). Cliente
demo ya conectado a Google **antes** de arrancar a grabar — se desconecta
recién en el minuto 3:15.

| Min | Pantalla | Voz (leer tal cual) |
|---|---|---|
| 0:00–0:20 | `metricsfield.com`, barra de direcciones visible | "Hi — this is MetricsField, a reputation-management platform for local businesses in Córdoba, Argentina. Businesses place our NFC signs in their stores so customers can leave Google reviews, and they track their results in a private dashboard." |
| 0:20–0:45 | Portal de un cliente demo | "Each business gets a private dashboard like this one. To automate its metrics, the business owner connects their own Google account." |
| 0:45–1:30 | Click "Conectar con Google" → consent screen completo, quieto 5s | "This is the Google OAuth consent screen. Our app, MetricsField, requests the business.manage scope. We use it to read the business's own Business Profile data — profile views, calls, direction requests, and reviews — so the owner doesn't have to enter any of this manually." |
| 1:30–2:00 | Vuelve al portal, badge "Conectado" | "After granting access, the connection is confirmed right on the dashboard." |
| 2:00–2:40 | Tarjetas de métricas del portal | "And this is exactly how the data is used: the dashboard displays the profile's performance and reviews, visible only to the business that owns the profile." |
| 2:40–3:15 | `/login` → "Continuar con Google" → `/admin` | "Separately, our internal team signs in to our admin panel with Google, using only the openid, email and profile scopes — solely to identify who performs each action in our audit log. No other Google data is accessed." |
| 3:15–3:45 | Portal → panel "Mi Negocio en Google" → click **Desconectar** | "Access can be revoked at any time — either from the business's own Google account permissions, or right here, from their own portal. Once disconnected, we stop syncing new data immediately, and on account cancellation, all Google-derived data is deleted from our systems within 30 days." |
| 3:45–4:05 | `metricsfield.com/privacidad` (toggle a English) | "Our privacy policy, published on our own domain, describes this data usage in detail, including our compliance with Google's Limited Use requirements. Thank you." |

**Antes de subir**: consent screen en inglés, 1080p sin cortes durante el
flujo OAuth ni la desconexión, "MetricsField" visible en el consent screen,
subido a YouTube como **No listado** (no privado).

---

## 4 · Checklist de estado

- [x] `/privacidad` y `/terminos` públicas, bilingües (toggle ES/EN, misma URL)
- [x] Botón real de desconexión de Google en el portal del cliente
- [x] Textos de descripción y justificación de scopes redactados (sección 2)
- [x] Guion del video corregido (sección 3)
- [ ] Grabar el video con cliente demo real
- [ ] Subir a YouTube como No listado
- [ ] Completar y enviar el formulario de verificación en Google Cloud Console
- [ ] Trámite aparte: acceso a la Reviews API v4 (necesario recién para
      prender `GOOGLE_REVIEWS_API_ENABLED` — no se pide junto con esto)

---

## Nota: por qué no se menciona la respuesta automática a reseñas

`lib/google-reviews.ts` puede publicar una respuesta a una reseña positiva en
nombre del comercio — es real, está construida, pero apagada
(`GOOGLE_REVIEWS_API_ENABLED=false`) hasta conseguir el acceso a la Reviews
API v4, que Google gestiona aparte de esta verificación de scope. Mencionarla
acá sin que esté prendida en producción generaría preguntas de más sin
necesidad, y no coincidiría con lo que muestra el video (que es 100% lectura).
Cuando se pida ese segundo acceso, ahí corresponde describir esta función
específicamente.
