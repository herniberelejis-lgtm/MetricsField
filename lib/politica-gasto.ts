import "server-only";

/** Mientras no hay clientes pagos, la configuración omitida o mal escrita
 * debe bloquear consumo, nunca habilitarlo. No es un medidor de dólares:
 * el techo solicitado de US$2 se cumple conservadoramente bloqueando las
 * integraciones con tarifa. No activar gasto por cambiar una sola clave. */
export function modoSinGasto(): boolean {
  return process.env.APIS_MODO_SIN_GASTO !== "false";
}

/** SMTP y webhooks pueden usar proveedores gratuitos o pagos. Su plan debe
 * verificarse fuera del código; por defecto tampoco se envía a ellos. */
export function servicioExternoPermitido(servicio: "smtp" | "webhook"): boolean {
  if (!modoSinGasto()) return true;
  const variable = servicio === "smtp" ? "SMTP_GRATUITO_VERIFICADO" : "MONITOR_GRATUITO_VERIFICADO";
  return process.env[variable] === "true";
}
