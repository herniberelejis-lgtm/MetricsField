import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDatosTap, registrarTap } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";
import { urlSegura } from "@/lib/url";
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
  const dentroDelLimite = await permitir(`tap:${ip}:${slug}`, 30, 10 * 60_000);
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

  // Si la pieza tiene una URL propia cargada, manda ahí siempre — sin
  // importar el "Destino" elegido (incluido "Reseña de Google"). Quien
  // administra la pieza decide a qué apunta cada una; el Destino es solo
  // una etiqueta descriptiva y lo que se usa cuando NO hay URL cargada
  // (ver más abajo). Sin URL propia cargada, cae en la reseña de Google
  // del comercio — el comportamiento de siempre.
  if (link.urlDestino) {
    const url = urlSegura(link.urlDestino);
    if (!url) notFound();
    if (link.autogestionado) {
      // Deja un link visible de vuelta a /t/<slug>/editar — un redirect()
      // de servidor no renderiza nada, y es la única forma de que el
      // dueño de una pieza autogestionada (sin cuenta ni portal) vuelva a
      // editarla.
      return <RedireccionSuave url={url} slug={slug} />;
    }
    redirect(url);
  }

  // Sin URL propia y sin comercio de agencia: pieza libre que nadie activó
  // todavía — primer toque, mostrar el formulario para que se autoconfigure
  // (canal Mercado Libre).
  if (!comercio) {
    return <ActivarCartel slug={slug} />;
  }

  // Sin URL propia cargada: todo cartel va derecho a la reseña pública de
  // Google del comercio, para todo el mundo — sin pantallas intermedias.
  // El tap ya quedó contado arriba.
  const urlResena = urlSegura(comercio.googleReviewUrl);
  if (!urlResena) notFound();
  redirect(urlResena);
}
