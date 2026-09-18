import Link from "next/link";

// Ver la nota en app/page.tsx: renderizado dinámico para que el nonce de la
// CSP (middleware.ts) coincida en cada visita.
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="text-5xl font-semibold tracking-tight text-slate-900">404</div>
      <p className="mt-3 max-w-sm text-sm text-slate-600">
        No encontramos esta página. Puede que el link haya cambiado o que el
        código ya no sea válido.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
