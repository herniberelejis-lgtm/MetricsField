// Ayuda debajo del formulario de activación (fuera de la tarjeta, para no
// ensuciarla): tres desplegables cerrados con el mismo estilo que "¿Cómo
// consigo el link?". Son <details>: abren sin JavaScript y los videos
// (preload="none") no se descargan hasta que alguien les da play, así la
// página abre rápido con datos móviles.

import { waUrl } from "@/lib/whatsapp";
import {
  MENSAJE_PRUEBA,
  MENSAJE_SOPORTE,
  VIDEO_NFC,
  VIDEO_QR,
  VIDEO_QR_MANUAL,
  WHATSAPP_SOPORTE,
  type VideoOnboarding,
} from "@/lib/onboarding";
import { ConsejosNfc, CopiarLinkPieza } from "./GrabarChip";

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";
const BRAND = "#2563eb";
const VERDE_WA = "#1a8d48";

function Globo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="w-full max-w-md rounded-xl px-4 py-3.5 text-[13.5px]" style={{ background: "#f1f5fb", color: INK_SOFT }}>
      <summary className="cursor-pointer py-0.5 text-[15px] font-medium" style={{ color: INK }}>
        {titulo}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Video({ video, subtitulo }: { video: VideoOnboarding; subtitulo: string }) {
  return (
    <figure>
      <figcaption className="mb-1.5 text-[14px] font-medium" style={{ color: INK }}>
        {subtitulo} <span className="font-normal" style={{ color: INK_SOFT }}>({video.duracion})</span>
      </figcaption>
      <video
        src={video.src}
        poster={video.portada}
        controls
        playsInline
        preload="none"
        className="w-full rounded-xl bg-black"
        style={{ aspectRatio: video.aspecto }}
        aria-label={`Video: ${video.titulo}`}
      />
    </figure>
  );
}

function Pasos({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {items.map((p, i) => (
        <li key={i} className="flex gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: BRAND }}
          >
            {i + 1}
          </span>
          <span className="leading-snug">{p}</span>
        </li>
      ))}
    </ol>
  );
}

function BotonWhatsapp({ mensaje, children }: { mensaje: string; children: React.ReactNode }) {
  return (
    <a
      href={waUrl(WHATSAPP_SOPORTE, mensaje)}
      target="_blank"
      rel="noopener"
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: VERDE_WA }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.21-4.24 9.45-9.44 9.45zm8.05-17.5A11.32 11.32 0 0 0 12.04.66C5.77.66.66 5.76.66 12.04c0 2 .52 3.96 1.52 5.69L.57 23.34l5.75-1.51a11.35 11.35 0 0 0 5.71 1.46h.01c6.27 0 11.38-5.1 11.38-11.38 0-3.04-1.18-5.9-3.33-8.05z" />
      </svg>
      {children}
    </a>
  );
}

export default function AyudaActivacion({ slug }: { slug: string }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Globo titulo="¿Cómo activo mi cartel?">
        <div className="space-y-5">
          {VIDEO_QR && <Video video={VIDEO_QR} subtitulo="Activar con código QR" />}
          {VIDEO_NFC && <Video video={VIDEO_NFC} subtitulo="Activar con NFC" />}
        </div>

        <h3 className="mt-5 text-[14px] font-semibold" style={{ color: INK }}>
          Con QR (sin descargar nada)
        </h3>
        <Pasos
          items={[
            <>Escaneá el QR de tu cartel con la cámara: se abre esta página.</>,
            <>
              En <b>Buscá tu negocio</b>, escribí el nombre, tocá <b>Buscar</b> y elegí el tuyo. El link de reseña lo trae
              Google solo.
            </>,
            <>Elegí un PIN de 4 números (anotalo: sirve para cambiar algo más adelante).</>,
            <>
              Tocá <b>Activar mi pieza</b>. ¡Listo! Escaneá de nuevo para probarlo.
            </>,
          ]}
        />

        <div className="mt-4 rounded-lg bg-white px-3.5 py-3">
          <p className="font-medium" style={{ color: INK }}>
            ¿Tu negocio no aparece en la búsqueda?
          </p>
          <p className="mt-1 leading-snug">Pegá el link de tu reseña a mano:</p>
          <Pasos
            items={[
              <>
                En Google, con la cuenta que administra tu negocio, buscá <b>my business</b> y entrá a tu perfil.
              </>,
              <>
                Tocá <b>Pedir una reseña</b> (en algunas versiones dice <b>Solicita opiniones</b>) y copiá el link. Empieza
                con <span className="font-mono">g.page/r/</span>.
              </>,
              <>
                En el formulario tocá <b>¿No aparece? Pegá el link de tu reseña a mano</b>, completá el nombre y pegá el
                link.
              </>,
            ]}
          />
          {VIDEO_QR_MANUAL && (
            <details className="mt-3">
              <summary className="cursor-pointer font-medium" style={{ color: BRAND }}>
                Ver el video ({VIDEO_QR_MANUAL.duracion})
              </summary>
              <video
                src={VIDEO_QR_MANUAL.src}
                poster={VIDEO_QR_MANUAL.portada}
                controls
                playsInline
                preload="none"
                className="mt-2 w-full rounded-xl bg-black"
                style={{ aspectRatio: VIDEO_QR_MANUAL.aspecto }}
                aria-label={`Video: ${VIDEO_QR_MANUAL.titulo}`}
              />
            </details>
          )}
        </div>

        <h3 className="mt-5 text-[14px] font-semibold" style={{ color: INK }}>
          Con NFC
        </h3>
        <Pasos
          items={[
            <>
              Copiá el link de tu pieza (abajo). También podés usar el link de reseñas de Google, como en los pasos 1 y 2
              de arriba, pero esos toques no se cuentan en el aviso semanal.
            </>,
            <>
              Descargá la app gratis <b>NFC Tools</b> (Play Store / App Store).
            </>,
            <>
              Tocá <b>Escribir</b> → <b>Añadir un registro</b> → <b>URL/URI</b>, pegá el link y confirmá.
            </>,
            <>
              Tocá <b>Escribir</b> y apoyá el celular sobre el sticker hasta que aparezca “listo”.
            </>,
          ]}
        />
        <CopiarLinkPieza
          slug={slug}
          nota="Así el QR y el chip van al mismo lugar, te contamos cuántas personas lo usan y, si algún día cambiás algo, no hay que volver a grabarlo."
        />
        <ConsejosNfc />
      </Globo>

      <Globo titulo="¿Necesitás ayuda?">
        <p className="leading-snug">Si tenés cualquier duda o problema para activar tu cartel, escribinos y te ayudamos.</p>
        <BotonWhatsapp mensaje={MENSAJE_SOPORTE}>Hablar con soporte</BotonWhatsapp>
      </Globo>

      <Globo titulo="Probá MetricsField gratis 15 días">
        <p className="leading-snug">
          ¿Querés gestionar las reseñas de tu negocio? Pedí una demo gratuita de nuestro software por 15 días.
        </p>
        <BotonWhatsapp mensaje={MENSAJE_PRUEBA}>Quiero mi prueba gratis</BotonWhatsapp>
      </Globo>
    </div>
  );
}
