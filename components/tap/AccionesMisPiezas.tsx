"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dejarDeSumar, empezarASumar, guardarMisPiezasEnCuenta, olvidarPieza, salirDeCuenta } from "@/app/t/actions";
import { olvidarPiezaMia } from "@/lib/piezas-mias";
import { BOTON_PRINCIPAL, BOTON_SECUNDARIO, BRAND, INK, INK_SOFT, LINE } from "./estilo";

/** "Sumar una pieza": este navegador queda esperando un escaneo unos minutos. */
export function BotonSumar({ sumando, minutos }: { sumando: boolean; minutos: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  if (sumando) {
    return (
      <div className="rounded-xl px-4 py-3.5" style={{ background: "#eef4ff" }}>
        <p className="text-[14.5px] font-semibold" style={{ color: INK }}>
          Ahora escaneá la pieza con la cámara
        </p>
        <p className="mt-1 text-[13px] leading-snug" style={{ color: INK_SOFT }}>
          Tenés {minutos} minutos. Si ya está activada te pide su PIN; si es nueva, la activás ahí mismo. Podés sumar
          varias seguidas. Tiene que abrirse en este mismo navegador.
        </p>
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            startTransition(async () => {
              await dejarDeSumar();
              router.refresh();
            })
          }
          className={`mt-3 ${BOTON_SECUNDARIO}`}
          style={{ borderColor: LINE, color: INK, background: "#fff" }}
        >
          Listo, dejar de sumar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          await empezarASumar();
          router.refresh();
        })
      }
      className={BOTON_PRINCIPAL}
      style={{ backgroundColor: BRAND }}
    >
      {pendiente ? "Un momento…" : "Sumar una pieza"}
    </button>
  );
}

/** Sacar una pieza de este celular (la pieza no cambia). */
export function BotonQuitar({ slug, texto = "Quitar de este celular" }: { slug: string; texto?: string }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (!window.confirm("¿Sacarla de este celular? La pieza sigue funcionando igual; para volver a manejarla vas a necesitar su PIN.")) return;
        startTransition(async () => {
          await olvidarPieza(slug);
          olvidarPiezaMia(slug);
          router.refresh();
        });
      }}
      className="text-[12.5px] underline"
      style={{ color: INK_SOFT }}
    >
      {texto}
    </button>
  );
}

/** Guarda en la cuenta de Google las piezas de este celular. Al volver de
 * Google (automatico) lo hace solo, sin otro toque. */
export function GuardarEnCuenta({ automatico, cantidad }: { automatico: boolean; cantidad: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [hecho, setHecho] = useState<number | null>(null);
  const lanzado = useRef(false);

  function guardar() {
    startTransition(async () => {
      const r = await guardarMisPiezasEnCuenta();
      setHecho(r.cantidad);
      router.replace("/t/mis-piezas");
      router.refresh();
    });
  }

  useEffect(() => {
    if (automatico && !lanzado.current) {
      lanzado.current = true;
      guardar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola vez al volver de Google
  }, [automatico]);

  if (hecho !== null) {
    return (
      <p className="mt-2 text-[12.5px] font-medium" style={{ color: "#1e8e3e" }}>
        ✓ {hecho === 1 ? "1 pieza guardada" : `${hecho} piezas guardadas`} en tu cuenta.
      </p>
    );
  }
  if (automatico) {
    return (
      <p className="mt-2 text-[12.5px]" style={{ color: INK_SOFT }}>
        Guardando las piezas de este celular…
      </p>
    );
  }
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={guardar}
      className="mt-2.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
      style={{ backgroundColor: BRAND }}
    >
      {pendiente ? "Guardando…" : `Guardar ${cantidad === 1 ? "la pieza" : `las ${cantidad} piezas`} de este celular`}
    </button>
  );
}

export function BotonSalirCuenta() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          await salirDeCuenta();
          router.refresh();
        })
      }
      className="text-[12px] underline"
      style={{ color: INK_SOFT }}
    >
      Salir de esta cuenta
    </button>
  );
}
