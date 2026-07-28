# Propuesta de Alianza Estratégica B2B

**Para:** Dirección General y Socios de la Agencia de Marketing
**De:** Dirección de Soluciones Tecnológicas y Reputación Local
**Asunto:** Programa de Blindaje de Clientes, Incremento de ROI Orgánico y Nuevas Líneas de Ingreso Recurrente

> Versión maquetada de este documento: `propuesta-agencia-marketing.html`
> (se genera con `build-propuesta.py`).

---

## 1. El arma de retención para agencias de alto nivel

En el mercado del marketing de servicios premium de Córdoba, la retención de cuentas de alta gama
(Once11, Cartof, Oliva) no se basa en "likes" ni en reportes estéticos de marca: se sostiene sobre
la capacidad de demostrar un impacto financiero predecible y orgánico.

El ecosistema de descubrimiento local está sufriendo una fragmentación histórica:

| Fenómeno | Dato | Implicancia |
|---|---|---|
| **La revolución de las recomendaciones por IA** | El uso de herramientas de IA para recomendación de locales de élite creció del 6% al 45% en doce meses | Estos buscadores conversacionales extraen sus recomendaciones de la autoridad de la ficha de Google Maps y de la consistencia semántica de las valoraciones |
| **La tiranía de la recencia** | El 74% de los consumidores cordobeses de alto poder adquisitivo ignora reseñas de más de 3 meses; un 32% exige que sean de las últimas dos semanas | El stock histórico de reseñas deja de servir: lo que pesa es el flujo |
| **El umbral de la confianza premium** | El 31% de los consumidores locales se niega a pisar un comercio con promedio inferior a 4,5★ (contra 17% el año pasado) | La media de estrellas pasó de ser un adorno a ser un filtro de entrada |

Al integrar nuestro ecosistema de hardware de proximidad NFC/QR y software de auditoría
centralizada como módulo exclusivo de sus estrategias de marca, la agencia no solo automatiza la
recopilación de prueba social: **asume el control de la satisfacción del cliente final**.

---

## 2. Arquitectura del sistema físico-digital

Tres formatos de dispositivos de proximidad, diseñados para operar en los puntos de contacto más
discretos y eficaces del salón o comercio, bajo un modelo de **cero fricción técnica**: el usuario
no descarga ninguna aplicación y el acceso se activa en 0,3 segundos.

```
   Expositor de mesa acrílico          Tarjeta de PVC mate
      (Thanks for Visiting)             (Capitanes de salón)
                │                              │
                └──────────────┬───────────────┘
                               │
                   Tap NFC o escaneo QR · 0,3 s
                               │
                   ┌───────────────────────┐
                   │ Portal de calificación │
                   │ ID único del dispositivo│
                   └───────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
           5 estrellas                   1 a 4 estrellas
      Atracción orgánica · SEO         Auditoría · Soporte
```

### 2.1 Expositor acrílico premium "Thanks for Visiting"

Soporte rígido en "L" de acrílico blanco brillante, para mostradores de recepción, barras, o para
acompañar la cuenta en mesa. Texto impreso claro y no invasivo: *"Thanks for visiting / Review us
on Google"*. Tecnología dual: antena NFC de respuesta rápida en la parte superior y código QR
dinámico de alta definición para teléfonos sin chip NFC.

### 2.2 Tarjeta de PVC portátil de bolsillo

Terminación mate oscura y tacto refinado, de dimensiones idénticas a una tarjeta de crédito
premium. Pensada para capitanes de salón, sommeliers, gerentes de tienda y encargados de atención.
Al finalizar una interacción de alta satisfacción, el personal la presenta para un toque físico
instantáneo.

### 2.3 Sistema de tracking por ID único integrado

Cada stand y cada tarjeta del porfolio de la agencia lleva un identificador único **impreso en la
pieza y grabado en el chip** (ej. `Acd1000001999`). Esto permite que la plataforma asocie cada
dispositivo a un empleado específico, y da inicio a la herramienta más poderosa de la oferta: el
panel de business intelligence corporativo.

---

## 3. Implementación quirúrgica por marca y rubro

### Gastronomía de autor y fuegos — Once11 · Cartof · Oliva

**El protocolo.** Al ser restaurantes con servicio meticuloso de salón, el feedback jamás se
solicita de manera forzada. El comensal es abordado al cierre de la experiencia gastronómica: por
el sommelier (en Once11, tras la degustación nikkei) o por el camarero al entregar la cuenta en la
carpeta oficial.

**Control del franquiciado.** Para marcas como Oliva u Once11, el panel analiza la consistencia del
servicio de salón y permite evaluar la evolución temporal de la reputación por empleado y por
sucursal física.

### Experiencias nocturnas y eventos — Adobados · Piso 12

**El protocolo.** El flujo rápido de barra en el after-office y en eventos electrónicos requiere
agilidad operativa. Bartenders y relacionistas públicos portan la tarjeta PVC de bolsillo. Con un
simple toque al teléfono del asistente que está disfrutando del cocktail, capturan la reseña de
forma lúdica y veloz.

### Cafeterías, pastelerías y florerías — Mirlo Cafetería · Colorada Cake · Florería Premium

**El protocolo.** Negocios de alto flujo diurno y ticket promedio más bajo operan por contacto
rápido en el mostrador de cobro. El stand acrílico se ubica junto al POS. Mientras el cliente
espera que le preparen su pedido de especialidad o que le entreguen sus flores, escanea o toca el
acrílico.

### Centros recreativos exclusivos, retail y estilo de vida — El Golf de Las Delicias · Casa Club · Cheap Store

**El protocolo.** En clubes privados y tiendas de diseño el valor del cliente es sumamente elevado.
Se configuran las tarjetas con ID tracking para que instructores de golf, personal de vestuario y
asesores de compras de alta gama midan de forma interna su calidad de atención mediante el volumen
de feedback positivo obtenido.

---

## 4. El software inteligente como escudo reputacional

### 4.1 Filtro inteligente — Smart Feedback Management

El cliente realiza el toque y califica. Si selecciona **5 estrellas**, el portal lo redirige
instantáneamente a la ficha de Google de la marca correspondiente (ej. Cartof, en Av. Gauss 5939)
para publicar la valoración. Si la calificación es de **1 a 4 estrellas** —porque la carne no llegó
al punto correcto o hubo demoras en la cafetería— el sistema abre un portal interno de quejas
privado. La insatisfacción queda contenida en el panel del administrador, brindando una segunda
oportunidad de servicio antes de herir públicamente el SEO orgánico.

> **Nota de cumplimiento (lectura obligatoria para la agencia y sus clientes).**
> Este módulo se implementa manteniendo **el acceso al link público de Google siempre visible y
> disponible para todo cliente, cualquiera sea su calificación**. El portal privado funciona como
> *canal adicional* de resolución ofrecido a quien puntúa bajo, nunca como bloqueo o sustitución del
> canal público. Bloquear u ocultar la redirección pública a los clientes insatisfechos constituye
> *review gating*, práctica expresamente prohibida por las políticas de contenido de Google Business
> Profile. La sanción no recae sobre el proveedor tecnológico sino sobre la ficha del comercio:
> eliminación de reseñas o penalización del perfil. Para una agencia que administra simultáneamente
> las fichas de más de diez marcas premium, el riesgo es de cartera, no de cuenta.

### 4.2 Redirección dinámica e instantánea

Si una marca cambia de dirección de Google o de sucursal, o si la agencia decide promover
temporalmente otra red social (como Instagram en Colorada Cake), no hay necesidad de desechar los
stands. Se reconfigura el enlace en caliente desde el panel centralizado, en un segundo.

### 4.3 SaaS corporativo multilocación y multimarca

Panel maestro para que la agencia monitoree, desde una sola pantalla, la salud digital de todas sus
cuentas (Adobados, Cartof, Mirlo, etc.), descargando automáticamente informes en PDF para enviar a
los clientes como justificación de resultados de marketing. Marca blanca: el panel lleva el logo de
la agencia.

---

## 5. Modelado financiero del LTV y el ROI de la retención

### Ecuaciones

$LTV=\text{Ticket Promedio}\times\text{Frecuencia Anual}\times\text{Vida Media del Cliente}$

$ROI=\frac{\left(\text{Nuevos Clientes Anuales}\times LTV\right)-\text{Inversión NFC}}{\text{Inversión NFC}}\times100$

### Escenario práctico para tres clientes de la cartera (Córdoba, 2026)

| Cuenta | Ticket promedio | Frecuencia anual | Vida del cliente | LTV |
|---|---:|---:|---:|---:|
| Restaurante de alta gama — Cartof · Once11 | $90.000 | 10 visitas | 3 años | **$2.700.000** |
| Cafetería de especialidad — Mirlo · Colorada Cake | $15.000 | 48 visitas | 2 años | **$1.440.000** |
| Cliente VIP corporativo — El Golf de Las Delicias | $150.000 | 12 pagos | 4 años | **$7.200.000** |

$LTV_{\text{Cartof}}=\$90.000\times10\times3=\$2.700.000\text{ ARS}$

$LTV_{\text{Mirlo}}=\$15.000\times48\times2=\$1.440.000\text{ ARS}$

$LTV_{\text{Golf}}=\$150.000\times12\times4=\$7.200.000\text{ ARS}$

### ROI y precio relativo para la agencia y sus cuentas

**Inversión en el Pack Corporativo para un cliente (ej. Cartof): $180.000 ARS** — pago único de por
vida por sucursal. Incluye 15 stands de acrílico en L, 5 tarjetas de PVC premium con ID tracking,
software de filtrado Smart y cuenta maestra SaaS para la agencia.

| Cuenta | LTV | Clientes para amortizar | Valor incremental con 10 clientes | ROI |
|---|---:|---:|---:|---:|
| Cartof · Once11 | $2.700.000 | 0,07 | $27.000.000 | **14.900%** |
| Mirlo · Colorada Cake | $1.440.000 | 0,13 | $14.400.000 | **7.900%** |
| El Golf de Las Delicias | $7.200.000 | 0,03 | $72.000.000 | **39.900%** |

**Impacto de retención para la agencia.** Si la agencia coloca esta solución en Cartof y, gracias a
la mejora del posicionamiento en Google Maps, atrae a 10 nuevos comensales recurrentes en el año,
habrá generado un valor incremental bruto de **$27.000.000 ARS**. Justifica de inmediato su fee de
marketing anual y elimina el riesgo de cancelación del contrato por falta de resultados tangibles.

---

## 6. Estructura Trim & Stack de la alianza (socio estratégico)

| Componente del Partner Stack | Qué contiene y cómo ayuda a la agencia | Valor comercial | Costo de entrega |
|---|---|---:|---:|
| **White-Label SaaS Platform** | Panel maestro unificado con el logo de la agencia. Su equipo técnico controla las métricas de las marcas desde un solo lugar. | $280.000 | $0 · servidor activo |
| **Hardware Premium Dual Pack** | Stands acrílicos y tarjetas de PVC programadas y personalizadas con el logo de las marcas de la cartera. | $150.000 | $12.000 · costo físico |
| **Done-For-You Integration** | Programamos, vinculamos las coordenadas geográficas de Google y configuramos el módulo Smart Feedback. | $90.000 | $3.000 · horas técnicas |
| **Kit de pitch de venta** | Plantillas de presentación en PDF, estadísticas locales y guiones comerciales para que los ejecutivos le vendan la idea a sus marcas. | $60.000 | $0 · activo digital |
| **Playbook operativo de salón** | Protocolos y entrenamientos cortos en formato interactivo para mozos, sommeliers y cajeros. | $35.000 | $0 · activo digital |
| **Valor total del portafolio** | | **$615.000** | **$15.000** |
| **Inversión preferencial de agencia** | Onboarding corporativo del primer grupo de cuentas. | **$195.000** | Margen neto partner **92,3%** |

---

## 7. Garantía de riesgo cero para la agencia

> Garantizamos que si tras instalar el ecosistema NFC/QR en un lote inicial de 5 de sus marcas
> administradas por un período de 90 días consecutivos, las cuentas seleccionadas no experimentan un
> aumento consolidado de al menos un **35% en su volumen semanal de valoraciones positivas
> verificadas** — o si el equipo de operaciones de la agencia no considera que nuestro dashboard de
> ID Tracking facilitó la recolección de datos y redujo la pérdida de clientes — realizaremos un
> **reembolso íntegro e inmediato** de la inversión preferencial realizada. Además de la devolución
> de los fondos, la agencia conserva el hardware personalizado físico instalado y los accesos activos
> a la plataforma SaaS de por vida, como muestra de agradecimiento por su tiempo y su confianza.

La primera condición es objetiva: el 35% se verifica contra la línea de base registrada en los
primeros 7 días de operación de las 5 cuentas del lote, con datos auditables en el propio panel. La
segunda es deliberadamente subjetiva y queda al criterio del equipo de operaciones de la agencia,
sin proceso de reclamo ni evaluación de nuestra parte.

---

## 8. Factores de cierre por capacidad de entrega

**Capacidad logística semanal.** La impresión de tarjetas de PVC con acabado mate, el corte por
láser de soportes acrílicos y el grabado de microchips NTAG215 de respuesta rápida (0,3 s)
requieren equipos técnicos muy especializados. Solo incorporamos **una agencia de marketing aliada
por mes** en la provincia de Córdoba, para garantizar el cumplimiento de entrega física de alta
gama.

**Lote especializado limitado.** El stock actual de chips importados de alta resistencia térmica
para gastronomía premium es limitado. La asignación de hardware se gestiona en estricto orden de
confirmación de contratos: el primer grupo de agencias que formalice la alianza retiene la
exclusividad temporal de despliegue en la plaza comercial más cotizada del noroeste de la capital
cordobesa.

---

## 9. Próximo paso

**Sesión técnica de alianza — 60 minutos, sin cargo y sin compromiso de firma.** Con la Dirección
General y el equipo de cuentas. Salida concreta:

1. Auditoría en vivo del estado reputacional actual de 5 marcas de la cartera
2. Demostración del panel maestro white-label con las cuentas reales de la agencia
3. Definición del lote inicial: marcas, dispositivos por punto de venta y línea de base
4. Cierre del esquema comercial de partner y del calendario de despliegue

---

*Documento confidencial elaborado para la Dirección General de la agencia. Los parámetros
financieros corresponden a valores promedio de la plaza de Córdoba y se recalibran con los datos
reales de cada cuenta durante la sesión técnica.*
