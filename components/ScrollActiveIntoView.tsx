"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Envuelve el ítem "activo" de una tira horizontal scrolleable (ej. el
// selector de sucursales) para que quede visible apenas carga la página,
// sin depender de que el usuario scrollee la tira a mano en mobile.
export default function ScrollActiveIntoView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  // "contents" en vez de un div normal rompía scrollIntoView: sin caja de
  // layout propia, no hay nada que scrollear. "shrink-0" mantiene el mismo
  // comportamiento que tenía el hijo directo dentro del flex de la tira.
  return (
    <div ref={ref} className="shrink-0">
      {children}
    </div>
  );
}
