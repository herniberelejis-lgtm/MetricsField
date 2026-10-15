"use client";

import { useEffect, useState } from "react";
import { WHATSAPP } from "@/lib/sitio/contacto";
import { waUrl } from "@/lib/whatsapp";

// El cierre de la home: el mensaje de WhatsApp ya armado con lo que la
// persona eligió. También es la lista de espera de Loyalty e Intel, sin
// guardar nada en nuestra base: el pedido llega directo al WhatsApp.

const OPCIONES = ["Reviews", "Retail", "Loyalty", "Intel"] as const;
type Opcion = (typeof OPCIONES)[number];

const PEDIDO: Record<Opcion, string> = {
  Reviews: "quiero una demo de Reviews para mi local",
  Retail: "quiero ayuda para conectar Retail con mi cuenta de Mercado Libre",
  Loyalty: "quiero ser comercio piloto de Loyalty",
  Intel: "quiero anotarme a la lista de espera de Intel",
};

export default function PrimerPaso() {
  const [negocio, setNegocio] = useState("");
  const [opcion, setOpcion] = useState<Opcion>("Reviews");

  // Los botones "Quiero ser comercio piloto" y "Anotarme" del resto de la
  // página traen la opción ya elegida.
  useEffect(() => {
    function elegir(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-interes]");
      const v = a?.dataset.interes as Opcion | undefined;
      if (v && OPCIONES.includes(v)) setOpcion(v);
    }
    document.addEventListener("click", elegir);
    return () => document.removeEventListener("click", elegir);
  }, []);

  const texto = `Hola! ${PEDIDO[opcion]}${negocio.trim() ? `. Mi negocio: ${negocio.trim()}` : ""}. Vengo de la web (cierre).`;

  return (
    <form
      className="dialogo"
      data-ui
      action={waUrl(WHATSAPP, texto)}
      onSubmit={(e) => {
        e.preventDefault();
        window.open(waUrl(WHATSAPP, texto), "_blank", "noopener,noreferrer");
      }}
    >
      <h3>Escribinos por WhatsApp</h3>
      <div className="campo-form">
        <label htmlFor="pp-negocio">Tu negocio</label>
        <input
          id="pp-negocio"
          value={negocio}
          onChange={(e) => setNegocio(e.target.value)}
          placeholder="Ej.: Café de barrio en Nueva Córdoba"
          maxLength={120}
          autoComplete="organization"
        />
      </div>
      <fieldset className="segmento">
        <legend>Me interesa</legend>
        {OPCIONES.map((o) => (
          <label key={o}>
            <input type="radio" name="interes" value={o} checked={opcion === o} onChange={() => setOpcion(o)} />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
      <button className="boton" type="submit">
        Abrir WhatsApp con el mensaje
      </button>
    </form>
  );
}
