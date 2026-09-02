// Pantalla que reemplaza al panel cuando el comercio exige login con Google
// (tiene al menos un email cargado en portal_usuarios) y quien está mirando
// todavía no tiene una sesión válida y autorizada. Un solo click arranca
// /api/portal/google/oauth/start, que además de identificar a la persona
// conecta su Business Profile — ver el comentario en esa ruta.

const ERRORES: Record<string, string> = {
  "no-autorizado": "Esa cuenta de Google no tiene acceso a este portal. Pedile al equipo que la sume.",
  google: "Google no devolvió los datos esperados. Probá de nuevo.",
  "no-configurado": "El login con Google todavía no está configurado. Avisale al equipo.",
  cancelado: "Cancelaste el inicio de sesión con Google.",
  error: "No se pudo verificar tu cuenta. Probá de nuevo.",
};

export default function PortalGateGoogle({
  codigo,
  error,
}: {
  codigo: string;
  error?: string;
}) {
  const mensajeError = error ? (ERRORES[error] ?? "Algo salió mal. Probá de nuevo.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-6">
          <div className="text-sm font-semibold tracking-tight text-slate-900">MetricsField</div>
          <div className="mt-0.5 text-xs text-slate-500">Portal privado del cliente</div>
        </div>

        {mensajeError && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{mensajeError}</p>
        )}

        <p className="mb-5 text-sm text-slate-600">
          Este portal pide iniciar sesión con la cuenta de Google del comercio antes de mostrar los datos.
        </p>

        <a
          href={`/api/portal/google/oauth/start?codigo=${codigo}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
            <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
          </svg>
          Continuar con Google
        </a>

        <p className="mt-6 text-xs text-slate-400">
          ¿No tenés acceso todavía? Pedile a tu agencia que sume tu cuenta de Google al portal.
        </p>
      </div>
    </div>
  );
}
