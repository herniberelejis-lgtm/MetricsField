"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Glifos, no una librería de íconos: alcanza y no suma dependencia. Lo que sí
// importa es que se distingan entre sí — Clientes y Actividad usaban ☰ y ≡,
// que a 16px son el mismo dibujo.
const nav = [
  { href: "/admin", label: "Panel", icon: "◧" },
  { href: "/admin/clientes", label: "Clientes", icon: "◍" },
  { href: "/admin/hardware", label: "Hardware", icon: "▢" },
  { href: "/admin/administradores", label: "Administradores", icon: "◇" },
  { href: "/admin/actividad", label: "Actividad", icon: "≡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    // Hasta md el sidebar se convierte en barra superior (el panel se abre
    // desde el celular más seguido de lo que parece); de md para arriba vuelve
    // a ser la columna lateral fija de siempre.
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 md:block md:py-5">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-900">
            MetricsField
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Córdoba · presencia digital</div>
        </div>
        <form action="/api/logout" method="post" className="md:hidden">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Salir
          </button>
        </form>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:space-y-1 md:overflow-x-visible">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand/10 font-medium text-brand-fg"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 md:flex">
        <span>v0.2</span>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-3 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
