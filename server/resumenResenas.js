const { terminosFrecuentes } = require("./keywords");

function calcularResumenResenas(resenas) {
  const distribucion = [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    cantidad: resenas.filter((r) => r.estrellas === estrellas).length,
  }));
  const total = resenas.length;
  const promedio = total > 0 ? resenas.reduce((acc, r) => acc + r.estrellas, 0) / total : null;

  let tendencia = null;
  if (total >= 4) {
    const mitad = Math.floor(total / 2);
    const recientes = resenas.slice(0, mitad);
    const anteriores = resenas.slice(mitad, mitad * 2);
    const promedioDe = (arr) => arr.reduce((acc, r) => acc + r.estrellas, 0) / arr.length;
    const diferencia = promedioDe(recientes) - promedioDe(anteriores);
    const dir = diferencia > 0.15 ? "up" : diferencia < -0.15 ? "down" : "flat";
    tendencia = {
      dir,
      texto:
        dir === "up"
          ? "mejorando en las últimas reseñas"
          : dir === "down"
            ? "bajando en las últimas reseñas"
            : "estable",
    };
  }

  const temasRecurrentes = terminosFrecuentes(
    resenas.filter((r) => r.estrellas <= 3).map((r) => r.texto),
    { max: 6, minimo: 2 },
  );

  return { distribucion, total, promedio, tendencia, temasRecurrentes };
}

module.exports = { calcularResumenResenas };
