"use client";

// Red de seguridad para cualquier error no capturado de un Server Component
// o de una server action invocada desde un <form> (ej. el botón de
// desconectar Google del portal). Sin esto, Next mostraba su pantalla
// genérica en inglés y sin salida. En producción `error.message` viene
// enmascarado por Next — no se muestra: no hay nada útil (ni seguro) ahí.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="text-2xl font-semibold tracking-tight text-slate-900">Algo salió mal</div>
      <p className="mt-3 max-w-sm text-sm text-slate-600">
        No pudimos completar lo que pediste. Probá de nuevo en un momento; si
        sigue pasando, escribinos por WhatsApp.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Reintentar
      </button>
    </div>
  );
}
