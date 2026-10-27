# APIs: preparar gasto cero, techo total solicitado US$2/mes

El dueño pidió no gastar en APIs hasta tener clientes pagos. US$2 es el techo
mensual **total**, no US$2 por proveedor. Por ahora autorizó preparar solo el
código; no modificar las consolas de proveedores ni producción.

## Configuración conservadora

`APIS_MODO_SIN_GASTO=true` por defecto. Omitir la variable, escribirla mal o
usar otro valor que no sea exactamente `false` conserva el bloqueo. Con este
perfil no hay llamadas a Places ni Anthropic y no se generan imágenes Maps
Static. La configuración manual NFC/QR funciona sin consultar esos servicios.

No se afirma un tope monetario universal implementado: el código bloquea los
consumos conocidos. Cambiar esta variable a `false` no crea un límite de US$2.
No se autoriza hacerlo sin verificar previamente facturación y cuotas.

| Integración encontrada | Control preparado | Pendiente fuera del código |
|---|---|---|
| Places: búsquedas, sugerencias, detalle, rating, reseñas | Bloqueada por modo sin gasto; además interruptor propio, topes día/mes en cero y reserva Redis atómica | Franquicia por SKU, consumo agregado de cuenta, restricciones de clave y cuotas por método |
| Maps Static: imagen del portal | No se genera URL ni se muestra mapa en modo sin gasto | Cuota del proyecto, restricciones y firma de la clave ya expuesta en imágenes anteriores |
| Anthropic: respuestas IA | No se inicializa una petición aunque estén la clave y el flag anterior; se usan plantillas | Límite de gasto del workspace/organización y recarga automática en su consola |
| SMTP: avisos, resúmenes y pruebas | Envío normal y prueba bloqueados hasta `SMTP_GRATUITO_VERIFICADO=true` | Confirmar plan gratuito; los abonos fijos no desaparecen por bloquear envíos |
| Webhook de monitoreo | No sale de la aplicación hasta `MONITOR_GRATUITO_VERIFICADO=true`; conserva logs locales | Confirmar que el destino no cobre por mensaje o ejecución |
| Google OAuth (login) | Se conserva para no perder acceso administrativo | Seguridad de OAuth y usuarios autorizados; no habilita Maps/Places |
| Google Business Profile: métricas y reseñas OAuth | Conserva interruptores y permisos existentes; Google documenta estas APIs sin cargos de uso | Cuotas, aprobación y permisos de Google; no confundir con Places |
| Upstash Redis: límites de autenticación y del buscador | Se mantienen los controles de seguridad; Places no llega a Redis en modo sin gasto | Verificar que la base esté en Free o tenga presupuesto/corte del proveedor; login y otras acciones usan Redis aparte del buscador |
| Neon/Postgres y Vercel | No se desactivan porque sostienen datos y aplicación | Verificar planes, límites de recursos, cómputo y transferencia; son infraestructura y pueden facturar aunque las APIs anteriores estén bloqueadas |

## Alcance

Esto no cambia ninguna cuota ni facturación real, no revoca claves y no se ha
fusionado a producción. Tampoco detiene cargos ya incurridos, abonos fijos,
peticiones que ya estén en ejecución, URLs de mapas de versiones anteriores
ni otras aplicaciones que compartan claves/cuenta. Se debe redesplegar para
que el perfil entre en vigor; los despliegues antiguos requieren revisión.

El HTML independiente de pruebas `Buscador-Resenas/index.html` tiene su propio
bloqueo por defecto. No publicarlo habilitado con credenciales como alternativa
a los controles del servidor.

## Antes de permitir uso gratuito

Verificar el consumo real de todos los proyectos en cada cuenta. Las
franquicias de Maps son por SKU y el consumo se agrega entre proyectos de la
cuenta de facturación. Un presupuesto de alertas no es un corte. Si no se
puede demostrar un margen gratuito y un límite efectivo, conservar el perfil
sin gasto. No sustituir US$2 totales por US$2 en Google + US$2 en Anthropic.

Fuentes oficiales:

- https://developers.google.com/maps/billing-and-pricing/pay-as-you-go
- https://developers.google.com/maps/billing-and-pricing/manage-costs
- https://developers.google.com/my-business/content/pricing
- https://platform.claude.com/docs/en/api/rate-limits
- https://upstash.com/pricing/redis
