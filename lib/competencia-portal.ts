// Límites de la lista de competidores que el propio cliente arma desde su
// portal (app/portal/actions.ts). Vive acá y no en el archivo de server
// actions porque un "use server" solo puede exportar funciones async.

/** Tope de competidores por local que se pueden sumar desde el portal:
 * cada uno cuesta cuota paga de Places (sync diario + al abrir el portal). */
export const MAX_COMPETIDORES_PORTAL = 10;
