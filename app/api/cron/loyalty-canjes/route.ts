import { NextResponse, type NextRequest } from "next/server";
import { verificarCron } from "@/lib/cron-auth";
import { vencerCanjes } from "@/lib/db/loyalty";

// Marca como 'vencido' los canjes de Loyalty cuya vigencia de 5 minutos
// pasó. Es higiene y métricas (evento canje_vencido): confirmarCanje ya
// rechaza los vencidos por su cuenta, así que la frecuencia de este job no
// afecta la seguridad ni el saldo de nadie.

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rechazo = verificarCron(req);
  if (rechazo) return rechazo;

  const vencidos = await vencerCanjes();
  return NextResponse.json({ vencidos });
}
