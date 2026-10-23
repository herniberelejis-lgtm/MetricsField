"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import FloatingBottomNav from "@/components/FloatingBottomNav";
import { IconActivity, IconBuilding, IconDevice, IconGrid, IconUsers } from "@/components/portal/PortalShell";
import { IconClock } from "@/components/ui";

// Íconos de línea, los mismos del portal (components/portal/PortalShell.tsx).
const nav = [
  { href: "/admin", label: "Panel", icon: <IconGrid size={18} /> },
  { href: "/admin/clientes", label: "Clientes", icon: <IconBuilding size={18} /> },
  { href: "/admin/hardware", label: "Hardware", icon: <IconDevice size={18} /> },
  { href: "/admin/laboratorio", label: "Laboratorio", icon: <IconActivity size={18} /> },
  { href: "/admin/administradores", label: "Administradores", icon: <IconUsers size={18} /> },
  { href: "/admin/actividad", label: "Actividad", icon: <IconClock size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();

  const activeOf = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-[#E4E6EA] bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-[#EEF0F3] px-5 py-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
          <BrandMark size={18} strokeWidth={7} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-slate-900">
            METRICSFIELD
          </div>
          <div className="mt-0.5 text-xs text-slate-600">Panel del equipo</div>
        </div>
      </div>

      <nav aria-label="Navegación del panel" className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => {
          const active = activeOf(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition-colors",
                // Como el portal (DESIGN.md): fondo apenas tintado y una línea
                // de 2px, sin bloque negro.
                active
                  ? "bg-[#F1F4F8] font-semibold text-slate-900 shadow-[inset_2px_0_0_#6F9BCF]"
                  : "font-medium text-slate-600 hover:bg-[#F7F9FC] hover:text-slate-900",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-[#EEF0F3] p-4 text-xs text-slate-600">
        <span>v0.2</span>
        <form action="/api/logout" method="post">
          <button type="submit" className="min-h-[32px] px-1 font-medium text-slate-600 hover:text-slate-900">
            Salir
          </button>
        </form>
      </div>
    </aside>
    <FloatingBottomNav
      tono="portal"
      items={nav.map((item) => ({ key: item.href, label: item.label, active: activeOf(item.href), href: item.href }))}
    />
    </>
  );
}
