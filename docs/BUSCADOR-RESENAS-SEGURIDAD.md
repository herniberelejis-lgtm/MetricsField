# Buscador de reseñas y protección de gasto

El perfil global y el requisito actualizado de techo total US$2/mes se
documentan en `docs/APIS-PRESUPUESTO.md`. `APIS_MODO_SIN_GASTO` bloquea Places
antes de Redis y de los límites específicos; no alcanza con activar su flag.

## Uso

En **Administración → Hardware**: buscar negocio por nombre y ciudad, confirmar dirección y elegir el resultado. Se puede probar/copiar el enlace o elegir cliente y pieza libre y pulsar **Asignar y configurar NFC / QR**. Se actualiza el destino; el chip y el QR conservan su enlace MetricsField `/t/código`. Grabar físicamente un chip requiere dispositivo compatible y no ocurre al guardar el formulario.

La autogestión ya incorpora búsqueda al activar y editar. La edición exige PIN antes de consultar Google, además de exigirlo al guardar. La activación solo admite inventario activo nunca usado. Una pieza inexistente, asignada o devuelta no habilita consultas anónimas.

## Controles implementados

- Clave `GOOGLE_PLACES_API_KEY` exclusivamente en servidor; no se pega en el navegador.
- `GOOGLE_PLACES_HABILITADO=true` habilita consultas. Cualquier otro valor las bloquea. Por defecto está apagado, también en previews.
- Redis obligatorio: URL/token ausentes, inválidos, error o timeout bloquean la llamada paga. No se usa el fallback por instancia del limitador general.
- Reserva Redis atómica para topes diarios y mensuales compartidos por toda la aplicación. Valores predeterminados: **cero** en ambos, por el requisito del dueño de gastar US$0. Un valor cero bloquea incluso si se enciende el interruptor. Valor negativo, decimal, no numérico o superior a 100000 bloquea.
- Día y mes calendario UTC. Los contadores son compartidos entre instancias y persisten entre reinicios/despliegues. Todos los entornos que usan la misma clave deben compartir Redis. No borrar sus contadores para mantenimiento.
- Límites por actor: hasta 30 búsquedas y 30 detalles de administración por hora; autogestión hasta 60 operaciones por pieza en 24 h y 60 por IP en 10 minutos, además de los límites anteriores por operación. Estos son límites operativos iniciales, no promesas de gratuidad.
- Todas las salidas de `lib/places.ts` pasan por el corte global: búsquedas, autocomplete, detalles, estadísticas y reseñas, incluso cron y portal. Las lecturas con caché cachean el resultado antes de reservar cupo. Los fallos también consumen reserva, porque un timeout pudo ser facturado.
- Solo endpoint fijo de Google; sin redirecciones ni reintentos automáticos; timeout de Google de 8 segundos y Redis de 2 segundos. Place IDs y longitud de consultas validados. Field masks fijos.
- Acceso admin comprobado en servidor, incluyendo allowlist; Server Actions para escrituras y comprobación de estado en SQL para evitar doble asignación.
- El QR/NFC que usa el público solo redirige a la URL ya guardada; no hace búsquedas de Places por escaneo.

## Antes de activar en producción

1. Configurar una clave exclusiva de servidor restringida a **Places API (New)** en Vercel. No reutilizar una clave expuesta en el HTML de pruebas. Si se compartió fuera de su ámbito previsto, reemplazarla y revocar la anterior. No quitar restricciones de otras claves que ya use la aplicación.
2. Para aislar el gasto de las demás integraciones, usar un proyecto Google Cloud dedicado al buscador o cuotas específicas disponibles para los métodos de Places. Si se mantiene una clave/proyecto compartidos, las cuotas de Google pueden afectar también sincronización y portal. Restricción de IP solo si el despliegue tiene egreso fijo verificado; nunca inventar una IP para Vercel.
3. Verificar Redis compartido y persistente, token exclusivo del servidor y alertas de disponibilidad. No usar bases independientes para previews que compartan la clave de Google: multiplicarían el cupo agregado.
4. Revisar en Google Cloud **APIs y servicios → Places API (New) → Cuotas** los límites disponibles por método. Aplicar valores compatibles con el máximo de gasto aceptado y la tarifa de cada SKU. Un presupuesto de alertas ordinario no corta el consumo.
5. **Requisito del dueño: US$0, solo franquicia gratuita.** Antes de establecer valores positivos en `GOOGLE_PLACES_MAX_DIA` y `GOOGLE_PLACES_MAX_MES`, verificar uso y franquicia por SKU en la cuenta de facturación completa, incluidos otros proyectos. Las franquicias gratuitas no son una propiedad de la clave y crear otra clave no reinicia el consumo. Son conteos de solicitudes, no un límite monetario: una búsqueda, un detalle y reseñas pueden tener precios diferentes. El número de resultados no equivale al número de solicitudes. Un tope agregado conservador puede limitar cada SKU a ese número, pero no conoce el consumo de aplicaciones ajenas. Hasta verificarlo, dejar el interruptor apagado y los cupos en cero y usar «Configurar con un enlace existente».
6. Probar en preview con clave y Redis de pruebas: límite alcanzado, Redis caído, PIN incorrecto, pieza inexistente y solicitudes simultáneas. El caso de simultaneidad debe ejecutarse contra Redis real para verificar el script Lua en el proveedor.
7. Activar `GOOGLE_PLACES_HABILITADO=true` únicamente al verificar esos controles. Para cortar consultas se cambia a `false` y se redespliega. Para un corte de emergencia inmediato del proveedor, deshabilitar la API/clave en Google Cloud. Cambiar una variable en Vercel no modifica despliegues que ya estén en ejecución.

## Alcance y límites

Esto protege las llamadas de **Places** de este repositorio. No limita el gasto total de Google Cloud, otras aplicaciones que usen la misma clave, OAuth/Business Profile, Anthropic, Vercel, Redis ni Maps Static API. Las claves de Maps Static viajan al navegador y requieren restricciones/firma/cuotas propias. El HTML local de pruebas también queda fuera de estos contadores: no publicarlo con claves configuradas.

Los límites globales pueden ser agotados por abuso y pausar el buscador para usuarios legítimos; ante una duda se prioriza evitar gasto adicional. Se mantiene el pegado manual de enlaces. No es una certificación ni una garantía de riesgo cero. No modificar presupuesto, cuotas ni facturación sin acceso y verificación de su configuración real.

Documentación: https://developers.google.com/maps/billing-and-pricing/manage-costs y https://developers.google.com/maps/api-security-best-practices

## Verificación de esta entrega

Pruebas unitarias con proveedores simulados: bloqueo por interruptor, presupuesto cero, cuotas inválidas, Redis ausente/caído, cupo agotado en las cinco operaciones de Places, ausencia de reintentos y redirecciones, destinos externos, pieza inexistente/devuelta y PIN incorrecto antes de Google. Revisión por un segundo agente sin hallazgos altos/críticos; corregida la reserva por lecturas que venían de caché. Falta prueba contra Redis real, prueba funcional con la base de aplicación y comprobación de la facturación/cuotas efectivas de Google. No se usaron credenciales reales ni se activaron llamadas a Google.

`npm audit --omit=dev` detectó un riesgo moderado preexistente en Nodemailer (GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w, GHSA-85x2-q946-cp5h; parche disponible desde 10.1.4). No se modificó el sistema de correos en este cambio. Esta entrega no certifica la seguridad integral de todas las APIs y dependencias de MetricsField.
