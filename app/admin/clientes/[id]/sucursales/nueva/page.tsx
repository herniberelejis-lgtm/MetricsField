import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import { accionCrearSucursal } from "@/app/actions";
import { SucursalForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { asegurarAdminPagina } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva sucursal" };
export const dynamic = "force-dynamic";

export default async function NuevaSucursalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await asegurarAdminPagina();
  const { id } = await params;
  const cuenta = await getCliente(id);
  if (!cuenta || cuenta.comercioPadreId) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${cuenta.id}`} className="text-slate-600 hover:text-[#1F4E80]">
          ← {cuenta.nombre}
        </Link>
      </div>
      <PageHeader
        title="Nueva sucursal"
        subtitle={`Otro local de ${cuenta.nombre}. Plan, abono y contacto se heredan de la cuenta — cada sucursal tiene su propia ficha de Google.`}
      />
      <Card>
        <SucursalForm action={accionCrearSucursal} cuentaId={cuenta.id} />
      </Card>
    </div>
  );
}
