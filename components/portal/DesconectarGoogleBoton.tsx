"use client";

import { accionDesconectarGoogleComercioPortal } from "@/app/portal/actions";
import { btnGhost } from "@/components/ui";

export default function DesconectarGoogleBoton({
  codigo,
  comercioId,
}: {
  codigo: string;
  comercioId: string;
}) {
  return (
    <form
      action={accionDesconectarGoogleComercioPortal}
      onSubmit={(e) => {
        const ok = window.confirm(
          "¿Desconectar tu cuenta de Google? Vas a dejar de ver visitas, llamadas y reseñas automáticas hasta que la conectes de nuevo.",
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="codigo" value={codigo} />
      <input type="hidden" name="comercioId" value={comercioId} />
      <button type="submit" className={`${btnGhost} text-rose-500 hover:text-rose-700`}>
        Desconectar
      </button>
    </form>
  );
}
