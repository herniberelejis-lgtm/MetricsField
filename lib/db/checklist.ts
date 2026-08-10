import "server-only";
import { sql } from "../sql";
import type { ChecklistItemSEO } from "../types";
import { CHECKLIST_SEO_ITEMS } from "../types";

// ---------- Checklist SEO ----------

export async function getChecklist(comercioId: string): Promise<ChecklistItemSEO[]> {
  const rows = await sql`
    SELECT item_key, hecho FROM checklist_seo WHERE comercio_id = ${comercioId}
  `;
  const hechos = new Map(rows.map((r) => [r.item_key as string, Boolean(r.hecho)]));
  return CHECKLIST_SEO_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    hecho: hechos.get(item.key) ?? false,
  }));
}
