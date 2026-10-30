import type { Metadata } from "next";
import { headers } from "next/headers";
import { codigosDeCuenta, cuentasDePiezasDisponibles, getPiezasDelLlavero } from "@/lib/db";
import { cuentaActual } from "@/lib/cuenta-piezas";
import { estadosDePiezas } from "@/lib/revision-piezas";
import { TEXTO_ESTADO } from "@/lib/revision-piezas-core";
import { oauthConfigurado } from "@/lib/google-oauth";
import { firmaVerificable, leerPiezasDelLlavero, modoSumarActivo, MINUTOS_SUMAR } from "@/lib/llavero";
import { esNavegadorInterno } from "@/lib/llavero-core";
import { BotonEnBlanco, BotonQuitar, BotonSalirCuenta, BotonSumar, GuardarEnCuenta } from "@/components/tap/AccionesMisPiezas";
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
export default async function MisPiezasPage({
  searchParams,
}: {
  searchParams: Promise<{ vincular?: string; cuenta?: string }>;
}) {
  const { vincular, cuenta: avisoCuenta } = await searchParams;
  const llavero = await leerPiezasDelLlavero();
  const email = await cuentaActual();
  const deCuenta = email ? ((await codigosDeCuenta(email)) ?? []) : [];
  const enCuenta = new Set(deCuenta);
  // Las del celular (las más recientes primero) y después las de la cuenta.
  const codigos = [...new Set([...[...llavero.keys()].reverse(), ...deCuenta])];
  const piezas = new Map((await getPiezasDelLlavero(codigos)).map((p) => [p.id, p]));
  const sumando = await modoSumarActivo();
  const estados = codigos.length ? await estadosDePiezas() : new Map();
  const h = await headers();
  const interno = esNavegadorInterno(h.get("user-agent") ?? "");
  // Google siempre vuelve al dominio canónico (el redirect_uri registrado):
  // ofrecerlo en otro host (una preview) dejaría la sesión en un dominio y
  // las piezas en otro.
  const canonico = process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host : h.get("host");
  const conGoogle = oauthConfigurado() && h.get("host") === canonico && (await cuentasDePiezasDisponibles());

  const validas = [];
  const vencidas = [];
  let sinGuardar = 0;
  for (const codigo of codigos) {
    const p = piezas.get(codigo);
    const porCelular = Boolean(p && llavero.has(codigo) && firmaVerificable(codigo, p.salPin, llavero.get(codigo) ?? ""));
    if (p && (porCelular || enCuenta.has(codigo))) {
      validas.push(p);
      if (email && !enCuenta.has(codigo)) sinGuardar++;
    } else if (llavero.has(codigo)) vencidas.push(codigo);
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
            {validas.length === 1 ? "1 pieza." : `${validas.length} piezas.`}{" "}
            Cambialas sin PIN, las veces que quieras.
          </p>
        </div>

        {conGoogle && (
          <div className="mt-5 rounded-xl px-4 py-3.5" style={{ background: email ? "#e6f4ea" : "#f1f5fb" }}>
            {email ? (
              <>
                <p className="text-[13px]" style={{ color: INK }}>
                  Guardadas en tu cuenta de Google <b className="break-all">{email}</b>
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: INK_SOFT }}>
                  Desde cualquier celular, entrás con Google y las tenés todas.
                </p>
                {(sinGuardar > 0 || vincular) && <GuardarEnCuenta automatico={Boolean(vincular)} cantidad={sinGuardar} />}
                <div className="mt-1.5">
                  <BotonSalirCuenta />
                </div>
              </>
            ) : (
              <>
                <p className="text-[14px] font-medium" style={{ color: INK }}>
                  Guardalas en tu cuenta de Google
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: INK_SOFT }}>
                  Si perdés o cambiás el celular, entrás con Google y las recuperás todas, sin PIN.
                </p>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- va a Google: navegación completa, no del router */}
                <a
                  href="/t/cuenta/google"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border bg-white px-5 py-3 text-[14.5px] font-medium"
                  style={{ borderColor: LINE, color: INK }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.2-3.9 7.1-9.6 7.1-16.9z" />
                    <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
                  </svg>
                  Guardar con Google
                </a>
              </>
            )}
            {avisoCuenta === "error" && (
              <p className="mt-2 text-[12.5px]" style={{ color: "#c5221f" }}>
                No pudimos entrar con Google. Probá de nuevo.
              </p>
            )}
          </div>
        )}

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
                {estados.get(p.id) && estados.get(p.id).estado !== "ok" && (
                  <p className="mt-2 rounded-lg px-3 py-2 text-[12.5px] leading-snug" style={{ background: "#fff8e6", color: "#7a5200" }}>
                    <b>Revisala:</b> {TEXTO_ESTADO[estados.get(p.id).estado as keyof typeof TEXTO_ESTADO]}. Si el negocio cambió de
                    ficha, tocá Cambiar y elegilo de nuevo.
                  </p>
                )}
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
                <div className="mt-2.5 flex items-baseline justify-between gap-3">
                  <BotonQuitar slug={p.id} />
                  <span className="text-right">
                    <BotonEnBlanco slug={p.id} nombre={p.nombreNegocio} />
                  </span>
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
