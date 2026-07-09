import { notFound } from "next/navigation";
import { getLink } from "@/lib/db";
import EditarCartel from "@/components/tap/EditarCartel";

export const dynamic = "force-dynamic";

// Solo existe para piezas autogestionadas (canal Mercado Libre) — el resto
// no tiene nada que "editar" acá (los links de agencia se administran desde
// /admin, y una pieza libre todavía sin activar no tiene datos que mostrar).
// No requiere el PIN para renderizar el formulario (nombre y link no son
// datos sensibles) — el PIN se pide recién al guardar, en editarCartel.
export default async function EditarCartelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const link = await getLink(slug);
  if (!link || !link.autogestionado) notFound();

  return (
    <EditarCartel slug={slug} nombreActual={link.nombreNegocio} urlActual={link.urlDestino ?? ""} />
  );
}
