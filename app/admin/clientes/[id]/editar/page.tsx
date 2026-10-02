import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getLogoComercio } from "@/lib/db";
import {
  accionActualizarCliente,
  accionRegistrarVentaNFC,
  accionSubirLogoComercio,
  accionEliminarLogoComercio,
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

const ERRORES_LOGO: Record<string, string> = {
  "logo-vacio": "Elegí un archivo antes de subir.",
  "logo-formato": "Formato no soportado — usá PNG, JPG o WEBP.",
  "logo-tamano": "El archivo pesa más de 2 MB — achicalo y probá de nuevo.",
};

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const [c, logo, { error }] = await Promise.all([
    getCliente(id),
    getLogoComercio(id),
    searchParams,
  ]);
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
        Logo para la miniatura de WhatsApp
      </h2>
      <Card>
        <p className="mb-4 text-xs text-slate-500">
          Cuando alguien comparte el link del cartel de este comercio por WhatsApp, la
          tarjeta que aparece usa este logo. Sin uno cargado, muestra el isotipo genérico
          de MetricsField.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {ERRORES_LOGO[error] ?? "No se pudo guardar — probá de nuevo."}
          </div>
        )}

        {logo && (
          <div className="mb-4 flex items-center gap-4">
            <img
              src={`data:${logo.contentType};base64,${logo.datos.toString("base64")}`}
              alt={`Logo de ${c.nombre}`}
              className="h-16 w-auto max-w-[200px] rounded border border-slate-200 bg-white object-contain p-1"
            />
            <form action={accionEliminarLogoComercio}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="text-xs font-medium text-rose-600 hover:underline"
              >
                Quitar logo
              </button>
            </form>
          </div>
        )}

        <form action={accionSubirLogoComercio} className="flex flex-wrap items-end gap-4">
          <input type="hidden" name="id" value={c.id} />
          <Field label={logo ? "Reemplazar logo" : "Subir logo"} hint="PNG, JPG o WEBP · hasta 2 MB">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              required
              className={inputCls}
            />
          </Field>
          <SubmitButton>Guardar</SubmitButton>
        </form>
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
