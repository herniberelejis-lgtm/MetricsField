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
  posicionMaps: number; // ranking en el Local Pack para la búsqueda clave (1 = primero)
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

export interface LinkNFC {
  id: string; // slug corto: taply.app/t/<id>
  comercioId: string;
  etiqueta: string;
  destino: DestinoLink;
  urlDestino: string | null;
  activo: boolean;
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
