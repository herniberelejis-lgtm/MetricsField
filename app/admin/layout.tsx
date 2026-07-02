import Sidebar from "@/components/Sidebar";

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
