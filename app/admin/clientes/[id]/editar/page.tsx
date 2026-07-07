import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import {
  accionActualizarCliente,
  accionRegistrarVentaNFC,
} from "@/app/actions";
import {
  ClienteForm,
  Field,
  FORMATOS_NFC,
  inputCls,
  SubmitButton,
} from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { fmtARS } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `Editar · ${c.nombre}` : "Editar cliente" };
}

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCliente(id);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-sm">
        <Link
          href={`/admin/clientes/${c.id}`}
          className="text-slate-500 hover:text-brand-fg"
        >
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader title="Editar cliente" subtitle={c.nombre} />

      <Card>
        <ClienteForm action={accionActualizarCliente} cliente={c} />
      </Card>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Registrar venta NFC
      </h2>
      <Card>
        <form action={accionRegistrarVentaNFC} className="space-y-4">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Formato">
              <select name="formato" className={inputCls}>
                {FORMATOS_NFC.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cantidad">
              <input
                name="cantidad"
                type="number"
                min={1}
                defaultValue={1}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Precio unitario (ARS)">
              <input
                name="precioUnitario"
                type="number"
                min={0}
                step={500}
                required
                placeholder="12000"
                className={inputCls}
              />
            </Field>
          </div>
          <SubmitButton>Registrar venta</SubmitButton>
        </form>

        {c.ventasNFC.length > 0 && (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-medium">Fecha</th>
                <th className="py-2 font-medium">Formato</th>
                <th className="py-2 font-medium">Cant.</th>
                <th className="py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...c.ventasNFC].reverse().map((v, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-600">
                    {new Date(v.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2 text-slate-800">{v.formato}</td>
                  <td className="py-2 tabular-nums text-slate-600">
                    {v.cantidad}
                  </td>
                  <td className="py-2 tabular-nums text-slate-800">
                    {fmtARS(v.cantidad * v.precioUnitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
