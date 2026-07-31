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
    // En mobile el sidebar es una barra arriba y el contenido va abajo; de md
    // para arriba, las dos columnas de siempre. `min-w-0` evita que una tabla
    // ancha estire el main y recorte el contenido dentro del flex.
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
