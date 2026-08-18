const { terminosFrecuentes } = require("./keywords");

function normalizar(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metricasPorEmpleado(resenas, links) {
  const tapsPorNombre = new Map();
  for (const l of links) {
    const nombre = l.nombreEmpleado.trim();
    if (!nombre) continue;
    tapsPorNombre.set(nombre, (tapsPorNombre.get(nombre) ?? 0) + l.taps);
  }

  return [...tapsPorNombre.entries()]
    .map(([nombre, taps]) => {
      const primerNombre = nombre.split(/\s+/)[0];
      const patron = new RegExp(`\\b${escaparRegex(normalizar(primerNombre))}\\b`, "i");
      const coincidentes = resenas.filter((r) => r.texto.trim() && patron.test(normalizar(r.texto)));
      const ratingPromedio =
        coincidentes.length > 0
          ? coincidentes.reduce((acc, r) => acc + r.estrellas, 0) / coincidentes.length
          : 0;
      const quejasFrecuentes = terminosFrecuentes(
        coincidentes.filter((r) => r.estrellas <= 3).map((r) => r.texto),
        { max: 4, minimo: 2 },
      );
      return {
        nombre,
        taps,
        menciones: coincidentes.length,
        ratingPromedio,
        ejemplos: coincidentes
          .slice(0, 3)
          .map((r) => ({ autor: r.autor, estrellas: r.estrellas, texto: r.texto, fecha: r.fecha })),
        quejasFrecuentes,
      };
    })
    .sort((a, b) => b.menciones - a.menciones || b.taps - a.taps);
}

module.exports = { metricasPorEmpleado };
