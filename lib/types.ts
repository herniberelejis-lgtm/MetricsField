// Modelo de dominio del dashboard de la agencia (NFC + GEO) — Córdoba.
// Refleja las entidades del documento de proyecto: clientes, reseñas,
// posición en Google Maps, citaciones en IA (GEO) y reportes mensuales.

export type Plan = "Base" | "Premium";

export type EstadoCliente = "activo" | "pausado" | "prospecto" | "baja";

export type Zona =
  | "Güemes"
  | "Nueva Córdoba"
  | "Alberdi"
  | "General Paz"
  | "Cerro de las Rosas"
  | "Otra";

export type Rubro =
  | "Peluquería / Barbería"
  | "Restaurante / Bar"
  | "Clínica / Consultorio"
  | "Taller mecánico"
  | "Veterinaria"
  | "Gimnasio"
  | "Estética"
  | "Otro";

/** Formatos de producto físico NFC (sección 3 del proyecto). */
export type FormatoNFC = "Sticker" | "Tarjeta PVC" | "Standee" | "Pack completo";

/** Una venta de producto físico NFC asociada a un cliente. */
export interface VentaNFC {
  formato: FormatoNFC;
  cantidad: number;
  precioUnitario: number; // ARS
  fecha: string; // ISO
}

/** Snapshot mensual de métricas de un cliente. */
export interface MetricaMensual {
  mes: string; // "2026-06"
  resenasNuevas: number;
  resenasTotal: number;
  ratingPromedio: number; // 1..5
  visitasPerfil: number;
  llamadas: number;
  clicsComoLlegar: number;
  // Solo Premium — citaciones en motores de IA (GEO)
  citasChatGPT?: number;
  citasCopilot?: number;
  citasPerplexity?: number;
}

export interface Cliente {
  id: string;
  /** Código privado con el que el cliente accede a su portal (/portal/[codigo]). */
  codigoAcceso: string;
  nombre: string;
  rubro: Rubro;
  zona: Zona;
  plan: Plan;
  estado: EstadoCliente;
  contacto: string; // WhatsApp / teléfono
  fechaAlta: string; // ISO
  googleReviewUrl: string;
  busquedaClave: string; // p.ej. "peluquería en Nueva Córdoba"
  fee: number; // abono mensual ARS
  tonoMarca: TonoMarca;
  ventasNFC: VentaNFC[];
  historico: MetricaMensual[]; // ordenado ascendente por mes
  googlePlaceId: string;
  /** Resource name de la ficha en Business Profile ("locations/…") — se
   * vincula solo en la primera sincronización de rendimiento. */
  googleLocation: string;
  /** Rating y reseñas traídos automático por Places API — null si nunca sincronizó. */
  ratingGoogle: number | null;
  resenasGoogle: number | null;
  googleSyncEn: string | null;
  /** Cuándo el CLIENTE conectó su propia cuenta de Google (Business Profile),
   * desde su portal — null si todavía no conectó. Mientras la app de Taply
   * no esté verificada por Google, esa autorización expira ~7 días después
   * y hay que reconectar. No incluye el refresh token (eso vive solo en la
   * base, nunca se manda al cliente). */
  googleConectadoEn: string | null;
  /** Responder solas las reseñas positivas (sin que nadie las apruebe a
   * mano) apenas Google apruebe el acceso a la Reviews API — ver
   * lib/google-reviews.ts. El cliente elige esto desde su portal. */
  autoResponderPositivas: boolean;
  /** A partir de cuántas estrellas se considera "positiva" para responder sola. */
  autoResponderUmbral: 4 | 5;
  /** Última vez que se trajeron reseñas nuevas desde la Reviews API — null
   * si nunca sincronizó (hoy siempre, hasta que Google apruebe el acceso). */
  resenasSyncEn: string | null;
  /** A dónde mandar la alerta de reseña/queja mala y el resumen mensual.
   * Vacío = no se manda nada — nunca se asume un email por default. */
  emailNotificaciones: string;
}

/** Tono usado por el generador de respuestas sugeridas (lib/respuestas.ts). */
export type TonoMarca = "cercano" | "formal";

/** Utilidades derivadas. */
export function metricaActual(c: Cliente): MetricaMensual | undefined {
  return c.historico[c.historico.length - 1];
}

export function metricaAnterior(c: Cliente): MetricaMensual | undefined {
  return c.historico[c.historico.length - 2];
}

export function citasIA(m?: MetricaMensual): number {
  if (!m) return 0;
  return (m.citasChatGPT ?? 0) + (m.citasCopilot ?? 0) + (m.citasPerplexity ?? 0);
}

export function ingresoNFC(c: Cliente): number {
  return c.ventasNFC.reduce((acc, v) => acc + v.cantidad * v.precioUnitario, 0);
}

// ---------- Fase 1+: captación, CRM, SEO/GEO ----------
// "comercio" en la base de datos es el mismo concepto que "Cliente" acá.

export type DestinoLink = "resena" | "menu" | "instagram" | "promo" | "url_custom";

/** Qué soporte físico usa este link: chip NFC, sticker/impreso con QR, o un
 * standee que trae los dos apuntando al mismo lugar. Sirve para saber, sin
 * abrir cada uno, cuántos QR y cuántos NFC tiene un local instalados. */
export type TipoSoporte = "nfc" | "qr" | "ambos";

export interface LinkNFC {
  id: string; // slug corto: taply.app/t/<id> — FIJO desde que se imprime, nunca cambia
  /** null = pieza libre en el inventario de hardware, todavía sin asignar
   * a ningún cliente (se generó en lote antes de saber a quién le toca). */
  comercioId: string | null;
  etiqueta: string; // dónde/quién lo usa: "Mesa 4", "Mozo Juan", "Caja"... vacío mientras está libre
  tipo: TipoSoporte;
  /** Tanda de fabricación/pedido a la que pertenece — útil para saber qué
   * pedido a China corresponde a cada pieza. */
  lote: string;
  destino: DestinoLink;
  urlDestino: string | null;
  activo: boolean;
  /** Solo importa cuando destino='resena': true (default) = pasa por el
   * star-gate de estrellas; false = va derecho a googleReviewUrl para
   * todo el mundo, sin desviar las malas a feedback privado. Algunos
   * clientes prefieren no usar el filtro — es su elección, no la nuestra.
   * El tap se sigue contando igual en cualquiera de los dos casos. */
  usarFiltro: boolean;
  /** true = el propio comprador la activó desde /t/<id> (canal Mercado
   * Libre: hardware suelto, sin agencia ni portal) — comercioId sigue NULL
   * para siempre en estas piezas. false para todo lo demás: inventario
   * libre sin activar, o piezas del modelo de agencia con comercioId. */
  autogestionado: boolean;
  /** Solo con autogestionado=true: nombre que se muestra en el star-gate,
   * a falta de un comercio real. Vacío en cualquier otro caso. */
  nombreNegocio: string;
  creadoEn: string;
  taps: number; // total histórico, calculado
}

export type EstadoFeedback = "nuevo" | "en_proceso" | "resuelto";

export interface Feedback {
  id: number;
  comercioId: string;
  estrellas: 1 | 2 | 3;
  texto: string;
  contacto: string | null;
  estado: EstadoFeedback;
  notasInternas: string;
  creadoEn: string;
  actualizadoEn: string;
}

export type EstadoResena = "nueva" | "respondida" | "escalada" | "resuelta";

export interface ResenaCRM {
  id: number;
  comercioId: string;
  autor: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  plataforma: "google" | "otra";
  estado: EstadoResena;
  respuestaSugerida: string | null;
  respuestaPublicada: boolean;
  responsable: string | null;
  notas: string;
  fecha: string;
  /** Resource name de la reseña en Google ("accounts/…/locations/…/reviews/…")
   * — null si se cargó a mano en el CRM en vez de venir del sync. */
  origenGoogleId: string | null;
  /** true si la respondió el sync automático (positiva + automatización
   * activa), sin que nadie la haya aprobado a mano. */
  publicadaAutomaticamente: boolean;
  /** Hora exacta si se conoce (ISO) — null en reseñas cargadas antes de
   * que existiera esta columna, que solo tenían la fecha (sin hora). */
  creadoEn: string | null;
}

export type PlataformaIA = "ChatGPT" | "Claude" | "Perplexity" | "Gemini" | "Otra";

export interface AuditGEOResultado {
  id: number;
  comercioId: string;
  fecha: string;
  pregunta: string;
  plataforma: PlataformaIA;
  aparece: boolean;
  competidoresMencionados: string;
}

export interface ChecklistItemSEO {
  key: string;
  label: string;
  hecho: boolean;
}

export interface Competidor {
  id: number;
  comercioId: string;
  nombre: string;
  rating: number | null;
  totalResenas: number | null;
  googlePlaceId: string | null;
  actualizadoEn: string;
}

/** Foto de un competidor en un mes dado (benchmarking histórico). */
export interface SnapshotCompetidor {
  nombre: string;
  rating: number | null;
  totalResenas: number | null;
}

/** Una fila del benchmarking mensual: nuestras métricas de ese mes (del
 * histórico del propio cliente) enfrentadas a la foto de cada competidor. */
export interface BenchmarkMes {
  mes: string; // 'YYYY-MM'
  propioResenas: number | null;
  propioRating: number | null;
  competidores: SnapshotCompetidor[];
}

export type EstadoCobro = "pendiente" | "pagado";

/** Un cobro del abono (u otro concepto) de un comercio. */
export interface Cobro {
  id: number;
  comercioId: string;
  periodo: string; // 'YYYY-MM'
  concepto: string; // 'abono' | 'nfc' | 'otro'
  monto: number;
  estado: EstadoCobro;
  metodo: string;
  venceEl: string | null; // ISO date
  pagadoEl: string | null; // ISO date
  nota: string;
  creadoEn: string;
}

export type EstadoProspecto =
  | "a-contactar"
  | "contactado"
  | "en-conversacion"
  | "visita-agendada"
  | "vendido"
  | "rechazado";

/** Un local al que todavía se le está vendiendo — no es cliente hasta que
 * se da de alta como Cliente en /admin/clientes. Vive en su propia tabla,
 * separado a propósito: acá se registra la prospección, no la operación. */
export interface Prospecto {
  id: string;
  local: string;
  zona: string;
  contacto: string;
  redes: string;
  web: string;
  resenas: string;
  producto: string;
  precio: string;
  estado: EstadoProspecto;
  segFecha: string;
  segTexto: string;
  notas: string;
  capturas: string[];
  creadoEn: string;
}

/** Checklist SEO estandarizado (mismo para todos los rubros por ahora). */
export const CHECKLIST_SEO_ITEMS: { key: string; label: string }[] = [
  { key: "categoria", label: "Categoría principal correcta en Google Business" },
  { key: "fotos", label: "Al menos 10 fotos recientes cargadas" },
  { key: "horarios", label: "Horarios y feriados al día" },
  { key: "atributos", label: "Atributos de servicio completos" },
  { key: "descripcion", label: "Descripción con palabras clave del rubro y zona" },
  { key: "qa", label: "Preguntas y respuestas frecuentes cargadas" },
  { key: "schema", label: "Schema LocalBusiness instalado en el sitio (si tiene web)" },
];
