import { notFound } from "next/navigation";
import { getComercioLoyalty, getProgramaLoyalty } from "@/lib/db/loyalty";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// Landing pública de Loyalty — la pantalla a la que redirige /t/[slug]
// cuando destino='loyalty'. Scaffold de A2: confirma que el flag, el
// entitlement del comercio y el ruteo funcionan de punta a punta. El
// registro real (SSO, consentimiento, primer sello) es A4 — a propósito no
// escribe nada en la base todavía, solo lee.
export default async function LoyaltyLandingPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  if (process.env.LOYALTY_ENABLED !== "true") notFound();

  const { codigo } = await params;
  const comercio = await getComercioLoyalty(codigo);
  if (!comercio || !comercio.tieneLoyalty) notFound();

  const programa = await getProgramaLoyalty(comercio.id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6">
      <Card variant="glass" className="w-full max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {comercio.nombre} · Loyalty
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          Guardá tu tarjeta y sumá tu primer sello.
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {programa
            ? "El registro llega en el próximo paso — esta pantalla confirma que el circuito ya funciona."
            : "Este comercio todavía no tiene su programa configurado."}
        </p>
      </Card>
    </div>
  );
}
