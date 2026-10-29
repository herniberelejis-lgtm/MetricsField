import Link from "next/link";
import { BOTON_PRINCIPAL, BOTON_SECUNDARIO, BRAND, FONDO, INK, INK_SOFT, LINE, SOMBRA, TARJETA } from "./estilo";

// Lo que ve quien maneja la pieza (llavero válido) cuando la escanea: en vez
// de saltar a Google, elige qué hacer. El resto de los celulares sigue yendo
// directo a la reseña. Se arma en el servidor (no depende de JavaScript) y
// este escaneo no cuenta como toque.
export default function PantallaDuenio({ slug, nombre, url }: { slug: string; nombre: string; url: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8" style={{ background: FONDO }}>
      <div className={`${TARJETA} text-center`} style={SOMBRA}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
          MetricsField
        </div>
        <h1 className="mt-1 text-[20px] font-semibold" style={{ color: INK }}>
          Esta pieza la manejás vos
        </h1>
        <p className="mt-1.5 text-[14px]" style={{ color: INK_SOFT }}>
          Hoy lleva a dejar una reseña a <b style={{ color: INK }}>{nombre || "tu negocio"}</b>.
        </p>

        <a href={`/t/${slug}/editar`} className={`mt-6 ${BOTON_PRINCIPAL}`} style={{ backgroundColor: BRAND }}>
          Cambiar a dónde lleva
        </a>
        <a href={url} className={`mt-2.5 ${BOTON_SECUNDARIO}`} style={{ borderColor: LINE, color: INK }}>
          Ir a la reseña (como un cliente)
        </a>
        <a href={`/t/${slug}/entregar`} className={`mt-2.5 ${BOTON_SECUNDARIO}`} style={{ borderColor: LINE, color: INK }}>
          Entregársela a otro negocio
        </a>

        <Link href="/t/mis-piezas" className="mt-5 inline-block text-[14px] font-medium underline" style={{ color: BRAND }}>
          Ver todas mis piezas
        </Link>
        <p className="mt-4 text-[12px] leading-snug" style={{ color: INK_SOFT }}>
          Esto lo ves solo en este celular, que la puede cambiar sin PIN. Tus clientes van directo a Google.
        </p>
      </div>
    </div>
  );
}
