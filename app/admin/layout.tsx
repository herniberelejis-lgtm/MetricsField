import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

// Panel interno: nunca debe indexarse (son datos de clientes) y cada
// pantalla define su propio título vía el template para que las pestañas
// del navegador se distingan cuando el equipo tiene varias abiertas.
export const metadata: Metadata = {
  title: { template: "%s · MetricsField Admin", default: "MetricsField Admin" },
  robots: { index: false, follow: false, nocache: true },
};

// Layout del panel interno de la agencia (con navegación lateral).
// El portal de clientes (/portal/[codigo]) queda afuera de este grupo
// y no muestra el sidebar.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        {/* En una preview de Vercel las claves y los interruptores de Google
            no están cargados (son solo de Production): nada se sincroniza
            acá. Sin este aviso es fácil probar en la preview y creer que
            producción no anda. */}
        {process.env.VERCEL_ENV === "preview" && (
          <div role="status" className="bg-amber-100 px-6 py-2 text-center text-xs font-medium text-amber-900">
            Estás en una PREVIEW de prueba, no en producción: acá Google no se sincroniza. Para datos reales usá{" "}
            <a href="https://app.metricsfield.com/admin" className="underline">
              app.metricsfield.com
            </a>
            .
          </div>
        )}
        <div className="mx-auto max-w-6xl px-6 py-8 pb-24">{children}</div>
      </main>
    </div>
  );
}
