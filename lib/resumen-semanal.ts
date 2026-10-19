import { fmt1, type Conclusiones } from "./conclusiones";

// "Tu semana en Google": el resumen de cada lunes (mail automático y texto
// listo para WhatsApp desde el admin). Sale de las mismas conclusiones que el
// portal, para que nunca digan cosas distintas: tres números, lo mejor de la
// semana y una sola cosa para hacer. Función pura.

export interface ResumenSemanal {
  nombre: string;
  numeros: { valor: string; label: string }[];
  /** Lo mejor que pasó (la conclusión principal de "qué funciona"). */
  destacado: string | null;
  /** Una sola cosa para hacer esta semana. */
  tarea: string | null;
}

export interface EntradaResumenSemanal {
  nombre: string;
  conclusiones: Conclusiones;
  resenas: { fecha: string; estrellas: number; deGoogle: boolean }[];
  taps: { creadoEn: string }[];
  hoy: Date;
}

const DIA = 86_400_000;

function enMayuscula(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** null si no hay nada que contar (no se manda un resumen vacío). */
export function armarResumenSemanal(e: EntradaResumenSemanal): ResumenSemanal | null {
  const desde = e.hoy.getTime() - 7 * DIA;
  const numeros: ResumenSemanal["numeros"] = [];

  const deGoogle = e.resenas.filter((r) => r.deGoogle);
  if (deGoogle.length > 0) {
    const semana = deGoogle.filter((r) => new Date(`${r.fecha}T12:00:00Z`).getTime() >= desde);
    const prom = semana.length ? semana.reduce((a, r) => a + r.estrellas, 0) / semana.length : 0;
    numeros.push({
      valor: String(semana.length),
      label:
        semana.length === 0
          ? "reseñas nuevas en Google esta semana"
          : `reseña${semana.length === 1 ? "" : "s"} nueva${semana.length === 1 ? "" : "s"} en Google, ${fmt1(prom)}★ de promedio`,
    });
  }

  const toques = e.taps.filter((t) => new Date(t.creadoEn).getTime() >= desde).length;
  if (toques > 0) numeros.push({ valor: String(toques), label: `toque${toques === 1 ? "" : "s"} al cartel` });

  const meta = e.conclusiones.meta;
  if (meta) {
    numeros.push({
      valor: meta.actual,
      label: `tu calificación: te faltan ${meta.faltan} de 5★ para el ${meta.siguiente}`,
    });
  }

  const destacado = e.conclusiones.funciona[0]?.titulo ?? null;
  const tarea = e.conclusiones.tareas[0] ?? (e.conclusiones.cuesta[0]?.accion ? enMayuscula(e.conclusiones.cuesta[0].accion) : null);
  if (numeros.length === 0 && !destacado && !tarea) return null;
  return { nombre: e.nombre, numeros: numeros.slice(0, 3), destacado, tarea };
}

/** Texto para WhatsApp (formato de WhatsApp: *negrita*). */
export function textoWhatsAppResumen(r: ResumenSemanal, linkPortal: string | null): string {
  const lineas = [`*Tu semana en Google — ${r.nombre}*`, ""];
  for (const n of r.numeros) lineas.push(`• *${n.valor}* ${n.label}`);
  if (r.destacado) lineas.push("", r.destacado);
  if (r.tarea) lineas.push("", `*Para hacer:* ${r.tarea}`);
  if (linkPortal) lineas.push("", `Todo el detalle en tu portal: ${linkPortal}`);
  return lineas.join("\n");
}
