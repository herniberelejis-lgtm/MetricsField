import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLink } from "@/lib/db";
import { accesoAPieza } from "@/lib/cuenta-piezas";
import { esNavegadorInterno } from "@/lib/llavero-core";
import EditarCartel from "@/components/tap/EditarCartel";
import PuertaPin from "@/components/tap/PuertaPin";
import AvisoNavegadorInterno from "@/components/tap/AvisoNavegadorInterno";

export const dynamic = "force-dynamic";

// Solo existe para piezas autogestionadas (canal Mercado Libre) — el resto
// no tiene nada que "editar" acá (los links de agencia se administran desde
// /admin, y una pieza libre todavía sin activar no tiene datos que mostrar).
// Un celular que ya la maneja (llavero, lib/llavero.ts) va directo al
// formulario; cualquier otro pone el PIN una vez y queda autorizado.
export default async function EditarCartelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link || !link.autogestionado || link.comercioId) notFound();

  const autorizado = Boolean(await accesoAPieza(slug));
  const interno = esNavegadorInterno((await headers()).get("user-agent") ?? "");

  return (
    <>
      {interno && (
        <div className="flex justify-center px-4 pt-4" style={{ background: "#f8f9fa" }}>
          <AvisoNavegadorInterno />
        </div>
      )}
      {autorizado ? (
        <EditarCartel slug={slug} nombreActual={link.nombreNegocio} urlActual={link.urlDestino ?? ""} />
      ) : (
        <PuertaPin
          slug={slug}
          nombre={link.nombreNegocio}
          titulo="Cambiá a dónde lleva tu pieza"
          bajada="Poné el PIN de esta pieza. Se pide una sola vez: después, desde este celular, la cambiás cuando quieras."
        />
      )}
    </>
  );
}
