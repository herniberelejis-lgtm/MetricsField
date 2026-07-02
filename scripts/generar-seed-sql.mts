// Genera db/seed.sql a partir de lib/seed.ts (los mismos 7 comercios de
// ejemplo que tenía el prototipo), para poblar la base de datos nueva con
// los mismos datos de demo. Correr una sola vez: node --experimental-strip-types scripts/generar-seed-sql.mts
import { seedClientes } from "../lib/seed.ts";
import fs from "node:fs";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const lines: string[] = [
  "-- Generado por scripts/generar-seed-sql.mts — no editar a mano.",
  "-- Carga los 7 comercios de ejemplo del prototipo original.",
  "",
];

for (const c of seedClientes) {
  lines.push(
    `INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto, google_review_url, busqueda_clave, fee, fecha_alta) VALUES (${[
      esc(c.id),
      esc(c.codigoAcceso),
      esc(c.nombre),
      esc(c.rubro),
      esc(c.zona),
      esc(c.plan),
      esc(c.estado),
      esc(c.contacto),
      esc(c.googleReviewUrl),
      esc(c.busquedaClave),
      esc(c.fee),
      esc(c.fechaAlta),
    ].join(", ")}) ON CONFLICT (id) DO NOTHING;`,
  );

  for (const h of c.historico) {
    lines.push(
      `INSERT INTO metricas_mensuales (comercio_id, mes, resenas_nuevas, resenas_total, rating_promedio, posicion_maps, visitas_perfil, llamadas, clics_como_llegar, citas_chatgpt, citas_copilot, citas_perplexity) VALUES (${[
        esc(c.id),
        esc(h.mes),
        esc(h.resenasNuevas),
        esc(h.resenasTotal),
        esc(h.ratingPromedio),
        esc(h.posicionMaps),
        esc(h.visitasPerfil),
        esc(h.llamadas),
        esc(h.clicsComoLlegar),
        esc(h.citasChatGPT),
        esc(h.citasCopilot),
        esc(h.citasPerplexity),
      ].join(", ")}) ON CONFLICT (comercio_id, mes) DO NOTHING;`,
    );
  }

  for (const v of c.ventasNFC) {
    lines.push(
      `INSERT INTO ventas_nfc (comercio_id, formato, cantidad, precio_unitario, fecha) VALUES (${[
        esc(c.id),
        esc(v.formato),
        esc(v.cantidad),
        esc(v.precioUnitario),
        esc(v.fecha),
      ].join(", ")});`,
    );
  }

  // Un link NFC de mostrador por comercio, para tener datos de ejemplo del
  // gestor de links desde el primer arranque.
  lines.push(
    `INSERT INTO links_nfc (id, comercio_id, etiqueta, destino) VALUES (${[
      esc(`${c.id}-mostrador`),
      esc(c.id),
      esc("Mostrador"),
      esc("resena"),
    ].join(", ")}) ON CONFLICT (id) DO NOTHING;`,
  );

  lines.push("");
}

fs.writeFileSync(new URL("../db/seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`Generado db/seed.sql con ${seedClientes.length} comercios.`);
