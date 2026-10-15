"use client";

import { useState } from "react";
import { URL_RETAIL, waVertical } from "@/lib/sitio/contacto";
import { pesos, resultadoVentaEjemplo, VENTA_EJEMPLO } from "@/lib/sitio/contenido";

// Lo que se puede hacer en el hero: elegir la puerta y ver, sobre el
// hexágono negro, el aviso que esa vertical te daría. Sin JS se ve la
// primera puerta y los botones de abajo siguen funcionando.

type Clave = "local" | "ml" | "club" | "intel";

const PUERTAS: { clave: Clave; nombre: string; estado: string }[] = [
  { clave: "local", nombre: "Tengo un local", estado: "Reviews" },
  { clave: "ml", nombre: "Vendo en Mercado Libre", estado: "Retail" },
  { clave: "club", nombre: "Quiero que vuelvan", estado: "Loyalty · piloto" },
  { clave: "intel", nombre: "Quiero decidir mejor", estado: "Intel · pronto" },
];

function Aviso({ clave }: { clave: Clave }) {
  if (clave === "local") {
    return (
      <div className="aviso" data-ui>
        <div className="aviso__cabeza">
          <span className="aviso__tipo">Nueva reseña en Google</span>
          <span className="ejemplo">Ejemplo</span>
        </div>
        <p className="aviso__linea">Alguien tocó el standee de la caja y dejó su opinión hace 2 minutos.</p>
        <p className="aviso__numero">38</p>
        <p className="aviso__pie">reseñas nuevas este mes, y sabés de qué pieza vino cada una.</p>
      </div>
    );
  }
  if (clave === "ml") {
    const r = resultadoVentaEjemplo();
    return (
      <div className="aviso" data-ui>
        <div className="aviso__cabeza">
          <span className="aviso__tipo">Nueva venta en Mercado Libre</span>
          <span className="ejemplo">Ejemplo</span>
        </div>
        <p className="aviso__linea">
          {VENTA_EJEMPLO.producto} · vendiste {pesos(VENTA_EJEMPLO.precio)}
        </p>
        <p className="aviso__numero aviso__numero--neg">{pesos(r)}</p>
        <p className="aviso__pie">es lo que te quedó después de los descuentos.</p>
        <div className="aviso__desglose">
          {VENTA_EJEMPLO.descuentos.map((d) => (
            <div key={d.concepto}>
              <span>{d.concepto}</span>
              <span>{pesos(-d.monto)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (clave === "club") {
    return (
      <div className="aviso" data-ui>
        <div className="aviso__cabeza">
          <span className="aviso__tipo">Nueva visita</span>
          <span className="ejemplo">Así se va a ver</span>
        </div>
        <p className="aviso__linea">Una clienta tocó el mismo cartel y sumó puntos en su billetera del celular.</p>
        <p className="aviso__numero">4.ª</p>
        <p className="aviso__pie">visita del mes. Ahora sabés quién vuelve.</p>
      </div>
    );
  }
  return (
    <div className="aviso" data-ui>
      <div className="aviso__cabeza">
        <span className="aviso__tipo">MetricsField Intel</span>
        <span className="ejemplo">Próximamente</span>
      </div>
      <p className="aviso__linea">Todavía no salió. Anotate y te avisamos primero.</p>
    </div>
  );
}

function Accion({ clave }: { clave: Clave }) {
  if (clave === "local") {
    return (
      <>
        <a className="boton boton--claro" href="#piezas">Ver piezas y precios</a>
        <a className="enlace" href={waVertical("Reviews", "hero", "una demo")} target="_blank" rel="noopener noreferrer">
          Pedir demo por WhatsApp
        </a>
      </>
    );
  }
  if (clave === "ml") {
    return (
      <>
        <a className="boton boton--claro" href={URL_RETAIL}>Probar 30 días gratis</a>
        <a className="enlace" href="#retail">Cómo funciona</a>
      </>
    );
  }
  if (clave === "club") {
    return (
      <a className="boton boton--claro" href="#primer-paso" data-interes="Loyalty">
        Quiero ser comercio piloto
      </a>
    );
  }
  return (
    <a className="boton boton--claro" href="#primer-paso" data-interes="Intel">
      Anotarme a la lista
    </a>
  );
}

export default function Puertas({ children }: { children: React.ReactNode }) {
  const [elegida, setElegida] = useState<Clave>("local");
  return (
    <>
      <div className="hero__texto">
      {children}
      <div className="puertas" role="tablist" aria-label="¿Qué tenés?">
        {PUERTAS.map((p) => (
          <button
            key={p.clave}
            role="tab"
            id={`puerta-${p.clave}`}
            aria-selected={elegida === p.clave}
            aria-controls="escenario-ui"
            className="puerta"
            onClick={() => setElegida(p.clave)}
          >
            <span className="puerta__hex" aria-hidden="true" />
            <span className="puerta__nombre">{p.nombre}</span>
            <span className="puerta__estado">{p.estado}</span>
          </button>
        ))}
      </div>
      </div>
      <div className="escenario">
        <div className="escenario__forma obturador" />
        <div
          id="escenario-ui"
          role="tabpanel"
          aria-labelledby={`puerta-${elegida}`}
          className="escenario__ui en-escenario"
        >
          <div key={elegida} className="cambio-entra">
            <Aviso clave={elegida} />
            <div className="escenario__accion">
              <Accion clave={elegida} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
