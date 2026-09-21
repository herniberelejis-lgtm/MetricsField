import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDatosTap, getLogoActualizadoEn, registrarTap } from "@/lib/db";
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

const DESCRIPCION_RESENA = "Tu reseña nos ayuda muchísimo. Gracias por confiar en nosotros 🙏";

// generateMetadata corre en cada visita a esta ruta, haya o no un logo — el
// body de abajo (TapPage) nunca hace un redirect() de servidor, así que este
// <head> es siempre lo que termina leyendo cualquier generador de preview,
// se identifique o no como bot (ver el comentario largo en TapPage).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const datos = await getDatosTap(slug);
  const nombre = datos?.comercio?.nombre || datos?.link.nombreNegocio || undefined;
  const titulo = nombre ? `${nombre} — Dejanos tu opinión` : "Dejanos tu opinión";
  // WhatsApp cachea la miniatura por URL de imagen, para siempre y sin forma
  // de invalidarla a pedido. Si esa URL nunca cambia, un logo resubido nunca
  // se ve — sigue apuntando al mismo lugar que WhatsApp ya cacheó (incluso
  // si esa primera vez salió mal). El "?t=" con el timestamp del último
  // logo subido hace que cada logo nuevo tenga su propia URL de imagen.
  const actualizadoEn = datos?.comercio?.id
    ? await getLogoActualizadoEn(datos.comercio.id)
    : null;
  const imagenOg = actualizadoEn
    ? `/api/og-resena/${slug}?t=${actualizadoEn}`
    : `/api/og-resena/${slug}`;
  return {
    title: titulo,
    description: DESCRIPCION_RESENA,
    openGraph: {
      title: titulo,
      description: DESCRIPCION_RESENA,
      // Ruta dinámica en vez del PNG estático: usa el logo real del comercio
      // si lo cargó desde /admin (ver app/api/og-resena/[slug]), y cae sola
      // en el genérico de MetricsField si no.
      images: [imagenOg],
    },
  };
}

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
  const esCrawler = UA_BOT.test(userAgent);
  const esPrefetch =
    h.get("purpose") === "prefetch" || h.get("next-router-prefetch") === "1";
  // Límite generoso por IP+cartel: deja pasar tráfico real de un local
  // concurrido, pero frena un loop de curl (con UA falseado, que ya esquiva
  // el filtro de bots de arriba) inflando los taps que después le mostramos
  // al comercio y sobre los que se factura valor.
  limpiarVencidos();
  const ip = ipDelRequest(h);
  const dentroDelLimite = await permitir(`tap:${ip}:${slug}`, 30, 10 * 60_000);
  if (!esPrefetch && !esCrawler && dentroDelLimite) {
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

  // Nunca un redirect() de servidor de acá para abajo: un 3xx no tiene body
  // que un generador de preview pueda leer, y UA_BOT (de arriba) no cubre
  // todos los casos — WhatsApp Web/Desktop pide este link con un User-Agent
  // de navegador común, indistinguible de una persona real, así que "esCrawler"
  // daría false y un redirect() lo mandaría derecho al destino sin que nadie
  // viera jamás el <head> con la miniatura. RedireccionSuave sirve siempre
  // 200 con la metadata ya puesta (generateMetadata arriba) y hace el salto
  // real en el cliente con location.replace() — imperceptible para una
  // persona, y para cualquier bot (no ejecuta JS) el body que lee ya trae
  // todo lo necesario.

  // Si la pieza tiene una URL propia cargada, manda ahí siempre — sin
  // importar el "Destino" elegido (incluido "Reseña de Google"). Quien
  // administra la pieza decide a qué apunta cada una; el Destino es solo
  // una etiqueta descriptiva y lo que se usa cuando NO hay URL cargada
  // (ver más abajo). Sin URL propia cargada, cae en la reseña de Google
  // del comercio — el comportamiento de siempre.
  if (link.urlDestino) {
    const url = urlSegura(link.urlDestino);
    if (!url) notFound();
    // El link de vuelta a /t/<slug>/editar solo tiene sentido en una pieza
    // autogestionada (sin cuenta ni portal) — es la única forma de que su
    // dueño vuelva a editarla.
    return (
      <RedireccionSuave url={url} editarHref={link.autogestionado ? `/t/${slug}/editar` : undefined} />
    );
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
  return <RedireccionSuave url={urlResena} />;
}
