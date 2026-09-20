import { notFound } from "next/navigation";
import { getComercioLoyalty, getProgramaPorCuenta } from "@/lib/db/loyalty";
import FormularioAlta from "@/components/loyalty/FormularioAlta";

export const dynamic = "force-dynamic";

// CONEXIONES
//   Ruta a la que llega el cliente: app/t/[slug]/page.tsx la redirige
//   acá con `redirect(\`/l/${comercio.id}\`)` cuando destino='loyalty' —
//   por eso el segmento [codigo] de ESTA página es comercio.id (un slug
//   editable), no programa.codigoPublico (inmutable). Se resuelve por
//   getProgramaPorCuenta(comercio.id), y solo DESPUÉS se le pasa a
//   FormularioAlta el codigoPublico real, que es lo que
//   app/(loyalty)/l/[codigo]/actions.ts usa para buscar el programa — así
//   el registro nunca depende de que el slug del comercio no cambie.
//   Renderiza: components/loyalty/FormularioAlta.tsx (Client Component).
//
// Landing pública de Loyalty. Triple candado antes de mostrar nada
// (flag global, entitlement del comercio, programa activo) — si falta
// cualquiera, 404 en vez de un formulario roto. Mismo patrón defensivo
// que el router de app/t/[slug]/page.tsx.
export default async function LoyaltyLandingPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  if (process.env.LOYALTY_ENABLED !== "true") notFound();

  const { codigo } = await params;
  const comercio = await getComercioLoyalty(codigo);
  if (!comercio || !comercio.tieneLoyalty) notFound();

  const programa = await getProgramaPorCuenta(comercio.id);
  if (!programa || !programa.activo) notFound();

  return (
    <FormularioAlta
      codigoPublico={programa.codigoPublico}
      programaId={programa.id}
      nombreComercio={comercio.nombre}
    />
  );
}
