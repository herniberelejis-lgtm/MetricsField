import type { Metadata } from "next";
import { getAdmins } from "@/lib/db";
import { emailAdminActual } from "@/lib/auth";
import { accionAgregarAdmin, accionEliminarAdmin } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Administradores" };
export const dynamic = "force-dynamic";

export default async function AdministradoresPage() {
  const [admins, emailActual] = await Promise.all([getAdmins(), emailAdminActual()]);

  return (
    <div>
      <PageHeader
        title="Administradores"
        subtitle="Cuentas de Google que pueden entrar al panel — solo estas, nadie más."
      />

      <Card className="mb-4">
        <p className="text-sm text-slate-600">
          El login con Google reemplaza de a poco a la contraseña
          compartida: cada quien entra con su propia cuenta y queda
          registrado en{" "}
          <a href="/admin/actividad" className="text-brand-fg hover:underline">
            Actividad
          </a>{" "}
          quién hizo qué. Agregá acá las cuentas de Google del equipo (las
          "3 cuentas") — cualquier otra cuenta que intente entrar con
          Google va a quedar rechazada.
        </p>
        <form action={accionAgregarAdmin} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[220px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email de Google
            </span>
            <input
              name="email"
              type="email"
              required
              placeholder="nombre@gmail.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex-1 min-w-[160px]">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Nombre
            </span>
            <input
              name="nombre"
              placeholder="Como querés que aparezca"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Agregar
          </button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Agregado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {a.email}
                  {a.email === emailActual && (
                    <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand-fg">
                      vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.nombre || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(a.creadoEn).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={accionEliminarAdmin}>
                    <input type="hidden" name="email" value={a.email} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
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
