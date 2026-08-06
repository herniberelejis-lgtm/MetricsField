import type { ReactNode } from "react";

export type FloatingNavItem = {
  key: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  href?: string;
};

/** Barra de navegación flotante inferior — acceso rápido a las secciones
 * principales, conviviendo con el sidebar (no lo reemplaza). Cada superficie
 * (portal / admin) le pasa SUS propios items; nunca comparten ítems entre sí. */
export default function FloatingBottomNav({ items }: { items: FloatingNavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Navegación rápida"
      className="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 md:hidden"
    >
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white/90 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
        {items.map((item) => {
          const content: ReactNode = item.label;
          const cls = `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            item.active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`;
          return item.href ? (
            <a key={item.key} href={item.href} className={cls}>
              {content}
            </a>
          ) : (
            <button key={item.key} type="button" onClick={item.onClick} className={cls}>
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
