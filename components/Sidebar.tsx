"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Panel", icon: "◧" },
  { href: "/analytics", label: "Analytics", icon: "∿" },
  { href: "/clientes", label: "Clientes", icon: "☰" },
  { href: "/reportes", label: "Reportes", icon: "▤" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="text-sm font-semibold tracking-tight text-slate-900">
          GEO · SEO Analytics
        </div>
        <div className="mt-0.5 text-xs text-slate-500">Córdoba · presencia digital</div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
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

      <div className="flex items-center justify-between border-t border-slate-200 p-4 text-xs text-slate-400">
        <span>v0.2</span>
        <form action="/api/logout" method="post">
          <button type="submit" className="text-slate-400 hover:text-slate-700">
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
