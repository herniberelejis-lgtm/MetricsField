// Textos del sitio que se repiten o que conviene revisar juntos. Reglas de
// verdad (ver Plan_Landing_Unificada_MetricsField.md): nada que no exista
// hoy se vende como disponible, todo ejemplo se rotula "Ejemplo" y no hay
// casos, testimonios ni números sin respaldo.

export interface Pregunta {
  tema: string;
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS: readonly Pregunta[] = [
  {
    tema: "Google",
    pregunta: "¿Es seguro para mi ficha de Google?",
    respuesta:
      "Sí. El cartel lleva a todos tus clientes al mismo formulario oficial de reseñas de Google, sin filtrar a nadie por la nota que piensa dejar. No pedimos calificaciones específicas ni premiamos opiniones positivas, que es lo que prohíben las políticas de Google.",
  },
  {
    tema: "Celulares",
    pregunta: "¿Funciona con iPhone y con cualquier Android?",
    respuesta:
      "Funciona con la mayoría de los celulares actuales que tienen NFC, iPhone incluido, sin bajar ninguna app. Si un celular no tiene NFC, el cliente escanea el QR impreso en la misma pieza.",
  },
  {
    tema: "Envíos",
    pregunta: "¿Hacen envíos fuera de Córdoba?",
    respuesta:
      "Sí, a todo el país. En Córdoba te lo llevamos y lo instalamos nosotros. En el resto del país te llega por correo y lo activás vos en pocos minutos cargando el link de tu ficha de Google; si te trabás, te ayudamos por WhatsApp.",
  },
  {
    tema: "Precio",
    pregunta: "¿Cuánto cuesta?",
    respuesta:
      "Las piezas se pagan una sola vez: standee $25.000, tarjeta $7.000 y sticker $10.000. El panel de Reviews cuesta $25.000 por mes y el primer mes es gratis. Retail tiene 30 días gratis. Loyalty está en piloto e Intel todavía no salió. Precios en pesos, IVA no incluido.",
  },
  {
    tema: "Contrato",
    pregunta: "¿Hay permanencia mínima?",
    respuesta:
      "No. Las piezas quedan tuyas y el panel es una suscripción mensual que podés dar de baja cuando quieras.",
  },
  {
    tema: "Retail",
    pregunta: "¿Retail es de Mercado Libre?",
    respuesta:
      "No. MetricsField es una empresa independiente. Te conectás con el acceso oficial de Mercado Libre, sin darnos tu contraseña, y podés quitar el permiso cuando quieras. Hoy está pensado para Responsables Inscriptos.",
  },
  {
    tema: "Loyalty",
    pregunta: "¿Qué es Loyalty y cuándo sale?",
    respuesta:
      "Es una tarjeta de puntos que tu cliente guarda en la billetera del celular tocando el mismo cartel de Reviews. Hoy funciona con Google Wallet y está en piloto con comercios de Córdoba; Apple Wallet está en preparación. Si querés probarlo, anotate como comercio piloto.",
  },
  {
    tema: "Datos",
    pregunta: "¿Qué hacen con mis datos y los de mis clientes?",
    respuesta:
      "Los usamos solo para darte el servicio y nunca los vendemos. Los datos de tus clientes son tuyos y se piden con su consentimiento, según la Ley 25.326. El detalle está en la política de privacidad.",
  },
];

/** Ejemplo de una venta en Mercado Libre (no es un cliente real). */
export const VENTA_EJEMPLO = {
  producto: "Set de sartenes antiadherentes",
  precio: 18_990,
  descuentos: [
    { concepto: "Comisión de Mercado Libre", monto: 3_038 },
    { concepto: "Envío que pagás vos", monto: 8_250 },
    { concepto: "Publicidad", monto: 1_420 },
    { concepto: "Costo del producto", monto: 9_800 },
  ],
} as const;

export function resultadoVentaEjemplo(): number {
  return VENTA_EJEMPLO.precio - VENTA_EJEMPLO.descuentos.reduce((s, d) => s + d.monto, 0);
}

export const pesos = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("es-AR")}`;
