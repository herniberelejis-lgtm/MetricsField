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
}

/** Cómo activar el QR en MetricsField (grabado de la app real). */
export const VIDEO_QR: VideoOnboarding | null = {
  src: "/tap/videos/activar-qr.mp4",
  portada: "/tap/videos/activar-qr-portada.jpg",
  titulo: "Cómo activar el QR",
  duracion: "35 s",
};

/** Cómo grabar el chip NFC con NFC Tools (video del equipo). */
export const VIDEO_NFC: VideoOnboarding | null = {
  src: "/tap/videos/activar-nfc.mp4",
  portada: "/tap/videos/activar-nfc-portada.jpg",
  titulo: "Cómo grabar el chip NFC",
  duracion: "50 s",
};

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
