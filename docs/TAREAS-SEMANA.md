# Tareas de la semana — MetricsField

Este es el ÚNICO lugar donde viven las tareas. Si no está acá, no existe.
Cada uno tilda lo suyo. No hace falta avisar por mensaje que terminaste algo — se tilda y listo.

Lunes 10 minutos: revisamos esto juntos y definimos la semana.

---

## Hernán

**Listo**
- [x] Migración 010 corrida en Neon
- [x] MONITOR_WEBHOOK_URL cargada en Vercel y probada (llegó el mensaje a Slack)
- [x] NEXT_PUBLIC_BASE_URL confirmada en Vercel → `https://app.metricsfield.com`
- [x] Variables SMTP cargadas en Vercel (info@metricsfield.com)
- [x] Cron con cursor por google_sync_en (PR #69)
- [x] lib/db.ts partido por dominio (PR #70)
- [x] page.tsx del portal desarmado en componentes (PR #71)
- [x] Home page pública para la verificación OAuth (PR #73)

**Pendiente**
- [ ] Avisarle a Simón que NEXT_PUBLIC_BASE_URL está lista (desbloquea la generación de QR)
- [ ] Grabar el video de verificación OAuth siguiendo el guion
- [ ] Enviar la verificación OAuth a Google
- [ ] Enviar la solicitud de acceso a las Business Profile APIs (no depende del video, se puede mandar ya)
- [ ] Mandar 5 WhatsApps de prueba y medir cuántos contestan
- [ ] Mandar la propuesta RADAR a 3 cadenas
- [ ] Tocar 15 puertas por día en Nueva Córdoba y Güemes (martes a jueves, 10:30-12:30)

---

## David

**Esta semana: familiarizarse con el código y los procesos. Todavía no escribir tests.**

- [ ] Levantar el entorno local siguiendo el documento de onboarding
- [ ] Recorrer el mapa del repo en `docs/ONBOARDING.html` y anotar preguntas
- [ ] Tocar el cartel de prueba con el celular y ver el tap en el portal
- [ ] Hacer un primer PR mínimo para recorrer el circuito completo
- [ ] Probar a mano, de punta a punta, el panel de admin y el portal del cliente
- [ ] Leer `docs/REGLAS-INTEGRIDAD-TAPS-RESENAS.html` y aportar su mirada técnica junto con Luis
- [ ] Mandar su cronograma de disponibilidad
- [ ] Anotar todo lo que resultó confuso del onboarding

**Verificación OAuth — los pasos técnicos**
- [ ] Verificar `metricsfield.com` en Search Console (tipo "Dominio", no "Prefijo de URL") — arrancar ya, el DNS tarda en propagar
- [ ] Agregar `metricsfield.com` a Authorized domains en Cloud Console
- [ ] Confirmar los 2 redirect URIs cargados exactos
- [ ] Chequear que no haya geobloqueo por país en `metricsfield.com` ni en `/privacidad`

---

## Luis

**Bloqueante de otros — hacer primero**
- [ ] Conseguir un comercio de prueba con Google Business Profile YA conectado y con datos reales (visitas, llamadas, clics). Sin esto no se puede grabar el video de verificación.
- [ ] QA visual del portal en escritorio y celular — se refactorizó el portal esta semana (PR #71), nadie lo miró en un navegador real todavía

**Resto**
- [ ] Cargar 30 paneles de demo de prospectos con su Place ID y 2 competidores
- [ ] Escribir el checklist de alta de cliente junto a Hernán (hay un borrador en `docs/VENTAS-PITCH-DEMO-PRICING.html`)
- [ ] Probar ese checklist dando de alta un comercio de prueba
- [ ] Bajar el contenido del sitio Impulso y contestar las 4 preguntas del brief
- [ ] QA visual del panel de admin
- [ ] Escribir el checklist de qué revisar antes de una demo
- [ ] Escribir el proceso de soporte al cliente

---

## Simón

- [ ] Encargar el lote de hardware pidiendo fecha por escrito y plan B
- [ ] Generar el lote en el panel y descargar el ZIP de QR (ya desbloqueado: la URL de producción está confirmada)
- [ ] Verificar 3 QR con el celular antes de mandarlos a la imprenta
- [ ] Crear los 3 links de pago en Mercado Pago y pasárselos a Hernán
- [ ] Escribir el instructivo que va junto al cartel
- [ ] Escribir el protocolo de instalación en el local
- [ ] Cotizar el segundo lote y el tiempo real de reposición

---

## Documentos de referencia

Están en el repo, en la carpeta `docs/`:

| Documento | Para qué |
| --- | --- |
| `ONBOARDING.html` | Todo el contexto técnico del proyecto (para David) |
| `VENTAS-PITCH-DEMO-PRICING.html` | Pitch, guion de demo, alta de cliente, pricing |
| `REGLAS-INTEGRIDAD-TAPS-RESENAS.html` | Reglas de negocio sobre taps y menciones |
| `PLAN-SEMANA.html` | Plan original de la semana |
| `EVALUACION-MIGRACION-NODE.html` | Evaluación de migrar de Next a Node (no urgente) |

El checklist completo de la verificación OAuth está en el Canvas del canal.
