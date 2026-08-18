import { api } from "../api.js";

export function getPortal(codigo, params = {}) {
  const q = new URLSearchParams();
  if (params.sucursal) q.set("sucursal", params.sucursal);
  if (params.google) q.set("google", params.google);
  const qs = q.toString();
  return api(`/api/portal/${encodeURIComponent(codigo)}${qs ? `?${qs}` : ""}`);
}

export function aprobarResenaPortal(codigo, id, body) {
  return api(`/api/portal/${encodeURIComponent(codigo)}/resenas/${id}/aprobar`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function descartarResenaPortal(codigo, id, body) {
  return api(`/api/portal/${encodeURIComponent(codigo)}/resenas/${id}/descartar`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function actualizarLinkPortal(codigo, linkId, body) {
  return api(`/api/portal/${encodeURIComponent(codigo)}/links/${encodeURIComponent(linkId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function desconectarGooglePortal(codigo, body) {
  return api(`/api/portal/${encodeURIComponent(codigo)}/google/desconectar`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function actualizarAutomatizacionPortal(codigo, body) {
  return api(`/api/portal/${encodeURIComponent(codigo)}/automatizacion`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTapsPorHoraPortal(codigo, { fecha, comercioId }) {
  const q = new URLSearchParams({ fecha, comercioId });
  return api(`/api/portal/${encodeURIComponent(codigo)}/taps?${q}`);
}
