"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconChat } from "@/components/ui";

// Cascarón de navegación del portal del cliente: sidebar oscuro con
// paneles (en vez del scroll único de antes), forma tomada de la maqueta
// aprobada. Todo el fetching de datos sigue pasando en el Server Component
// (page.tsx) — acá solo vive el swap client-side entre paneles, con el
// panel activo reflejado en el hash de la URL para que se pueda compartir
// un link directo a una sección (ej. "#rating").

function IconBase({ children, size = 18, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconGrid(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </IconBase>
  );
}
export function IconStarNav(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M12 2l2.8 5.9 6.2.6-4.6 4.3 1.3 6.2L12 16l-5.7 3 1.3-6.2L3 8.5l6.2-.6z" />
    </IconBase>
  );
}
export function IconBuilding(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
    </IconBase>
  );
}
export function IconDevice(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </IconBase>
  );
}
export function IconActivity(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </IconBase>
  );
}
export function IconSearch(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </IconBase>
  );
}
export function IconHelp(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.6-2.2 1.8-2.4 3.3M12 17.2v.1" />
    </IconBase>
  );
}
function IconChevron(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M9 6l6 6-6 6" />
    </IconBase>
  );
}
function IconMenuBars(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}
function IconClose(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  );
}

export type PortalNavLeaf = {
  type: "leaf";
  id: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
};
export type PortalNavGroup = {
  type: "group";
  id: string;
  label: string;
  icon: ReactNode;
  items: PortalNavLeaf[];
};
export type PortalNavEntry = PortalNavLeaf | PortalNavGroup;

export default function PortalShell({
  clienteNombre,
  clienteSub,
  planBadge,
  googlePill,
  whatsappHref,
  nav,
  panels,
  defaultPanel = "resumen",
}: {
  clienteNombre: string;
  clienteSub: string;
  planBadge: ReactNode;
  googlePill?: ReactNode;
  whatsappHref?: string | null;
  nav: PortalNavEntry[];
  panels: Record<string, ReactNode>;
  defaultPanel?: string;
}) {
  const availableIds = new Set(Object.keys(panels));
  const allLeaves: PortalNavLeaf[] = nav.flatMap((e) => (e.type === "group" ? e.items : [e]));
  const leaves = allLeaves.filter((l) => availableIds.has(l.id));

  const [active, setActive] = useState(defaultPanel);
  const [navOpen, setNavOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});

  // Sincroniza con el hash de la URL al montar (deep link / recarga) y con
  // atrás/adelante del navegador — no en el render inicial del servidor,
  // para no generar mismatch de hidratación.
  useEffect(() => {
    function syncFromHash() {
      const id = window.location.hash.replace("#", "");
      if (id && availableIds.has(id)) setActive(id);
    }
    syncFromHash();
    window.addEventListener("popstate", syncFromHash);
    return () => window.removeEventListener("popstate", syncFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const grupo = nav.find((e) => e.type === "group" && e.items.some((i) => i.id === active));
    if (grupo) setGroupOpen((g) => ({ ...g, [grupo.id]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function goTo(id: string) {
    setActive(id);
    if (typeof window !== "undefined" && window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `#${id}`);
    }
    setNavOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }

  const activeLeaf = leaves.find((l) => l.id === active) ?? leaves[0];
  const currentPanel = panels[active] ?? panels[defaultPanel];

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[264px_1fr]">
      <button
        type="button"
        onClick={() => setNavOpen((v) => !v)}
        aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={navOpen}
        className="fixed left-3.5 top-3.5 z-50 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
      >
        {navOpen ? <IconClose size={20} /> : <IconMenuBars size={20} />}
      </button>
      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col overflow-y-auto bg-slate-950 text-slate-100 transition-transform duration-300 lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-950">
              <path d="M12 2l3.5 3.5L12 9 8.5 5.5 12 2zm7 7l3.5 3.5L19 16l-3.5-3.5L19 9zM5 9l3.5 3.5L5 16l-3.5-3.5L5 9zm7 7l3.5 3.5L12 23l-3.5-3.5L12 16z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight text-slate-50">METRICSFIELD</div>
            <div className="text-[10.5px] text-slate-400">Portal de cliente</div>
          </div>
        </div>

        <nav aria-label="Navegación del portal" className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {nav.map((entry) => {
            if (entry.type === "leaf") {
              if (!availableIds.has(entry.id)) return null;
              const isActive = active === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => goTo(entry.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    isActive ? "bg-slate-800/80 text-slate-50" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  {entry.icon}
                  <span className="flex-1 truncate">{entry.label}</span>
                  {entry.badge}
                </button>
              );
            }

            const visibleItems = entry.items.filter((i) => availableIds.has(i.id));
            if (visibleItems.length === 0) return null;
            const open = groupOpen[entry.id] ?? false;
            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => setGroupOpen((g) => ({ ...g, [entry.id]: !open }))}
                  aria-expanded={open}
                  className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-100"
                >
                  {entry.icon}
                  <span className="flex-1 truncate">{entry.label}</span>
                  <IconChevron size={16} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
                <div className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="flex min-h-0 flex-col gap-0.5 py-0.5 pl-4">
                    {visibleItems.map((item) => {
                      const isActive = active === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => goTo(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex min-h-[38px] items-center gap-2.5 rounded-lg border-l border-slate-800 px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                            isActive ? "bg-slate-800/80 text-slate-50" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                          }`}
                        >
                          {item.icon}
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4 text-[11px] leading-snug text-slate-500">
          Portal privado de <b className="text-slate-300">{clienteNombre}</b>. No compartas este link.
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-8 lg:pl-8">
          <h1 className="truncate pl-11 text-lg font-semibold tracking-tight text-slate-900 lg:pl-0">
            {activeLeaf?.label ?? "Resumen"}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {googlePill}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] lg:inline-flex"
              >
                <IconChat size={14} /> Hablar con tu agencia
              </a>
            )}
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {clienteNombre.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="hidden min-w-0 leading-tight lg:block">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-slate-800">{clienteNombre}</span>
                  {planBadge}
                </div>
                <span className="truncate text-[11px] text-slate-500">{clienteSub}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-5 py-7 lg:px-8">{currentPanel}</main>
      </div>
    </div>
  );
}
