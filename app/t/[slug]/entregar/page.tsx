import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLink, salPinAutogestion } from "@/lib/db";
import { piezaAutorizada } from "@/lib/llavero";
import { esNavegadorInterno } from "@/lib/llavero-core";
import EntregarPieza from "@/components/tap/EntregarPieza";
import PuertaPin from "@/components/tap/PuertaPin";
import AvisoNavegadorInterno from "@/components/tap/AvisoNavegadorInterno";

export const dynamic = "force-dynamic";

// Entregar una pieza autogestionada a otro negocio (ver EntregarPieza). Solo
// desde un celular que la maneja; si no, primero el PIN.
export default async function EntregarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link || !link.autogestionado || link.comercioId) notFound();

  const autorizado = await piezaAutorizada(slug, await salPinAutogestion(slug));
  const interno = esNavegadorInterno((await headers()).get("user-agent") ?? "");

  return (
    <>
      {interno && (
        <div className="flex justify-center px-4 pt-4" style={{ background: "#f8f9fa" }}>
          <AvisoNavegadorInterno />
        </div>
      )}
      {autorizado ? (
        <EntregarPieza slug={slug} nombre={link.nombreNegocio} />
      ) : (
        <PuertaPin
          slug={slug}
          nombre={link.nombreNegocio}
          titulo="Entregársela a otro negocio"
          bajada="Primero poné el PIN actual de esta pieza."
        />
      )}
    </>
  );
}
