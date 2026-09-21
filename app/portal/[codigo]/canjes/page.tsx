import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { listarBeneficios, listarCanjesPendientes } from "@/lib/db/loyalty";
import { descifrar } from "@/lib/loyalty/identidad";
import CanjesPendientes from "@/components/portal/CanjesPendientes";
import PortalGateGoogle from "../_components/PortalGateGoogle";
import { resolverAccesoCanjes } from "./_acceso";
import { crearBeneficioAction, desactivarBeneficioAction } from "./actions";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// CONEXIONES
//   Acceso:  ./_acceso.ts (sesión de Google + portal_usuarios, fail-closed)
//   Lee de:  lib/db/loyalty.ts (listarCanjesPendientes, listarBeneficios)
//   Escribe: ./actions.ts (confirmar entrega, alta/baja de beneficios)
//   Es la pantalla que el empleado deja abierta en el mostrador.

export default async function CanjesPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const { codigo } = await params;
  const { google } = await searchParams;

  const acceso = await resolverAccesoCanjes(codigo);
  if (!acceso.ok) {
    // El freno por IP cuenta SOLO los intentos fallidos. Contar también los
    // exitosos rompería la pantalla del mostrador: se refresca sola cada 5 s
    // y agotaría el límite en minutos, dejándola en 404 en pleno servicio.
    limpiarVencidos();
    const ip = ipDelRequest(await headers());
    if (!(await permitir(`portal-canjes-fallo:${ip}`, 20, 10 * 60_000))) notFound();

    if (acceso.motivo === "sin_sesion" || acceso.motivo === "sin_permiso") {
      const error = google ?? (acceso.motivo === "sin_permiso" ? "no-autorizado" : undefined);
      return <PortalGateGoogle codigo={codigo} error={error} />;
    }
    notFound();
  }

  const [pendientes, beneficios] = await Promise.all([
    listarCanjesPendientes(acceso.programa.id),
    listarBeneficios(acceso.programa.id),
  ]);

  const canjes = pendientes.map((c) => ({
    id: c.id,
    nombreCliente: descifrar(c.nombreCifrado),
    beneficioNombre: c.beneficioNombre,
    costoPuntos: c.costoPuntos,
    expiraEnIso: c.expiraEn.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <CanjesPendientes codigo={codigo} canjes={canjes} ahoraIso={new Date().toISOString()} />

      <section aria-labelledby="beneficios-titulo">
        <h2 id="beneficios-titulo" className="text-lg font-bold text-slate-900">
          Beneficios
        </h2>
        <Card className="mt-4">
          {beneficios.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todavía no cargaste ningún beneficio. Sin beneficios, tus clientes no pueden canjear puntos.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {beneficios.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-800">
                    {b.nombre} · <span className="text-slate-500">{b.costoPuntos} pts</span>
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await desactivarBeneficioAction(codigo, b.id);
                    }}
                  >
                    <button type="submit" className="text-xs text-red-600 underline">
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            action={async (formData: FormData) => {
              "use server";
              await crearBeneficioAction(codigo, formData);
            }}
          >
            <label className="text-xs text-slate-600">
              Nombre
              <input
                name="nombre"
                required
                maxLength={80}
                placeholder="Café gratis"
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Puntos
              <input
                name="costoPuntos"
                type="number"
                min={1}
                max={100000}
                required
                className="mt-1 block w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Agregar
            </button>
          </form>
        </Card>
      </section>
    </main>
  );
}
