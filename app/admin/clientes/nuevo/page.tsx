import type { Metadata } from "next";
import Link from "next/link";
import { accionCrearCliente } from "@/app/actions";
import { ClienteForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { asegurarAdminPagina } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo cliente" };
export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  await asegurarAdminPagina();
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-sm">
        <Link href="/admin/clientes" className="text-slate-600 hover:text-[#1F4E80]">
          ← Clientes
        </Link>
      </div>
      <PageHeader
        title="Nuevo cliente"
        subtitle="Alta de un negocio en la cartera. El código de acceso al portal se genera solo."
      />
      <Card>
        <ClienteForm action={accionCrearCliente} />
      </Card>
    </div>
  );
}
