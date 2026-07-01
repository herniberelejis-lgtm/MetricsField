import { accionLogin } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sinPassword =
    process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            GEO · SEO Analytics
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Panel de la agencia · acceso restringido
          </div>
        </div>

        {sinPassword ? (
          <p className="text-sm text-slate-600">
            El panel está bloqueado porque falta configurar la variable de
            entorno <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code>{" "}
            en el servidor. Configurala y recargá esta página.
          </p>
        ) : (
          <form action={accionLogin} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                required
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            {error && (
              <p className="text-xs text-rose-600">
                Contraseña incorrecta. Probá de nuevo.
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Entrar
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Sos cliente? Entrá con el link privado que te mandamos por WhatsApp.
        </p>
      </div>
    </div>
  );
}
