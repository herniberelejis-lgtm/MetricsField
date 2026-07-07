import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLink, getClientePorLinkId, registrarTap } from "@/lib/db";
import TapStarGate from "@/components/tap/TapStarGate";

export const dynamic = "force-dynamic";

// La URL corta que va en el cartel NFC: taply.app/t/<slug>. El comercio
// nunca cambia esta URL — el destino se administra desde el panel
// (gestor de links, Fase 1b), así que un mismo cartel físico puede pasar
// de pedir reseñas a mostrar el menú sin reimprimir nada.
export default async function TapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link) notFound();

  const h = await headers();
  const esPrefetch =
    h.get("purpose") === "prefetch" || h.get("next-router-prefetch") === "1";
  if (!esPrefetch) {
    await registrarTap(slug, h.get("user-agent"));
  }

  if (!link.activo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-slate-500">
          Este cartel está temporalmente desactivado.
        </p>
      </div>
    );
  }

  if (link.destino !== "resena") {
    if (!link.urlDestino) notFound();
    redirect(link.urlDestino);
  }

  const comercio = await getClientePorLinkId(slug);
  if (!comercio) notFound();

  // Algunos clientes no quieren el filtro de estrellas — van derecho a la
  // reseña de Google para todo el mundo, sin desviar las malas a feedback
  // privado. Es una elección por link (lib/db.ts: usar_filtro), no algo que
  // decida Taply; el tap ya quedó contado arriba en cualquiera de los casos.
  if (!link.usarFiltro) {
    if (!comercio.googleReviewUrl) notFound();
    redirect(comercio.googleReviewUrl);
  }

  return (
    <TapStarGate
      comercioId={comercio.id}
      nombre={comercio.nombre}
      rubro={comercio.rubro}
      googleReviewUrl={comercio.googleReviewUrl}
    />
  );
}
