import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";
import { hashearIp } from "@/lib/loyalty-antifraude";
import { COOKIE_CLIENTE_FINAL, leerCookieClienteFinal, tokenVisitaValido } from "@/lib/loyalty-firma";
import {
  appleWalletConfigurado,
  comercioConLoyalty,
  emitirTarjetaGoogle,
  loyaltyHabilitado,
  origenLoyalty,
  reflejarSaldoEnWallet,
  walletGoogleConfigurado,
} from "@/lib/loyalty";
import {
  acreditarVisita,
  calcularSaldo,
  getBeneficios,
  getCanjePendiente,
  getClienteFinal,
  getComercioLoyalty,
  getMembresia,
  getMisiones,
  getMisionesCumplidas,
  registrarEventoLoyalty,
} from "@/lib/db/loyalty";
import { urlSegura } from "@/lib/url";
import { accionDarseDeBaja } from "./actions";
import {
  BotonCanjear,
  BotonMision,
  CompartirReferido,
  CuentaRegresiva,
  FormularioRegistro,
  FormularioUnirse,
} from "./_componentes";

export const dynamic = "force-dynamic";

// Nada de esto se indexa: es la tarjeta personal de cada cliente.
export const metadata: Metadata = { title: "Tu tarjeta de puntos", robots: { index: false, follow: false } };

const TEXTO_MISION = { resena_google: "Opinar en Google", seguir_redes: "Seguir", referido: "Invitar" } as const;
const DESCRIPCION_MISION = {
  // Premia el acto de opinar, nunca la calificación: mismo link público de
  // Google para todos, sin filtro por estrellas (ver CLAUDE.md, star-gate).
  resena_google: "Dejá tu opinión en Google, la que sea.",
  seguir_redes: "Seguinos en redes.",
  referido: "Invitá a un amigo: sumás cuando se registra.",
} as const;

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">{children}</div>
    </main>
  );
}

function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.18)] ${className}`}>
      {children}
    </section>
  );
}

export default async function LoyaltyLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ v?: string; ref?: string; bienvenida?: string; baja?: string; wallet?: string }>;
}) {
  const { codigo } = await params;
  const sp = await searchParams;

  const h = await headers();
  limpiarVencidos();
  const ip = ipDelRequest(h);
  if (!(await permitir(`loyalty-landing:${ip}`, 60, 10 * 60_000))) notFound();

  const ctx = await comercioConLoyalty(codigo);
  const clienteFinalId = leerCookieClienteFinal((await cookies()).get(COOKIE_CLIENTE_FINAL)?.value);
  if (!ctx) {
    // Club apagado, pausado o cuenta en baja: nada de puntos ni canjes, pero
    // quien tenía tarjeta acá igual puede borrar sus datos (derecho de supresión).
    // Sin sesión de socio de ESTE local, la respuesta no depende de si el
    // comercio existe (nada para enumerar ids): confirmación genérica de la
    // baja o 404.
    const local = loyaltyHabilitado() && clienteFinalId ? await getComercioLoyalty(codigo) : null;
    const socio = local && clienteFinalId ? await getMembresia(clienteFinalId, local.id) : null;
    if (!local || !socio) {
      if (!sp.baja) notFound();
      return (
        <Pantalla>
          <Tarjeta>
            <p className="text-sm text-slate-600">Listo: borramos tu tarjeta y tus datos de este local.</p>
          </Tarjeta>
        </Pantalla>
      );
    }
    return (
      <Pantalla>
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Club de beneficios</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{local.nombre}</h1>
        </header>
        <Tarjeta>
          <p className="text-sm text-slate-600">Este club de beneficios no está disponible por ahora.</p>
          <form action={accionDarseDeBaja} className="mt-4">
            <input type="hidden" name="comercioId" value={local.id} />
            <button type="submit" className="text-sm text-slate-500 underline underline-offset-2">
              Borrar mi tarjeta y mis datos de este local
            </button>
          </form>
        </Tarjeta>
      </Pantalla>
    );
  }
  const { comercio, programa } = ctx;

  const persona = clienteFinalId ? await getClienteFinal(clienteFinalId) : null;
  const membresia = persona ? await getMembresia(persona.id, comercio.id) : null;

  const encabezado = (
    <header className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Club de beneficios</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{comercio.nombre}</h1>
    </header>
  );

  // ---------- Sin tarjeta en este comercio ----------
  if (!persona || !membresia) {
    return (
      <Pantalla>
        {encabezado}
        {sp.baja && (
          <Tarjeta>
            <p className="text-sm text-slate-600">Listo: borramos tu tarjeta y tus datos de {comercio.nombre}.</p>
          </Tarjeta>
        )}
        <Tarjeta>
          <p className="text-lg font-semibold text-slate-900">
            Sumá puntos en cada visita
            {programa.puntosBienvenida > 0 && ` y arrancá con ${programa.puntosBienvenida} de regalo`}.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {appleWalletConfigurado()
              ? "Tu tarjeta queda en la billetera de tu celular (Google Wallet o Apple Wallet): no tenés que bajar ninguna app."
              : "Tu tarjeta queda en Google Wallet: no tenés que bajar ninguna app."}
          </p>
          <div className="mt-5">
            {persona ? (
              <FormularioUnirse comercioId={comercio.id} nombreComercio={comercio.nombre} />
            ) : (
              <FormularioRegistro
                comercioId={comercio.id}
                nombreComercio={comercio.nombre}
                referido={(sp.ref ?? "").slice(0, 80)}
              />
            )}
          </div>
        </Tarjeta>
      </Pantalla>
    );
  }

  // ---------- Socio: visita, saldo, beneficios, misiones ----------
  // La visita solo suma si llegó desde un tap real (token firmado de
  // /t/<slug>, 15 min) y no hubo otra en las últimas 20 h.
  let aviso: { texto: string; tono: "ok" | "info" } | null = null;
  if (sp.bienvenida) {
    aviso = { texto: "¡Listo! Ya tenés tu tarjeta. Guardala en la billetera de tu celular para tenerla siempre a mano.", tono: "ok" };
  }
  if (tokenVisitaValido(sp.v, comercio.id)) {
    const visita = await acreditarVisita(membresia.id, programa.puntosPorVisita);
    await registrarEventoLoyalty({
      comercioId: comercio.id,
      clienteFinalId: persona.id,
      tipo: visita.aplicado ? "tap" : "cooldown_bloqueado",
      ipHash: hashearIp(ip),
    });
    if (visita.aplicado) {
      await reflejarSaldoEnWallet(membresia, visita.saldo);
      aviso = { texto: `¡Sumaste ${programa.puntosPorVisita} puntos por tu visita!`, tono: "ok" };
    } else if (!sp.bienvenida) {
      aviso = { texto: "Tu visita de hoy ya está sumada. ¡Te esperamos la próxima!", tono: "info" };
    }
  }
  if (sp.wallet === "error") {
    aviso = { texto: "No pudimos agregar la tarjeta a tu billetera. Probá de nuevo en un rato: tus puntos están a salvo.", tono: "info" };
  }

  const saldo = await calcularSaldo(membresia.id);
  // Reintento barato: si Google falló al emitir, cada visita a la página lo
  // vuelve a intentar (la base ya tiene los puntos).
  if (membresia.estadoGoogle === "error" && walletGoogleConfigurado()) {
    await emitirTarjetaGoogle({ comercio, programa, membresia, nombreCliente: persona.nombre, saldo, origen: await origenLoyalty() });
  }

  const [beneficios, misiones, cumplidas, canje] = await Promise.all([
    getBeneficios(comercio.id, true),
    getMisiones(comercio.id, true),
    getMisionesCumplidas(membresia.id),
    getCanjePendiente(membresia.id),
  ]);
  const esIphone = /iPhone|iPad|iPod/i.test(h.get("user-agent") ?? "");
  const origen = await origenLoyalty();
  const urlResena = urlSegura(comercio.googleReviewUrl);

  return (
    <Pantalla>
      {encabezado}

      {aviso && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm ${aviso.tono === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-slate-200/70 text-slate-700"}`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="rounded-3xl bg-[#10131a] p-6 text-white shadow-lg">
        <p className="text-sm text-white/60">{persona.nombre}</p>
        <p className="mt-3 text-5xl font-bold tabular-nums">{saldo}</p>
        <p className="text-sm text-white/60">puntos</p>
        <p className="mt-4 text-xs text-white/50">
          +{programa.puntosPorVisita} por cada visita · tocá el cartel del local con tu celular
        </p>
      </section>

      {walletGoogleConfigurado() && !esIphone && (
        <a
          href={`/l/${encodeURIComponent(comercio.id)}/google`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3.5 text-base font-semibold text-white"
        >
          Guardar en Google Wallet
        </a>
      )}
      {esIphone && appleWalletConfigurado() && (
        <a
          href={`/l/${encodeURIComponent(comercio.id)}/apple`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3.5 text-base font-semibold text-white"
        >
          Agregar a Apple Wallet
        </a>
      )}
      {esIphone && !appleWalletConfigurado() && (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-center text-sm text-slate-500">
          Apple Wallet llega pronto. Mientras tanto, guardá esta página en favoritos: es tu tarjeta.
        </p>
      )}

      {canje && (
        <Tarjeta className="text-center">
          <p className="text-sm text-slate-500">Mostrale este código en caja para canjear</p>
          <p className="mt-1 font-semibold text-slate-900">{canje.beneficio}</p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-slate-900">{canje.codigo}</p>
          <p className="mt-2 text-xs text-slate-500">
            <CuentaRegresiva hasta={canje.expiraEn} /> · los puntos se descuentan cuando el local lo valida
          </p>
        </Tarjeta>
      )}

      {beneficios.length > 0 && (
        <Tarjeta>
          <h2 className="text-sm font-semibold text-slate-900">Beneficios</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {beneficios.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{b.nombre}</p>
                  <p className="text-xs text-slate-500">{b.costoPuntos} puntos</p>
                </div>
                <BotonCanjear comercioId={comercio.id} beneficioId={b.id} alcanza={saldo >= b.costoPuntos} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {misiones.length > 0 && (
        <Tarjeta>
          <h2 className="text-sm font-semibold text-slate-900">Sumá más puntos</h2>
          <ul className="mt-3 space-y-4">
            {misiones.map((m) => {
              if (m.tipo === "referido") {
                return (
                  <li key={m.id} className="space-y-2">
                    <p className="text-sm text-slate-700">{DESCRIPCION_MISION.referido}</p>
                    <CompartirReferido
                      link={`${origen}/l/${encodeURIComponent(comercio.id)}?ref=${encodeURIComponent(membresia.id)}`}
                      nombreComercio={comercio.nombre}
                      puntos={m.puntos}
                    />
                  </li>
                );
              }
              const url = m.tipo === "resena_google" ? urlResena : urlSegura(m.url);
              if (!url) return null;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700">{DESCRIPCION_MISION[m.tipo]}</p>
                  <BotonMision
                    comercioId={comercio.id}
                    misionId={m.id}
                    url={url}
                    texto={TEXTO_MISION[m.tipo]}
                    puntos={m.puntos}
                    cumplida={cumplidas.has(m.id)}
                  />
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}

      <footer className="space-y-2 pt-4 text-center text-xs text-slate-400">
        <p>
          <a href="/privacy#loyalty" className="underline underline-offset-2">
            Privacidad
          </a>
        </p>
        <form action={accionDarseDeBaja}>
          <input type="hidden" name="comercioId" value={comercio.id} />
          <button type="submit" className="underline underline-offset-2">
            Borrar mi tarjeta y mis datos de este local
          </button>
        </form>
      </footer>
    </Pantalla>
  );
}
