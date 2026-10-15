"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_POR_PRODUCTO, type SlugProducto } from "@/lib/tienda/catalogo";

// Carrito del navegador. Solo guarda slugs y cantidades: el precio lo pone
// siempre el servidor al comprar. Se recuerda en localStorage como
// comodidad; si el navegador lo bloquea, el carrito vive en memoria.

export interface ItemCarrito {
  slug: SlugProducto;
  cantidad: number;
}

interface ContextoCarrito {
  items: ItemCarrito[];
  cantidadTotal: number;
  cargado: boolean;
  agregar: (slug: SlugProducto, cantidad?: number) => void;
  cambiar: (slug: SlugProducto, cantidad: number) => void;
  quitar: (slug: SlugProducto) => void;
}

const CLAVE = "mf-carrito-v1";
const Ctx = createContext<ContextoCarrito | null>(null);

function leer(): ItemCarrito[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo.filter(
      (i): i is ItemCarrito =>
        typeof i?.slug === "string" && Number.isInteger(i?.cantidad) && i.cantidad > 0,
    );
  } catch {
    return [];
  }
}

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setItems(leer());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // Navegación privada o almacenamiento bloqueado: seguimos en memoria.
    }
  }, [items, cargado]);

  const cambiar = useCallback((slug: SlugProducto, cantidad: number) => {
    const c = Math.max(0, Math.min(MAX_POR_PRODUCTO, Math.round(cantidad)));
    setItems((prev) => {
      const sin = prev.filter((i) => i.slug !== slug);
      return c === 0 ? sin : [...sin, { slug, cantidad: c }].sort((a, b) => a.slug.localeCompare(b.slug));
    });
  }, []);

  const agregar = useCallback(
    (slug: SlugProducto, cantidad = 1) => {
      setItems((prev) => {
        const actual = prev.find((i) => i.slug === slug)?.cantidad ?? 0;
        const c = Math.min(MAX_POR_PRODUCTO, actual + cantidad);
        return [...prev.filter((i) => i.slug !== slug), { slug, cantidad: c }].sort((a, b) =>
          a.slug.localeCompare(b.slug),
        );
      });
    },
    [],
  );

  const quitar = useCallback((slug: SlugProducto) => cambiar(slug, 0), [cambiar]);

  const valor = useMemo<ContextoCarrito>(
    () => ({
      items,
      cargado,
      cantidadTotal: items.reduce((s, i) => s + i.cantidad, 0),
      agregar,
      cambiar,
      quitar,
    }),
    [items, cargado, agregar, cambiar, quitar],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCarrito fuera de ProveedorCarrito");
  return c;
}
