import "server-only";
import { sql } from "../sql";
import type { AuditGEOResultado, PlataformaIA } from "../types";
import { fechaISO } from "./_compartido";

// ---------- Audit GEO ----------

function mapAudit(r: Record<string, unknown>): AuditGEOResultado {
  return {
    id: Number(r.id),
    comercioId: r.comercio_id as string,
    fecha: fechaISO(r.fecha),
    pregunta: r.pregunta as string,
    plataforma: r.plataforma as PlataformaIA,
    aparece: Boolean(r.aparece),
    competidoresMencionados: r.competidores_mencionados as string,
  };
}

export async function getAudits(comercioId: string): Promise<AuditGEOResultado[]> {
  const rows = await sql`
    SELECT * FROM audits_geo WHERE comercio_id = ${comercioId} ORDER BY fecha DESC, id DESC
  `;
  return rows.map(mapAudit);
}
