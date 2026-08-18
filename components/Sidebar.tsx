"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import FloatingBottomNav from "@/components/FloatingBottomNav";

const nav = [
  { href: "/admin", label: "Panel", icon: "◧" },
  { href: "/admin/clientes", label: "Clientes", icon: "☰" },
  { href: "/admin/hardware", label: "Hardware", icon: "▢" },
  { href: "/admin/administradores", label: "Administradores", icon: "◇" },
  { href: "/admin/actividad", label: "Actividad", icon: "≡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const activeOf = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
          <BrandMark size={18} strokeWidth={7} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-slate-900">
            METRICSFIELD
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Córdoba · presencia digital</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = activeOf(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-slate-900 font-medium text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-slate-200 p-4 text-xs text-slate-400">
        <span>v0.2</span>
        <form action="/api/logout" method="post">
          <button type="submit" className="text-slate-400 hover:text-slate-700">
            Salir
          </button>
        </form>
      </div>
    </aside>
    <FloatingBottomNav
      items={nav.map((item) => ({ key: item.href, label: item.label, active: activeOf(item.href), href: item.href }))}
    />
    </>
  );
}
