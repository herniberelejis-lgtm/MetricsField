import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPiezasDelLlavero } from "@/lib/db";
import { firmaVerificable, leerPiezasDelLlavero, modoSumarActivo, MINUTOS_SUMAR } from "@/lib/llavero";
import { esNavegadorInterno } from "@/lib/llavero-core";
import { BotonQuitar, BotonSumar } from "@/components/tap/AccionesMisPiezas";
import AvisoNavegadorInterno from "@/components/tap/AvisoNavegadorInterno";
import { BRAND, FONDO, INK, INK_SOFT, LINE, SOMBRA, TARJETA } from "@/components/tap/estilo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mis piezas · MetricsField",
  robots: { index: false, follow: false },
};

// Todas las piezas que maneja este celular (llavero, lib/llavero.ts), con
// lo que hace falta para cada una: cambiarla y entregarla. Sin cuenta ni
// login: lo que dice la cookie se verifica contra el PIN actual de cada
// pieza, y las que ya no valen (cambió el PIN, se entregó, pasó a un
// cliente) se muestran aparte en vez de desaparecer en silencio.
export default async function MisPiezasPage() {
  const llavero = await leerPiezasDelLlavero();
  const codigos = [...llavero.keys()];
  const piezas = new Map((await getPiezasDelLlavero(codigos)).map((p) => [p.id, p]));
  const sumando = await modoSumarActivo();
  const interno = esNavegadorInterno((await headers()).get("user-agent") ?? "");

  const validas = [];
  const vencidas = [];
  // Las más recientes primero.
  for (const codigo of codigos.reverse()) {
    const p = piezas.get(codigo);
    if (p && firmaVerificable(codigo, p.salPin, llavero.get(codigo) ?? "")) validas.push(p);
    else vencidas.push(codigo);
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 px-4 py-8" style={{ background: FONDO }}>
      {interno && <AvisoNavegadorInterno />}
      <div className={TARJETA} style={SOMBRA}>
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
            MetricsField
          </div>
          <h1 className="mt-1 text-[22px] font-semibold" style={{ color: INK }}>
            Mis piezas
          </h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK_SOFT }}>
            {validas.length === 1
              ? "1 pieza en este celular."
              : `${validas.length} piezas en este celular.`}{" "}
            Cambialas sin PIN, las veces que quieras.
          </p>
        </div>

        <div className="mt-5">
          <BotonSumar sumando={sumando} minutos={MINUTOS_SUMAR} />
        </div>

        {validas.length === 0 && !sumando && (
          <p className="mt-5 text-[13.5px] leading-snug" style={{ color: INK_SOFT }}>
            Todavía no hay piezas en este celular. Una pieza nueva se suma sola cuando la activás escaneándola. Para
            una que ya está activada, tocá <b>Sumar una pieza</b> y escaneala: te pide su PIN una sola vez.
          </p>
        )}

        {validas.length > 0 && (
          <ul className="mt-5 space-y-3">
            {validas.map((p) => (
              <li key={p.id} className="rounded-xl border px-4 py-3.5" style={{ borderColor: LINE }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-semibold leading-tight" style={{ color: INK }}>
                      {p.nombreNegocio || "Sin nombre"}
                    </p>
                    <p className="mt-0.5 text-[12px]" style={{ color: INK_SOFT }}>
                      {p.activo ? `${p.toques7d} ${p.toques7d === 1 ? "toque" : "toques"} esta semana` : "Desactivada"} ·{" "}
                      <span className="font-mono">{p.id}</span>
                    </p>
                  </div>
                  {p.urlDestino && (
                    <a href={p.urlDestino} className="shrink-0 text-[12.5px] underline" style={{ color: INK_SOFT }}>
                      Probar
                    </a>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`/t/${p.id}/editar`}
                    className="flex-1 rounded-full px-4 py-2.5 text-center text-[14px] font-semibold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    Cambiar
                  </a>
                  <a
                    href={`/t/${p.id}/entregar`}
                    className="flex-1 rounded-full border px-4 py-2.5 text-center text-[14px] font-medium"
                    style={{ borderColor: LINE, color: INK }}
                  >
                    Entregar
                  </a>
                </div>
                <div className="mt-2 text-right">
                  <BotonQuitar slug={p.id} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {vencidas.length > 0 && (
          <div className="mt-6">
            <p className="text-[13px] font-medium" style={{ color: INK }}>
              Ya no las manejás desde este celular
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: INK_SOFT }}>
              Les cambiaron el PIN, se entregaron o pasaron a otro dueño.
            </p>
            <ul className="mt-2 space-y-2">
              {vencidas.map((codigo) => (
                <li key={codigo} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "#f1f5fb" }}>
                  <span className="font-mono text-[12.5px]" style={{ color: INK }}>
                    {codigo}
                  </span>
                  <span className="flex gap-3">
                    <a href={`/t/${codigo}/editar`} className="text-[12.5px] underline" style={{ color: BRAND }}>
                      Sumar con PIN
                    </a>
                    <BotonQuitar slug={codigo} texto="Quitar" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="max-w-md px-2 text-center text-[12px] leading-snug" style={{ color: INK_SOFT }}>
        Guardá esta página en favoritos para volver rápido. También llegás escaneando cualquiera de tus piezas con este
        celular.
      </p>
    </div>
  );
}
