import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDatosTap, registrarTap } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import TapStarGate from "@/components/tap/TapStarGate";
import ActivarCartel from "@/components/tap/ActivarCartel";
import RedireccionSuave from "@/components/tap/RedireccionSuave";

export const dynamic = "force-dynamic";

// Crawlers y generadores de preview (WhatsApp, Google, etc.) abren esta URL
// sin que nadie haya tocado el cartel — no deben inflar los taps del cliente.
// Solo patrones de fetchers: "whatsapp/" es el bot de previews (el navegador
// in-app de WhatsApp con una persona real no lleva ese token en el UA), y
// "bot" ya cubre TelegramBot, Twitterbot, Googlebot, etc.
const UA_BOT = /bot|crawler|spider|preview|facebookexternalhit|whatsapp\/|slurp|curl/i;

// La URL corta que va en el cartel NFC: taply.app/t/<slug>. El comercio
// nunca cambia esta URL — el destino se administra desde el panel
// (gestor de links, Fase 1b), así que un mismo cartel físico puede pasar
// de pedir reseñas a mostrar el menú sin reimprimir nada.
export default async function TapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Una sola consulta con lo justo: link + datos mínimos del comercio.
  const datos = await getDatosTap(slug);
  if (!datos) notFound();
  const { link, comercio } = datos;

  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const esPrefetch =
    h.get("purpose") === "prefetch" || h.get("next-router-prefetch") === "1";
  // Límite generoso por IP+cartel: deja pasar tráfico real de un local
  // concurrido, pero frena un loop de curl (con UA falseado, que ya esquiva
  // el filtro de bots de arriba) inflando los taps que después le mostramos
  // al comercio y sobre los que se factura valor.
  limpiarVencidos();
  const ip = ipDelRequest(h);
  const dentroDelLimite = permitir(`tap:${ip}:${slug}`, 30, 10 * 60_000);
  if (!esPrefetch && !UA_BOT.test(userAgent) && dentroDelLimite) {
    await registrarTap(slug, userAgent || null);
  }

  if (!link.activo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-slate-500">
          Este cartel está temporalmente desactivado.
        </p>
      </div>
    );
  }

  if (link.destino !== "resena") {
    if (!link.urlDestino) notFound();
    redirect(link.urlDestino);
  }

  // Sin comercio de agencia: o es una pieza del canal Mercado Libre ya
  // activada por su comprador (va directo, sin star-gate — ver por qué en
  // lib/db.ts), o es una pieza libre que nadie activó todavía y este es el
  // primer toque: le mostramos el formulario para que se autoconfigure.
  if (!comercio) {
    if (link.autogestionado) {
      if (!link.urlDestino) notFound();
      return <RedireccionSuave url={link.urlDestino} slug={slug} />;
    }
    return <ActivarCartel slug={slug} />;
  }

  // Algunos clientes no quieren el filtro de estrellas — van derecho a la
  // reseña de Google para todo el mundo, sin desviar las malas a feedback
  // privado. Es una elección por link (lib/db.ts: usar_filtro), no algo que
  // decida Taply; el tap ya quedó contado arriba en cualquiera de los casos.
  if (!link.usarFiltro) {
    if (!comercio.googleReviewUrl) notFound();
    redirect(comercio.googleReviewUrl);
  }

  return (
    <TapStarGate
      comercioId={comercio.id}
      nombre={comercio.nombre}
      rubro={comercio.rubro}
      googleReviewUrl={comercio.googleReviewUrl}
    />
  );
}
