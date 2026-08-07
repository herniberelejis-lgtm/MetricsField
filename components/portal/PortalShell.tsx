"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconChat } from "@/components/ui";
import BrandMark from "@/components/BrandMark";
import FloatingBottomNav from "@/components/FloatingBottomNav";

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
export function IconUsers(p: { size?: number; className?: string }) {
  return (
    <IconBase {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5" />
      <path d="M16 8.2a3.2 3.2 0 1 1 2.4 5.3" />
      <path d="M15.5 14.6c2.6.3 4.5 2.1 5 5.4" />
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
function IconGoogleG({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
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

export type PortalGoogleEstado = {
  conectado: boolean;
  conectarHref: string;
  /** Panel al que lleva el badge "Google conectado" — el perfil vive ahí. */
  perfilPanelId: string;
};

export default function PortalShell({
  clienteNombre,
  clienteSub,
  planBadge,
  logo,
  google,
  whatsappHref,
  nav,
  panels,
  defaultPanel = "resumen",
}: {
  clienteNombre: string;
  clienteSub: string;
  planBadge: ReactNode;
  logo?: ReactNode;
  google?: PortalGoogleEstado;
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

  // Barra flotante inferior: un ítem por entrada de primer nivel del nav del
  // portal (un grupo lleva al primero de sus hijos disponibles) — nunca
  // ítems de otra superficie.
  const floatingItems = nav
    .map((entry) => {
      if (entry.type === "leaf") {
        if (!availableIds.has(entry.id)) return null;
        return { key: entry.id, label: entry.label, target: entry.id, isActive: active === entry.id };
      }
      const visible = entry.items.filter((i) => availableIds.has(i.id));
      if (visible.length === 0) return null;
      return {
        key: entry.id,
        label: entry.label,
        target: visible[0].id,
        isActive: visible.some((i) => i.id === active),
      };
    })
    .filter((x): x is { key: string; label: string; target: string; isActive: boolean } => x !== null)
    .map((x) => ({ key: x.key, label: x.label, active: x.isActive, onClick: () => goTo(x.target) }));

  return (
    <div className="relative isolate min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Fondo del panel: gris muy claro de marca (F7F7F7), con el mismo
          efecto vidrio-esmerilado en sidebar/header/cards de siempre, pero
          sin el degradé rosa/lavanda/durazno — reemplazado por la paleta
          monocromática del Manual de Marca. */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
        <div className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(0,0,0,0.04),_transparent_70%)] blur-2xl" />
        <div className="absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,_rgba(0,0,0,0.045),_transparent_70%)] blur-2xl" />
        <div className="absolute -bottom-40 right-10 h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,_rgba(0,0,0,0.035),_transparent_70%)] blur-2xl" />
      </div>

      <button
        type="button"
        onClick={() => setNavOpen((v) => !v)}
        aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={navOpen}
        className="fixed left-3.5 top-3.5 z-50 grid h-11 w-11 place-items-center rounded-xl border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-lg lg:hidden"
      >
        {navOpen ? <IconClose size={20} /> : <IconMenuBars size={20} />}
      </button>
      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col overflow-y-auto border-r border-white/60 bg-white/60 text-slate-600 shadow-xl backdrop-blur-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          {logo ?? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
              <BrandMark size={18} strokeWidth={7} />
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-slate-900">METRICSFIELD</div>
            <div className="text-[10.5px] text-slate-500">Portal de cliente</div>
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
                  className={`flex min-h-[40px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors ${
                    isActive ? "bg-white/90 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
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
                  className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-white/50 hover:text-slate-800"
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
                          className={`flex min-h-[38px] items-center gap-2.5 rounded-xl border-l border-white/70 px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                            isActive ? "bg-white/90 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
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

        <div className="border-t border-white/60 px-5 py-4 text-[11px] leading-snug text-slate-500">
          Portal privado de <b className="text-slate-700">{clienteNombre}</b>. No compartas este link.
          <div className="mt-2 flex gap-3">
            <a href="/privacidad" className="underline underline-offset-2 hover:text-slate-700">
              Privacidad
            </a>
            <a href="/terminos" className="underline underline-offset-2 hover:text-slate-700">
              Términos
            </a>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/50 bg-white/70 px-5 py-4 backdrop-blur-xl lg:px-8 lg:pl-8">
          <h1 className="truncate pl-11 text-lg font-semibold tracking-tight text-slate-900 lg:pl-0">
            {activeLeaf?.label ?? "Resumen"}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {google &&
              (google.conectado ? (
                <button
                  type="button"
                  onClick={() => goTo(google.perfilPanelId)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" aria-hidden />
                  Google conectado
                  <IconChevron size={13} className="text-slate-400" />
                </button>
              ) : (
                <a
                  href={google.conectarHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <IconGoogleG size={13} />
                  Conectar con Google
                </a>
              ))}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Hablar con tu agencia por WhatsApp"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] lg:px-3.5"
              >
                <IconChat size={14} />
                <span className="hidden lg:inline">Hablar con tu agencia</span>
              </a>
            )}
            <div className="flex items-center gap-2.5 border-l border-slate-200/70 pl-3">
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

        <main className="mx-auto max-w-4xl px-5 py-7 pb-24 lg:px-8">{currentPanel}</main>
      </div>

      <FloatingBottomNav items={floatingItems} />
    </div>
  );
}
