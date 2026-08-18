const BASE = "";

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function getMe() {
  return api("/api/auth/me");
}

export function getAuthConfig() {
  return api("/api/auth/config");
}

export function login(password) {
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return api("/api/auth/logout", { method: "POST" });
}

export function getDashboard(periodo = "mes") {
  return api(`/api/admin/dashboard?periodo=${encodeURIComponent(periodo)}`);
}

export function getClientes() {
  return api("/api/admin/clientes");
}

export function getCliente(id) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}`);
}

export function crearCliente(body) {
  return api("/api/admin/clientes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function actualizarCliente(id, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function eliminarCliente(id, confirmarNombre) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmarNombre }),
  });
}

export function getHardware() {
  return api("/api/admin/hardware");
}

export function generarLoteHardware(body) {
  return api("/api/admin/hardware/lotes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function asignarPiezaHardware(body) {
  return api("/api/admin/hardware/asignar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getActividad() {
  return api("/api/admin/actividad");
}

export function syncGoogleCliente(id) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/sync-google`, { method: "POST" });
}

export function desconectarGoogleCliente(id) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/google/desconectar`, { method: "POST" });
}

export function regenerarCodigoCliente(id) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/regenerar-codigo`, { method: "POST" });
}

export function crearSucursal(cuentaId, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(cuentaId)}/sucursales`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function crearLinkCliente(id, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/links`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function eliminarLinkCliente(id, linkId) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/links/${encodeURIComponent(linkId)}`, {
    method: "DELETE",
  });
}

export function crearCompetidorCliente(id, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/competidores`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function syncCompetidorCliente(id, compId) {
  return api(
    `/api/admin/clientes/${encodeURIComponent(id)}/competidores/${compId}/sync`,
    { method: "POST" },
  );
}

export function eliminarCompetidorCliente(id, compId) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/competidores/${compId}`, {
    method: "DELETE",
  });
}

export function guardarMetricaCliente(id, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/metricas`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function eliminarMetricaCliente(id, mes) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/metricas`, {
    method: "DELETE",
    body: JSON.stringify({ mes }),
  });
}

export function getResenasCliente(id) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/resenas`);
}

export function crearResenaCliente(id, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/resenas`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function actualizarResenaCliente(id, resenaId, body) {
  return api(`/api/admin/clientes/${encodeURIComponent(id)}/resenas/${resenaId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
