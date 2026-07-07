import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

// Panel interno: nunca debe indexarse (son datos de clientes) y cada
// pantalla define su propio título vía el template para que las pestañas
// del navegador se distingan cuando el equipo tiene varias abiertas.
export const metadata: Metadata = {
  title: { template: "%s · Taply Admin", default: "Taply Admin" },
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
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
