// Contenido del onboarding de las piezas que se venden sueltas (Mercado
// Libre): el video de cómo se activa y cómo se usa cada pieza. Lo usan la
// pantalla de activación (/t/<id>) y el instructivo en PDF.

/** Video corto de la activación (archivo en public/ o null mientras no esté). */
export const VIDEO_ACTIVACION: string | null = null;

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
