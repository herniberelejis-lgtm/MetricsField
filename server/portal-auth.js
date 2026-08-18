const { getClientePorCodigo, getCliente } = require("./db/clientes");

async function comercioAutorizado(codigo, comercioId) {
  const cuenta = await getClientePorCodigo(codigo);
  if (!cuenta) throw new Error("Portal inválido.");
  if (comercioId === cuenta.id) return cuenta;
  const sucursal = await getCliente(comercioId);
  if (!sucursal || sucursal.comercioPadreId !== cuenta.id) {
    throw new Error("Ese local no pertenece a este portal.");
  }
  return sucursal;
}

module.exports = { comercioAutorizado };
