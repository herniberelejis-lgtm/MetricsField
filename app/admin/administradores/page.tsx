import type { Metadata } from "next";
import { getAdmins } from "@/lib/db";
import { emailAdminActual, asegurarAdminPagina } from "@/lib/auth";
import { accionAgregarAdmin, accionEliminarAdmin } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Administradores" };
export const dynamic = "force-dynamic";

export default async function AdministradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await asegurarAdminPagina();
  const { error } = await searchParams;
  const [admins, emailActual] = await Promise.all([getAdmins(), emailAdminActual()]);

  return (
    <div>
      <PageHeader
        title="Administradores"
        subtitle="Cuentas de Google que pueden entrar al panel — solo estas, nadie más."
      />

      {error === "ultimo" && (
        <p className="mb-4 rounded-lg bg-[#FFF4E8] px-3 py-2 text-sm text-[#8A3F00]">
          No se puede eliminar al último administrador: el panel quedaría sin
          nadie que pueda entrar. Agregá otra cuenta antes de sacar esta.
        </p>
      )}

      <Card className="mb-4">
        <p className="text-sm text-slate-600">
          El panel se usa solo con Google: cada quien entra con su propia
          cuenta y queda registrado en{" "}
          <a href="/admin/actividad" className="text-[#1F4E80] hover:underline">
            Actividad
          </a>{" "}
          quién hizo qué. Agregá acá las cuentas de Google del equipo (las
          "3 cuentas") — cualquier otra cuenta que intente entrar con
          Google va a quedar rechazada.
        </p>
        <form action={accionAgregarAdmin} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[220px]">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Email de Google
            </span>
            <input
              name="email"
              type="email"
              required
              placeholder="nombre@gmail.com"
              className="w-full rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex-1 min-w-[160px]">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Nombre
            </span>
            <input
              name="nombre"
              placeholder="Como querés que aparezca"
              className="w-full rounded-lg border border-[#D6D9DE] px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-[36px] items-center rounded-full bg-[#1F4E80] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#183F68]"
          >
            + Agregar
          </button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Agregado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} className="border-b border-[#EEF0F3] last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {a.email}
                  {a.email === emailActual && (
                    <span className="ml-2 rounded-full bg-[#EEF4FB] px-2 py-0.5 text-[11px] font-medium text-[#1F4E80]">
                      vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.nombre || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(a.creadoEn).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={accionEliminarAdmin}>
                    <input type="hidden" name="email" value={a.email} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-[#8A3F00] hover:underline"
                    >
                      Quitar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-600">
                  Todavía no hay administradores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
