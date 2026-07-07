import { accionLogin } from "./actions";
import { oauthConfigurado } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  "1": "Contraseña incorrecta. Probá de nuevo.",
  limite: "Demasiados intentos. Esperá 15 minutos y probá de nuevo.",
  "no-autorizado": "Esa cuenta de Google no tiene acceso al panel. Pedile a un admin que te sume.",
  estado: "Algo falló verificando la sesión de Google. Probá de nuevo.",
  cancelado: "Cancelaste el inicio de sesión con Google.",
  google: "Google no devolvió los datos esperados. Probá de nuevo.",
  "google-no-configurado": "El login con Google todavía no está configurado en el servidor.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sinPassword =
    process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD;
  const googleDisponible = oauthConfigurado();
  const mensajeError = error ? (ERRORES[error] ?? "Algo salió mal. Probá de nuevo.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            Taply
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Panel de la agencia · acceso restringido
          </div>
        </div>

        {mensajeError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {mensajeError}
          </p>
        )}

        {googleDisponible && (
          <>
            <a
              href="/api/admin/oauth/start"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
              </svg>
              Entrar con Google
            </a>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              o
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

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
                Contraseña del equipo
              </span>
              <input
                type="password"
                name="password"
                required
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
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
