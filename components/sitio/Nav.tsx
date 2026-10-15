"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCarrito } from "./Carrito";
import { INICIO, waVertical } from "@/lib/sitio/contacto";

const LINKS = [
  { href: `${INICIO}#reviews`, texto: "Reviews" },
  { href: `${INICIO}#retail`, texto: "Retail" },
  { href: `${INICIO}#loyalty`, texto: "Loyalty" },
  { href: `${INICIO}#intel`, texto: "Intel" },
  { href: "/tienda", texto: "Tienda" },
];

export default function Nav() {
  const { cantidadTotal } = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const cajon = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cajon.current?.querySelector<HTMLElement>("a")?.focus();
    // Mientras el menú tapa la pantalla, lo de atrás no recibe foco.
    const main = document.querySelector("main");
    main?.setAttribute("inert", "");
    const cerrar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    window.addEventListener("keydown", cerrar);
    return () => {
      window.removeEventListener("keydown", cerrar);
      main?.removeAttribute("inert");
    };
  }, [abierto]);

  return (
    <header className="nav marco">
      <Link href={INICIO} className="nav__marca" aria-label="MetricsField, inicio">
        <img src="/sitio/img/logo-icon-dark.webp" alt="" width={28} height={28} />
        METRICSFIELD
      </Link>
      <nav className="nav__links" aria-label="Productos">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.texto}
          </Link>
        ))}
      </nav>
      <div className="nav__acciones">
        <Link href="/carrito" className="nav__carrito" aria-label={`Carrito, ${cantidadTotal} productos`}>
          Carrito <span className="nav__cuenta">{cantidadTotal}</span>
        </Link>
        <a className="boton" href={waVertical("MetricsField", "menú", "hablar")} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <button
          ref={boton}
          type="button"
          className="nav__menu"
          aria-expanded={abierto}
          aria-controls="cajon"
          onClick={() => setAbierto((a) => !a)}
        >
          {abierto ? "Cerrar" : "Menú"}
        </button>
      </div>
      {abierto && (
        <nav id="cajon" ref={cajon} className="nav__cajon" aria-label="Menú">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setAbierto(false)}>
              {l.texto}
            </Link>
          ))}
          <a href={waVertical("MetricsField", "menú celular", "hablar")} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)}>
            WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
}
