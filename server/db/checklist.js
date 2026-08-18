const { sql } = require("../sql");
const { CHECKLIST_SEO_ITEMS } = require("../constants/checklist");

async function getChecklist(comercioId) {
  const rows = await sql`
    SELECT item_key, hecho FROM checklist_seo WHERE comercio_id = ${comercioId}
  `;
  const hechos = new Map(rows.map((r) => [r.item_key, Boolean(r.hecho)]));
  return CHECKLIST_SEO_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    hecho: hechos.get(item.key) ?? false,
  }));
}

module.exports = { getChecklist };
