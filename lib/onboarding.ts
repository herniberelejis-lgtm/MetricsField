// Contenido del onboarding de las piezas que se venden sueltas (Mercado
// Libre): los videos de cómo se activa y cómo se usa cada pieza. Lo usan la
// pantalla de activación (/t/<id>) y el instructivo en PDF.
//
// La pieza tiene dos cosas que se configuran por separado:
// - el QR impreso, que siempre lleva a /t/<id>: se activa en nuestra página;
// - el chip NFC, que viene vacío: se graba con la app gratis NFC Tools.

export interface VideoOnboarding {
  src: string;
  portada: string;
  titulo: string;
  duracion: string;
  /** Ancho / alto del video, para reservarle el lugar justo antes de cargarlo. */
  aspecto: string;
}

/** Cómo activar el QR en MetricsField (grabado de la app real). */
export const VIDEO_QR: VideoOnboarding | null = {
  src: "/tap/videos/activar-qr.mp4",
  portada: "/tap/videos/activar-qr-portada.jpg",
  titulo: "Cómo activar el QR",
  duracion: "35 s",
  aspecto: "540 / 1170",
};

/** Plan B del QR: pegar a mano el link de reseña (video del equipo). Sirve
 * cuando el negocio no aparece en la búsqueda. */
export const VIDEO_QR_MANUAL: VideoOnboarding | null = {
  src: "/tap/videos/activar-qr-manual.mp4",
  portada: "/tap/videos/activar-qr-manual-portada.jpg",
  titulo: "Cómo pegar el link de reseña a mano",
  duracion: "1 min 20 s",
  aspecto: "9 / 16",
};

/** Cómo grabar el chip NFC con NFC Tools (video del equipo). */
export const VIDEO_NFC: VideoOnboarding | null = {
  src: "/tap/videos/activar-nfc.mp4",
  portada: "/tap/videos/activar-nfc-portada.jpg",
  titulo: "Cómo grabar el chip NFC",
  duracion: "50 s",
  aspecto: "9 / 16",
};

/** WhatsApp de soporte para quien activa una pieza (solo dígitos, como lo
 * pide wa.me). Es otro número que NEXT_PUBLIC_WHATSAPP_NUMBER (la agencia):
 * cambialo acá y cambia en toda la página de activación. */
export const WHATSAPP_SOPORTE = "5493518578949";
export const MENSAJE_SOPORTE = "Hola, necesito ayuda para activar mi cartel de MetricsField.";
export const MENSAJE_PRUEBA = "Hola, quiero probar por 15 días gratis su software de MetricsField.";

export const USOS_PIEZAS = [
  {
    pieza: "Standee de mostrador",
    foto: "/landing/assets/img/productos/standee-480.webp",
    donde: "En la caja, a la vista.",
    como: "Cuando cobrás: “¿Nos dejás una reseña? Acercá el celu acá”.",
  },
  {
    pieza: "Tarjeta PVC",
    foto: "/landing/assets/img/productos/tarjeta-480.webp",
    donde: "En el bolsillo del mozo o de quien atiende.",
    como: "Al cerrar la cuenta, se la acerca al cliente.",
  },
  {
    pieza: "Sticker NFC",
    foto: "/landing/assets/img/productos/sticker-480.webp",
    donde: "En la mesa, el mostrador o la puerta.",
    como: "El cliente lo toca mientras espera.",
  },
] as const;
