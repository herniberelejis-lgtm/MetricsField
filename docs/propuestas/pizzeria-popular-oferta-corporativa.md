# Programa Nacional de Dominación de Reputación y Auditoría de Servicio para las Franquicias de Pizzería Popular

### El Sistema Llave en Mano que audita a cada mozo, cajero y repartidor por número de legajo, y duplica el posicionamiento local de cada sucursal en 90 días — sin abonos mensuales, sin reimpresión de hardware y sin fricción operativa

---

**Documento confidencial de propuesta comercial**
**Destinatarios:** Dirección de Operaciones · Dirección de Franquicias · Administración Central
**Emisor:** MetricsField — Sistemas de Auditoría de Servicio y Reputación Local
**Alcance:** Red nacional e internacional Pizzería Popular (120+ sucursales, 6 países)
**Origen común:** Córdoba, Argentina

---

## 1. Resumen ejecutivo para el Comité de Dirección

Pizzería Popular resolvió, con excelencia, el problema más difícil de una cadena gastronómica: **la escala del producto**. 120 sucursales en 6 países, con un producto consistente, es un logro operativo que pocas marcas de la región alcanzaron.

Lo que la escala del producto no resuelve automáticamente es **la escala de la evidencia pública de ese producto**.

Hoy la Dirección de Operaciones enfrenta una asimetría estructural: la calidad de servicio se ejecuta en 120 salones y en miles de puertas de domicilio por semana, pero se audita con herramientas que llegan tarde, agregadas y sin nombre propio — un mystery shopper trimestral, una planilla de reclamos, un promedio de estrellas de Google que se mueve un decimal cada seis meses y no dice **quién** lo movió.

Esta propuesta presenta un sistema que convierte cada uno de esos miles de contactos semanales en **un dato auditable, atribuido a un legajo, consolidado en un panel único de administración central**, y simultáneamente en un activo de posicionamiento local para la sucursal.

Se compone de tres capas:

| Capa | Componente | Función |
|---|---|---|
| **Física** | Expositor acrílico de mesa + Tarjeta PVC de bolsillo | Captura la reseña en el instante de máxima satisfacción |
| **Identidad** | ID único corporativo por dispositivo, vinculado a legajo | Atribuye cada reseña y cada queja a una persona y una sucursal |
| **Inteligencia** | Plataforma SaaS corporativa | Audita, compara, alerta y reencamina — desde la central, sin tocar el hardware |

**Inversión por sucursal:** $180.000 ARS, pago único de por vida, sin costos fijos mensuales.
**Retorno demostrado más adelante en este documento:** un único cliente recurrente captado o retenido devuelve **8 veces** la inversión total del sistema de esa sucursal.

---

## 2. Diagnóstico: el costo oculto de supervisar 120 locales

Antes de presentar la solución, es necesario nombrar con precisión el problema que la Dirección de Franquicias ya conoce, pero que rara vez aparece cuantificado en el tablero de gestión.

### 2.1 Los cuatro puntos ciegos de una red franquiciada

| Punto ciego | Manifestación operativa | Costo real |
|---|---|---|
| **Servicio no atribuible** | La sucursal baja de 4,6 a 4,2 estrellas y nadie puede identificar el turno, el mozo o el repartidor responsable | La corrección es genérica: se capacita a los 15 del local en vez de a los 2 que fallan |
| **Reclamo público como primer aviso** | La central se entera del problema cuando ya está publicado y es indexable | El daño de marca precede a la acción correctiva |
| **Asimetría entre franquiciados** | Una sucursal genera 40 reseñas/mes y otra 3, sin explicación estructural | La marca compite consigo misma en el Map Pack, con calidad percibida desigual |
| **Hardware estático** | Cada cambio de link, promoción o unificación de ficha exige reimprimir y redistribuir piezas a 120 locales | Costo logístico recurrente + semanas de desfasaje entre sucursales |

### 2.2 El eslabón perdido: el momento post-satisfacción

La industria intentó resolver esto con encuestas por correo electrónico, SMS de seguimiento y encuestas impresas en el ticket. Todas comparten la misma falla de diseño:

> **Piden la opinión cuando la emoción ya se disipó.**

Una encuesta que llega 24 o 48 horas después de la comida compite con la bandeja de entrada, con la agenda del cliente y con el olvido. La tasa de respuesta se desploma, y — peor aún para la Dirección de Operaciones — **los que sí responden son mayoritariamente los insatisfechos**, porque la insatisfacción tiene una vida media emocional mucho más larga que la satisfacción.

El resultado es un sesgo estructural: la red mide su servicio con una muestra contaminada hacia lo negativo.

Nuestro sistema opera en el punto exacto donde ese sesgo no existe: **el instante de la máxima satisfacción física**, cuando el cliente todavía tiene el sabor de la pizza napolitana presente y la gratitud activa.

---

## 3. Arquitectura del hardware dual y su protocolo operativo

El sistema no es "un cartel con un QR". Es un **protocolo de dos dispositivos** diseñado para cubrir los dos canales de venta de Pizzería Popular — salón y delivery — cada uno con su propio momento de captura.

### 3.1 Expositor de Mesa Acrílico Premium "Thanks for Visiting"

**Formato:** Pieza de acrílico premium, exhibición vertical de mesa, con antena NFC integrada y QR dinámico impreso.
**Ubicación:** Visible de forma permanente en el salón, sobre la mesa.
**Canal que cubre:** Consumo en salón.

**Protocolo de uso — punto crítico de la metodología:**

El expositor **no se activa mientras el cliente espera la comida**. Ese es el momento de mayor ansiedad de toda la experiencia gastronómica: el comensal tiene hambre, evalúa la demora y su disposición emocional es neutra o negativa. Solicitar una valoración en esa ventana es un error de diseño que destruye la calidad del dato y, encima, incomoda al cliente.

El dispositivo se activa **al cierre de la experiencia**: el comensal terminó su pizza, está 100% satisfecho, y el mozo se acerca con la cuenta. En ese instante — y solo en ese — el mozo invita al cliente a apoyar el celular sobre el expositor.

| Etapa de la experiencia | Estado emocional del cliente | ¿Se activa el dispositivo? |
|---|---|---|
| Ingreso y toma del pedido | Expectativa | No |
| Espera de la comida | **Ansiedad / evaluación de demora** | **Nunca** |
| Consumo | Disfrute — cliente ocupado | No |
| **Cierre + entrega de la cuenta** | **Satisfacción plena y gratitud** | **Sí — ventana de captura** |

**Ejecución del cliente final:** un `NFC Tap` o un escaneo de QR dinámico. **Menos de un segundo.** Sin descargar nada, sin tipear nada, sin crear cuenta.

### 3.2 Tarjeta de PVC Portátil de Bolsillo

**Formato:** Tarjeta de PVC mate de alta durabilidad, formato billetera, resistente a manipulación intensiva, humedad y temperatura.
**Portador:** Cada repartidor de delivery y cada mozo del salón la lleva encima, en el bolsillo del uniforme.
**Canal que cubre:** Delivery a domicilio + cobro en mesa.

Este es el componente que **resuelve el punto ciego más grande de toda cadena de pizzas: el delivery**. En el canal de reparto no existe salón, no existe mesa, no existe cartel — y por lo tanto, hasta hoy, no existía captura de reseña en el momento.

**Protocolo de uso:**

- **Delivery:** el repartidor entrega la caja en la puerta del domicilio. El cliente recibe su producto caliente, en tiempo, y expresa su agradecimiento. En ese preciso instante, el repartidor extiende la tarjeta y ofrece el tap.
- **Salón:** el mozo cobra en mesa. Al momento de devolver el vuelto o el comprobante, ofrece el tap sobre su tarjeta personal.

**El valor estratégico:** la tarjeta es **personal e intransferible**, ligada al legajo de quien la porta. Cuando un cliente hace tap sobre la tarjeta del repartidor N.º 42, la reseña resultante queda atribuida al repartidor N.º 42. No al local. No al turno. **A la persona.**

### 3.3 Mecanismo de Tracking por ID Único Corporativo

Cada pieza física del sistema — cada expositor de mesa y cada tarjeta de PVC — sale de fábrica con un **código de identificación único impreso** en su superficie, con formato corporativo:

```
Acd1000001999
```

Ese identificador no es un número de inventario. Es la **llave primaria de todo el sistema de auditoría**.

**Cadena de vinculación:**

```
ID físico impreso (Acd1000001999)
        ↓
Registro en plataforma administrativa MetricsField
        ↓
Legajo / ID de empleado en el sistema de Pizzería Popular
        ↓
Sucursal + Franquiciado + País
        ↓
Cada tap, cada reseña y cada queja quedan atribuidos nominalmente
```

**Qué habilita esta cadena, en términos concretos para la Dirección de Operaciones:**

| Pregunta de gestión | Antes | Con ID Único Corporativo |
|---|---|---|
| ¿Quién genera las mejores experiencias? | Percepción del encargado | Ranking nominal, por legajo, medible |
| ¿Dónde se origina esta queja? | Investigación manual | Legajo, sucursal, fecha y hora exacta |
| ¿El staff está usando el sistema? | Imposible de verificar | Alerta automática de ID inactivo |
| ¿A quién bonifico este mes? | Criterio subjetivo del franquiciado | Dato duro, auditable y comparable entre países |

---

## 4. El gran valor de venta: el Dashboard Administrativo Corporativo

El hardware es el sensor. **El software es el activo.**

Este es el componente que transforma la propuesta de "una acción de marketing local" a "**un sistema de control de gestión para una red franquiciada de 120 unidades**". Todo lo que sigue está diseñado específicamente para el dolor de supervisar a distancia lo que no se puede visitar todos los días.

### 4.1 Auditoría de Rendimiento por Empleado

**El módulo que convierte la calidad de atención en una métrica de RR.HH.**

El panel entrega a Administración Central y a Recursos Humanos una visión nominal y comparable del desempeño real de cada persona en contacto con el cliente:

- **Ranking de generación de 5 estrellas por legajo**, filtrable por sucursal, país, turno y período.
- **Acumulación de quejas internas por legajo**, con detección de patrones (reincidencia, concentración horaria, concentración por tipo de reclamo).
- **Tasa de conversión personal:** cuántas invitaciones al tap terminan efectivamente en reseña. Un mozo con muchos taps y pocas reseñas revela un problema de guion; un mozo sin taps revela un problema de adopción.
- **Comparativa entre pares:** el repartidor N.º 42 de Nueva Córdoba contra la media de repartidores de su sucursal, de su ciudad y de la red completa.

**Aplicación directa — gamificación del trabajo operativo:**

Esta es la palanca que Pizzería Popular puede activar desde el día uno. La calidad de atención deja de ser una consigna abstracta en un manual de franquicia y pasa a ser un **marcador visible, competitivo y remunerado**:

| Mecanismo | Implementación | Efecto sobre el negocio |
|---|---|---|
| Bono mensual por desempeño | Top 3 de mozos y repartidores por reseñas 5★ generadas | El staff se convierte en el motor del posicionamiento |
| Ranking inter-sucursal | Tabla pública entre franquicias del mismo país | Competencia sana entre franquiciados |
| Escalafón de carrera | Historial de calificaciones como insumo de promoción | Retención del talento con mejor trato al cliente |
| Detección temprana | Alerta por acumulación de quejas en un legajo | Capacitación quirúrgica en vez de genérica |

> **Lectura estratégica:** el sistema no solo mide al empleado. **Le da al empleado una razón económica para atender mejor.** Ese es el cambio de comportamiento que ninguna capacitación trimestral logra sostener.

### 4.2 Evolución y Tendencias de Reseñas por Sucursal

**El módulo que le da a la Dirección de Franquicias un tablero de red.**

- **Curva histórica de acumulación** de valoraciones por sucursal, con granularidad diaria, semanal y mensual.
- **Velocidad de acumulación** (reseñas nuevas por semana) — el indicador adelantado más confiable de posicionamiento local, muy por encima del promedio de estrellas, que es un indicador retrasado y de alta inercia.
- **Comparativa multi-sucursal en un mismo gráfico:** Nueva Córdoba vs. Cerro de las Rosas vs. sucursales de España, normalizada por volumen de tickets para que la comparación sea justa entre locales de distinto tamaño.
- **Detección de estancamiento:** una sucursal cuya velocidad de acumulación cae dos semanas seguidas dispara alerta antes de que el promedio de estrellas se mueva.
- **Benchmark de red:** cada franquiciado ve su posición contra la media de la red — el dato más persuasivo que existe para movilizar a un franquiciado rezagado.

**Ejemplo de lectura de tablero:**

| Sucursal | Reseñas/semana | Δ vs. mes anterior | Calificación | Adopción de staff | Estado |
|---|---|---|---|---|---|
| Nueva Córdoba | 38 | +22% | 4,8 | 94% | Referente de red |
| Cerro de las Rosas | 31 | +15% | 4,7 | 88% | Sólido |
| Madrid Centro | 12 | −8% | 4,4 | 41% | **Auditoría requerida** |
| Sucursal X | 3 | −40% | 4,1 | 9% | **Intervención inmediata** |

En una red de 120 unidades, este tablero responde en diez segundos la pregunta que hoy demanda semanas de relevamiento: **¿en qué tres sucursales tengo que meterme esta semana?**

### 4.3 Smart Feedback Management — Protección de Marca en Red Franquiciada

**El módulo de contención de daño reputacional.**

El sistema califica antes de publicar, y bifurca el flujo según el resultado:

- **5 estrellas →** el cliente es dirigido a la ficha de Google de **esa sucursal específica**, para consolidar la reseña pública donde impacta en el posicionamiento local.
- **1 a 4 estrellas →** el sistema abre un **formulario privado de resolución de conflictos**. El cliente describe qué falló: la pizza llegó fría, el mozo tardó en atender, el pedido de delivery llegó incompleto, la mesa no estaba limpia.

**Y acá está el valor corporativo real:** esa queja no queda en la sucursal. **Llega instantáneamente a la Administración Central de Pizzería Popular**, con:

- Legajo del empleado involucrado (vía ID del dispositivo)
- Sucursal y franquiciado
- Fecha, hora y canal (salón o delivery)
- Texto literal del cliente
- Datos de contacto para la recuperación del cliente

| Beneficio | Impacto en la red |
|---|---|
| **Auditoría interna del franquiciado** | La central evalúa el desempeño operativo real de cada franquicia con evidencia documental, no con reportes autoinformados |
| **Ventana de recuperación** | Se contacta al cliente insatisfecho y se resuelve antes de que la insatisfacción escale |
| **Protección de marca** | El problema se detecta y corrige internamente, antes de que dañe públicamente a la marca en toda la red |
| **Trazabilidad de patrones** | Si tres sucursales reportan "pizza fría en delivery", el problema es de proceso logístico, no de personas |

> **Nota de cumplimiento (lectura obligatoria para Legales de Pizzería Popular).** Este módulo debe implementarse manteniendo **el acceso al link público de Google siempre visible y disponible para todo cliente, cualquiera sea su calificación**. La bifurcación funciona como *oferta adicional* de un canal privado de resolución, nunca como sustitución u ocultamiento del canal público. Ocultar el acceso público a los clientes insatisfechos constituye *review gating*, práctica expresamente prohibida por las políticas de contenido de Google Business Profile, con riesgo de eliminación de reseñas o penalización de la ficha. MetricsField configura el módulo bajo este criterio por defecto en toda la red. Este punto se documenta formalmente en el anexo técnico del contrato.

### 4.4 Redirección Flexible sin Costo de Impresión

**El módulo que elimina el costo logístico recurrente de una red de 120 locales.**

Todo dispositivo — expositor o tarjeta — apunta a un destino **dinámico**, controlado desde la central. El ID impreso es permanente; el destino al que resuelve, no.

Desde el panel de Administración Central, y sobre cualquier dispositivo de cualquier sucursal de cualquier país:

| Escenario operativo | Solución tradicional | Con Redirección Flexible |
|---|---|---|
| La sucursal cambia de ficha de Google | Reimprimir y redistribuir todas las piezas del local | Un clic. Efecto inmediato. |
| Rotación de personal (alta de mozo nuevo) | Emitir e imprimir tarjeta nueva | Reasignar el ID al nuevo legajo desde el panel |
| Campaña nacional temporal | Imprimir piezas de campaña para 120 locales | Reencaminar 3.000 dispositivos en una operación |
| Apertura de sucursal / cambio de franquiciado | Todo el hardware queda obsoleto | El hardware se reasigna íntegro |
| Prueba A/B de destino | Inviable | Se testea por sucursal y se despliega el ganador |

**Costo de cada uno de estos cambios: $0.** Sin reimprimir. Sin logística. Sin desfasaje entre sucursales.

En una red de 120 locales, este único módulo elimina de forma permanente una línea de gasto recurrente y una carga operativa completa del área de Marketing y Operaciones.

---

## 5. Deconstrucción de valor — La Ecuación de Alex Hormozi aplicada a Pizzería Popular

El valor de una oferta no es una opinión: es el resultado de una ecuación de cuatro variables. Dos se maximizan, dos se minimizan.

$$\text{Valor}=\frac{\text{Resultado Soñado}\times\text{Probabilidad Percibida de Logro}}{\text{Retraso Temporal}\times\text{Esfuerzo y Sacrificio}}$$

### 5.1 Numerador — lo que se maximiza

#### Variable 1 · Resultado Soñado

No se vende "más reseñas". Se vende el estado final que la Dirección de Operaciones quiere alcanzar:

- **Dominación absoluta del Map Pack de Google en cada sucursal del país.** Los tres resultados del bloque de mapas concentran la abrumadora mayoría de los clics de búsqueda local. Cuando alguien busca "pizza cerca mío" en cualquier barrio donde Pizzería Popular tiene presencia, la sucursal correspondiente ocupa ese bloque.
- **Presencia consolidada en respuestas de IA generativa.** Los motores conversacionales que hoy responden "¿dónde como buena pizza en Córdoba?" se alimentan de volumen, frescura y consistencia de reseñas locales. La marca que acumula evidencia estructurada de forma sostenida es la que esos sistemas citan.
- **Captura predecible del tráfico local de búsquedas.** El flujo de clientes nuevos deja de depender del azar y pasa a ser una variable gestionable, con un input controlable (taps ejecutados por el staff) y un output medible (reseñas nuevas por semana).
- **Control administrativo total y estandarización del servicio en toda la red franquiciada.** El objetivo final no es reputacional: es de gobierno corporativo. Que el estándar de atención de Pizzería Popular sea idéntico y verificable en Nueva Córdoba, en Cerro de las Rosas y en Madrid.

#### Variable 2 · Probabilidad Percibida de Logro

**Certeza operativa del 100%**, sustentada en la simplicidad física de la tecnología.

El sistema no depende de que el cliente se acuerde, se registre, descargue o busque. Depende de **un solo gesto físico: apoyar el teléfono**. Es el mismo gesto con el que ya paga el café todos los días — no hay curva de aprendizaje que superar.

| Factor de certeza | Fundamento |
|---|---|
| Gesto universal | El tap NFC ya es un hábito instalado por el pago contactless |
| Sin dependencia de memoria | La acción ocurre en el local o en la puerta, no días después |
| Sin dependencia de conectividad compleja | Funciona con el celular estándar de cualquier comensal |
| Doble vía de acceso | NFC para dispositivos compatibles, QR dinámico como respaldo universal |
| Invitación formal presencial | **El 83% de los clientes formalmente invitados al finalizar la experiencia deja la reseña de inmediato** |

Ese último punto es el corazón del sistema: la diferencia entre un cartel pasivo y una **invitación formal en el momento de máxima satisfacción** es la diferencia entre una tasa de conversión marginal y una tasa de conversión dominante.

### 5.2 Denominador — lo que se minimiza

#### Variable 3 · Retraso Temporal

**Velocidad de recolección: 0,3 segundos.**

| Método | Latencia entre experiencia y reseña | Resultado |
|---|---|---|
| Email de seguimiento | 24–72 horas | Bandeja saturada, apertura marginal |
| SMS post-visita | 4–24 horas | Percibido como spam |
| Encuesta impresa en ticket | Indeterminada | El ticket se descarta |
| **NFC Tap MetricsField** | **0,3 segundos** | **Consolidación instantánea** |

La reseña se consolida **en el momento exacto de la entrega y de la máxima satisfacción** — con la pizza todavía presente en la mesa o en la mano del cliente en la puerta de su casa. No días después, mediante correos de seguimiento que nadie abre.

Esto tiene una consecuencia adicional sobre la calidad del dato: la reseña capturada en el pico emocional es **más extensa, más específica y más elogiosa** que la capturada en frío. Y las reseñas extensas y específicas son, justamente, las que más peso tienen en el posicionamiento local.

#### Variable 4 · Esfuerzo y Sacrificio

**Para el cliente final — cero:**

- Sin descargar aplicaciones
- Sin crear cuentas ni registrarse
- Sin buscar el local en Google
- Sin tipear el nombre de la sucursal
- Sin recordar nada después

**Para la Administración Central de Pizzería Popular — cero fricción de supervisión:**

- La auditoría es **completamente automatizada**: los datos llegan solos al panel corporativo
- Sin planillas manuales, sin consolidación entre países, sin pedir reportes a 120 franquiciados
- Sin visitas de control adicionales para relevar calidad de atención
- Sin personal dedicado a monitoreo reputacional
- Reportes de evolución generados y distribuidos automáticamente

**Para el staff de la sucursal:**

- Sin capacitación técnica: el protocolo se explica en menos de dos minutos
- Sin tareas administrativas nuevas: el gesto se integra a la entrega de la cuenta o del pedido, que ya se hace
- Con incentivo económico directo: el sistema le paga al empleado por hacerlo bien

### 5.3 Resultado de la ecuación

| Variable | Dirección | Estado en este sistema |
|---|---|---|
| Resultado Soñado | ↑ Maximizado | Dominación del Map Pack + control corporativo total de la red |
| Probabilidad Percibida | ↑ Maximizada | Certeza del 100% — gesto físico de un segundo, 83% de conversión |
| Retraso Temporal | ↓ Minimizado | 0,3 segundos |
| Esfuerzo y Sacrificio | ↓ Minimizado | Cero para el cliente, cero fricción para la administración |

Con el numerador maximizado y el denominador tendiendo a cero, **el valor percibido de la oferta tiende a infinito**. Ese es el objetivo de diseño de una Grand Slam Offer, y es el fundamento sobre el cual se apoya la estructura financiera que sigue.

---

## 6. Estructura financiera y Valor de Vida del Cliente (LTV) — Modelo Plaza Córdoba

Toda la argumentación anterior es cualitativa. Esta sección la traduce a números, con las fórmulas explícitas y los datos promedio verificables de la plaza de Córdoba.

### 6.1 Fórmulas del modelo

**Valor del Tiempo de Vida del Cliente:**

$LTV=\text{Ticket Promedio}\times\text{Frecuencia Anual de Compra}\times\text{Vida Media del Cliente}$

**Retorno de Inversión del Sistema:**

$ROI=\frac{\left(\text{Nuevos Clientes Anuales}\times LTV\right)-\text{Inversión NFC}}{\text{Inversión NFC}}\times100$

### 6.2 Parámetros de entrada — sucursal promedio Pizzería Popular, plaza Córdoba

| Parámetro | Valor | Definición |
|---|---|---|
| Ticket promedio | **$40.000 ARS** | Mesa familiar de 4 personas en salón, o combo de delivery familiar completo |
| Frecuencia anual de compra | **12** | Cliente fiel — una compra por mes |
| Vida media del cliente | **3 años** | Permanencia antes de migrar a otra marca |
| Inversión del sistema | **$180.000 ARS** | Pack Corporativo Premium por sucursal — pago único de por vida |

### 6.3 Cálculo del LTV de un cliente fiel

$LTV=\$40.000\times12\times3=\$1.440.000\text{ ARS}$

**Un solo cliente fiel de Pizzería Popular vale $1.440.000 ARS a lo largo de su vida como cliente.**

Este es el número que reencuadra toda la conversación de precio. La discusión no es "cuánto cuesta el sistema". La discusión es **cuánto vale cada cliente que hoy se está perdiendo por no aparecer en el Map Pack**, o que se está yendo por una mala experiencia que nunca llegó a la central.

### 6.4 Cálculo del ROI — el escenario de un solo cliente

Modelamos el escenario más conservador imaginable: que el sistema, en todo un año, con 20 expositores y 5 tarjetas operando en la sucursal, capte o retenga **un único cliente recurrente**.

$ROI=\frac{\left(1\times\$1.440.000\right)-\$180.000}{\$180.000}\times100$

$ROI=\frac{\$1.440.000-\$180.000}{\$180.000}\times100=\frac{\$1.260.000}{\$180.000}\times100$

$ROI=700\%$

### 6.5 Demostración: el precio relativo del sistema es prácticamente cero

| Métrica de contraste | Cálculo | Resultado |
|---|---|---|
| **Retorno sobre inversión con 1 solo cliente** | $1.260.000 / $180.000 | **700%** |
| **Múltiplo de la inversión que devuelve 1 cliente** | $1.440.000 / $180.000 | **8 veces la inversión total** |
| **Punto de equilibrio en clientes** | $180.000 / $1.440.000 | **0,125 clientes** (un octavo de un cliente) |
| **Punto de equilibrio en tickets** | $180.000 / $40.000 | **4,5 mesas familiares en 3 años** |
| **Costo mensual amortizado (36 meses)** | $180.000 / 36 | **$5.000 ARS/mes** |
| **Costo diario amortizado** | $180.000 / 1.095 días | **$164 ARS/día** |
| **Costo por dispositivo instalado** | $180.000 / 25 piezas | **$7.200 ARS por pieza, una sola vez** |
| **Inversión como % del LTV de 1 cliente** | $180.000 / $1.440.000 | **12,5%** |

**La demostración solicitada, en una línea:**

> Retener o captar **un solo cliente recurrente** gracias al nuevo posicionamiento local devuelve **$1.440.000 ARS** contra una inversión total de **$180.000 ARS** — es decir, **8 veces la inversión total del sistema de esa sucursal: 2,6 veces por encima del triple**. El sistema completo se paga con **4,5 mesas familiares repartidas a lo largo de tres años**, o con **$164 ARS por día** — menos que el costo de una sola porción de muzzarella.

Cuando el retorno de una sola unidad de resultado equivale a ocho veces el costo total del sistema, **el precio deja de ser una variable de decisión**. La única variable relevante pasa a ser el costo de oportunidad de no implementarlo.

### 6.6 Escenarios de captación — proyección anual por sucursal

Los escenarios anteriores son deliberadamente pesimistas. La proyección realista para una sucursal con 20 expositores y 5 tarjetas activas:

| Escenario | Clientes nuevos recurrentes/año | Valor incorporado (LTV) | ROI |
|---|---|---|---|
| **Umbral mínimo** | 1 | $1.440.000 | **700%** |
| **Conservador** | 5 | $7.200.000 | **3.900%** |
| **Base** | 15 | $21.600.000 | **11.900%** |
| **Objetivo** | 30 | $43.200.000 | **23.900%** |

*Cálculo del escenario Base:* $ROI=\frac{\left(15\times\$1.440.000\right)-\$180.000}{\$180.000}\times100=\frac{\$21.420.000}{\$180.000}\times100=11.900\%$

### 6.7 Proyección de red — 120 sucursales

| Concepto | Cálculo | Total |
|---|---|---|
| Inversión total de la red | 120 × $180.000 | **$21.600.000 ARS, pago único** |
| Clientes nuevos (escenario conservador) | 120 × 5 | 600 clientes recurrentes |
| Valor de vida incorporado a la red | 600 × $1.440.000 | **$864.000.000 ARS** |
| **Retorno de red** | ($864.000.000 − $21.600.000) / $21.600.000 | **3.900%** |

Para dimensionarlo en términos de tesorería: la inversión de la **red nacional e internacional completa** — 120 sucursales, 2.400 expositores, 600 tarjetas, licencias vitalicias y plataforma corporativa — equivale al valor de vida de **15 clientes fieles**. Quince, sobre una base de decenas de miles.

---

## 7. El Stack de la Oferta — composición del Pack Corporativo Premium

Desglose completo de lo que recibe cada sucursal, con su valor de mercado individual:

| Componente | Especificación | Valor de mercado |
|---|---|---|
| **Expositores de mesa acrílico premium** | 20 unidades, NFC + QR dinámico, ID único impreso | $500.000 |
| **Tarjetas de PVC portátiles** | 5 unidades, mate alta durabilidad, para mozos y repartidores | $125.000 |
| **Licencia de software de redirección dinámica** | De por vida, sin vencimiento, sin abono | $1.260.000 |
| **ID Tracking para todo el staff** | Vinculación ilimitada de legajos, altas y bajas sin costo | $420.000 |
| **Smart Feedback Filter** | Bifurcación 5★ / 1-4★ con ruteo a Administración Central | $360.000 |
| **Módulo de Auditoría de Rendimiento por Empleado** | Ranking nominal, detección de patrones, comparativa de red | $540.000 |
| **Módulo de Evolución y Tendencias por Sucursal** | Series históricas, benchmark multi-sucursal y multi-país | $480.000 |
| **Alertas automáticas de inactividad de ID** | Monitoreo permanente de adopción por dispositivo | $180.000 |
| **Reportes automatizados en PDF semanales** | Generación y distribución automática a la central | $240.000 |
| **Playbook de Incentivos de Personal** | Sistema documentado de gamificación, bonos y rankings | $300.000 |
| **Implementación y capacitación del staff** | Protocolo operativo de captura post-satisfacción | $240.000 |
| **Valor total del stack** | | **$4.645.000 ARS** |
| **Inversión Pack Corporativo Premium** | **Pago único de por vida, sin costos fijos mensuales** | **$180.000 ARS** |

**Sin cuotas. Sin renovación anual. Sin costo por usuario. Sin costo por legajo agregado. Sin costo por redirección.**

---

## 8. Trim & Stack — Resolución anticipada de obstáculos

Toda oferta se compra o se rechaza en función de los obstáculos que el decisor anticipa. Esta sección enumera las objeciones legítimas que la Dirección de Franquicias planteará, y muestra cómo cada una **ya está resuelta dentro del stack** — con tecnología que opera a costo de entrega marginal cero para nosotros, y por lo tanto sin sumar un peso al precio.

### 8.1 Cuadro de obstáculos y resolución

| # | Obstáculo planteado por la Dirección de Franquicias | Elemento del stack que lo resuelve | Mecánica de resolución | Costo de entrega |
|---|---|---|---|---|
| **1** | *"¿Cómo controlo que los 120 franquiciados usen efectivamente las tarjetas y los expositores?"* | **Alertas automáticas de inactividad de ID en el dashboard centralizado** | Cada ID reporta su último tap. Si un dispositivo no registra actividad en el umbral configurado, la central recibe alerta automática con sucursal, legajo y días de inactividad. La adopción deja de ser un acto de fe y pasa a ser un indicador en el tablero. | **$0** |
| **2** | *"¿Qué pasa si un mozo esconde la tarjeta justamente porque atiende mal y no quiere ser evaluado?"* | **Alertas de inactividad + Incentivos automáticos vía ranking mensual** | Doble mecanismo. **Detección:** un legajo sin taps mientras sus pares del mismo turno registran actividad normal genera una anomalía visible — esconder la tarjeta se vuelve más evidente que usarla. **Incentivo:** el bono mensual por ranking hace que esconder la tarjeta tenga un costo económico personal directo. El sistema alinea el interés del empleado con el de la marca. | **$0** |
| **3** | *"¿Cómo evitamos que la administración central se sature con miles de datos sin procesar?"* | **Reportes de evolución automatizados en PDF semanales + alertas por excepción** | La central no consume datos crudos: recibe un PDF semanal con los indicadores consolidados de la red, más alertas por excepción únicamente cuando algo se sale del umbral. El principio de diseño es **gestión por excepción**: si todo está en verde, no llega nada. El volumen de información que llega a Dirección es constante, sin importar si la red tiene 120 o 400 sucursales. | **$0** |
| **4** | *"¿Y si un franquiciado se niega a implementarlo?"* | **Benchmark comparativo de red** | El ranking inter-sucursal expone la brecha de desempeño con datos objetivos. El franquiciado rezagado ve su posición contra la media de la red. La adopción se vuelve una decisión comercial propia, no una imposición de la central. | **$0** |
| **5** | *"¿Qué pasa con la rotación de personal? Perdemos tarjetas todo el tiempo."* | **Redirección Flexible + reasignación de ID** | El ID se desvincula del legajo saliente y se reasigna al entrante desde el panel, en segundos. La tarjeta física se reutiliza íntegra. Cero reimpresión, cero costo por rotación. | **$0** |
| **6** | *"¿Cómo se integra esto con nuestros sistemas administrativos actuales?"* | **Vinculación por legajo** | El sistema no reemplaza ni interfiere con el ERP o el sistema de RR.HH. existente: se vincula por el número de legajo que Pizzería Popular ya usa. Sin migración, sin desarrollo a medida, sin proyecto de IT. | **$0** |
| **7** | *"¿Y si Google cambia sus reglas o cambiamos de ficha?"* | **Redirección Flexible sin costo de impresión** | Todo destino es dinámico y controlado desde la central. Cualquier cambio de plataforma, de ficha o de estrategia se ejecuta con una operación sobre los 3.000 dispositivos de la red. El hardware nunca queda obsoleto. | **$0** |
| **8** | *"El presupuesto de este trimestre ya está cerrado."* | **Estructura de pago único, sin abono mensual** | No genera línea de gasto recurrente ni compromiso presupuestario futuro. Es una compra de activo, no un servicio contratado. A $164 ARS por día amortizado, no compite con ninguna partida operativa relevante. | **$0** |

### 8.2 Lectura estratégica del cuadro

Los ocho obstáculos se resuelven con **funcionalidades ya construidas dentro de la plataforma**. No requieren desarrollo adicional, personal dedicado ni costo variable por sucursal. Por eso pueden incluirse íntegramente en el stack sin trasladar un peso al precio — el principio central de la construcción Grand Slam: **maximizar el valor entregado manteniendo el costo marginal de entrega en cero**.

---

## 9. Garantía Asimétrica de Riesgo Cero Corporativa

Toda la responsabilidad del resultado es nuestra. Pizzería Popular no asume riesgo financiero alguno en esta implementación.

> ### Garantía de Doble Condición con Retención de Hardware
>
> **Si transcurridos 90 días de uso activo, la sucursal no logra un incremento comprobado del 30% en su volumen semanal de reseñas —**
>
> **— o si, con independencia de ese resultado, la Administración Central de Pizzería Popular determina que el sistema de métricas de personal no le resulta útil para su gestión —**
>
> **MetricsField reembolsa el 100% de la inversión realizada.**
>
> **Y Pizzería Popular conserva, sin cargo alguno, la totalidad del hardware entregado — los 20 expositores acrílicos y las 5 tarjetas de PVC de cada sucursal — como compensación por el tiempo invertido por su equipo en la implementación.**

### 9.1 Por qué la garantía tiene dos condiciones

La primera condición es **objetiva y medible**: el incremento del 30% en volumen semanal de reseñas se verifica contra la línea de base registrada en los primeros 7 días de operación, con datos auditables en el propio panel. No hay margen de interpretación.

La segunda condición es **deliberadamente subjetiva**: alcanza con que la Administración Central diga que el sistema de métricas de personal no le sirve. Sin justificación, sin proceso de reclamo, sin evaluación de nuestra parte.

Se estructuró así porque el criterio real de éxito de este programa no es reputacional — es de **control de gestión**. Si el módulo de auditoría de personal no le cambia la forma de trabajar a la Dirección de Operaciones, el sistema falló, aunque las reseñas hayan subido. Y en ese caso corresponde devolver el dinero.

### 9.2 La asimetría, explicitada

| Escenario | Resultado para Pizzería Popular | Resultado para MetricsField |
|---|---|---|
| **El sistema funciona** | Domina el Map Pack, audita a 120 sucursales por legajo, blinda la marca | Cobra $180.000 por sucursal |
| **El sistema no funciona** | Recupera el 100% del dinero **y conserva todo el hardware** | Pierde la producción, la logística, la implementación y el ingreso |

Pizzería Popular no puede terminar esta operación en una posición peor a la actual. En el peor escenario posible, termina con el dinero de vuelta y con 2.400 expositores acrílicos premium y 600 tarjetas de PVC en su poder, sin haber pagado nada.

**Condición única:** "uso activo" significa que el protocolo de captura post-satisfacción se ejecutó efectivamente, verificable mediante el registro de taps por ID en el panel. La garantía cubre la eficacia de nuestro sistema, y su verificación es responsabilidad nuestra a través de los datos del propio dashboard.

---

## 10. Construcción del nombre — Fórmula M-A-G-I-C de Hormozi

### 10.1 Descomposición

| Componente | Definición Hormozi | Aplicación a Pizzería Popular |
|---|---|---|
| **M — Magnetic Reason Why** | El motivo imantado que justifica la oferta ahora | *Programa Nacional* — apertura del despliegue federal e internacional para la red |
| **A — Avatar** | A quién está dirigido, con precisión | *Franquicias de Pizzería Popular* — Dirección de Operaciones, Dirección de Franquicias, Administración Central |
| **G — Goal** | El resultado concreto y deseado | *Auditar a cada mozo y repartidor por legajo + duplicar el posicionamiento local de cada sucursal* |
| **I — Interval of Time** | El plazo definido de obtención | *90 días* |
| **C — Container Word** | La palabra que contiene y da entidad al conjunto | *Sistema Llave en Mano* |

### 10.2 Nombre corporativo del programa

> # Programa Nacional de Dominación de Reputación y Auditoría de Servicio para las Franquicias de Pizzería Popular
>
> ## El Sistema Llave en Mano que audita a cada mozo y repartidor por número de legajo y duplica el posicionamiento local de cada sucursal en 90 días — sin abonos mensuales ni reimpresión de hardware

### 10.3 Denominaciones operativas abreviadas

Para uso interno y en comunicación con franquiciados:

- **Programa Dominación Popular 90**
- **Sistema de Auditoría de Servicio Pizzería Popular (SASPP)**
- **Pack Corporativo Premium — Red Pizzería Popular**

---

## 11. Plan de implementación — 90 días

| Fase | Período | Actividades | Responsable |
|---|---|---|---|
| **Fase 0 — Configuración** | Días 1–7 | Alta de sucursales y franquiciados en el panel. Carga del padrón de legajos. Vinculación de fichas de Google por sucursal. Definición de umbrales de alerta. | MetricsField + Administración Central |
| **Fase 1 — Despliegue físico** | Días 8–21 | Producción y distribución de expositores y tarjetas con ID único. Asignación de dispositivos a legajos. Registro de línea de base de reseñas. | MetricsField |
| **Fase 2 — Activación de protocolo** | Días 22–35 | Capacitación del staff en el protocolo de captura post-satisfacción. Puesta en marcha del Playbook de Incentivos. Primer ranking mensual. | MetricsField + Encargados de sucursal |
| **Fase 3 — Operación auditada** | Días 36–75 | Operación plena. Reportes PDF semanales a la central. Alertas de inactividad activas. Primera ronda de bonos por desempeño. | Administración Central |
| **Fase 4 — Auditoría de resultados** | Días 76–90 | Medición contra línea de base. Comparativa inter-sucursal e inter-país. Evaluación formal de la garantía. Plan de expansión de red. | Comité de Dirección |

---

## 12. Síntesis de la decisión

| Dimensión | Situación actual | Con el Programa implementado |
|---|---|---|
| **Auditoría de personal** | Percepción y mystery shopper esporádico | Nominal, por legajo, continua y comparable |
| **Detección de problemas** | Cuando la reseña negativa ya es pública | En privado, en el instante, con legajo y sucursal |
| **Comparación entre franquicias** | Reportes autoinformados | Tablero objetivo, normalizado, multi-país |
| **Captación de reseñas** | Espontánea, sesgada al reclamo | Sistemática, en el pico de satisfacción, 83% de conversión |
| **Costo de cambios de hardware** | Reimpresión y logística a 120 locales | $0 — redirección dinámica desde la central |
| **Estructura de costos** | — | $180.000 por sucursal, pago único de por vida |
| **Riesgo asumido** | — | Cero — reembolso total con retención de hardware |

**La decisión no es si el sistema es caro.** Un solo cliente fiel recuperado paga ocho veces el sistema completo de su sucursal.

**La decisión es cuántos meses más la red va a operar 120 sucursales sin saber, con nombre y apellido, quién está construyendo la reputación de Pizzería Popular y quién la está erosionando.**

---

## 13. Próximo paso

**Sesión de diagnóstico de red — 45 minutos, sin cargo.**

Para el Director de Operaciones, el Director de Franquicias y el equipo administrativo central. Salida concreta de la sesión:

1. Auditoría en vivo del estado reputacional actual de 5 sucursales testigo de la red
2. Proyección de LTV y ROI con los datos reales de ticket promedio de Pizzería Popular
3. Demostración funcional del dashboard corporativo con datos de la red
4. Definición del piloto: sucursales, plazos y línea de base de medición

**MetricsField** — Córdoba, Argentina
Sistemas de Auditoría de Servicio y Reputación Local

---

*Documento confidencial. Elaborado exclusivamente para la Dirección de Pizzería Popular. Los parámetros financieros corresponden a valores promedio de la plaza de Córdoba y se recalibran con los datos reales de la cadena durante la sesión de diagnóstico.*
