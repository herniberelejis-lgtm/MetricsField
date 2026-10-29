"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dejarDeSumar, empezarASumar, olvidarPieza } from "@/app/t/actions";
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
