import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Tutoriales" };
export const dynamic = "force-dynamic";

// Manuales de uso interno del equipo. Estructura preparada para ir
// llenando cada guía con pasos, capturas y videos. Hoy es un andamiaje:
// cada guía tiene su lugar y un índice de pasos placeholder — el contenido
// real se carga editando este archivo (o, más adelante, desde una tabla
// `tutoriales` si se decide hacerlos administrables sin deploy).

interface Guia {
  slug: string;
  titulo: string;
  resumen: string;
  pasos: string[];
}

const GUIAS: Guia[] = [
  {
    slug: "carga-clientes",
    titulo: "Carga de nuevos clientes",
    resumen:
      "Alta de un comercio en el panel: slug, código de portal, abono, plan y primer link NFC.",
    pasos: [
      "Dónde arranca el alta (/admin/clientes/nuevo)",
      "Datos mínimos vs. opcionales",
      "Qué se genera solo (slug, código de portal, link de mostrador)",
      "Cómo entregar el acceso al cliente por WhatsApp",
    ],
  },
  {
    slug: "hardware",
    titulo: "Registro y vinculación de nuevo hardware",
    resumen:
      "Programar un chip NFC y vincularlo al link correcto del comercio (mostrador, mesa, sucursal).",
    pasos: [
      "Crear/elegir el link NFC en la ficha del cliente",
      "Escribir la URL /t/<slug> en el chip con NFC Tools",
      "Probar el tap y verificar que registre en el panel",
      "Etiquetado físico (qué chip es cuál) y stock",
    ],
  },
  {
    slug: "auditorias-seo",
    titulo: "Auditorías SEO",
    resumen:
      "Cómo relevar y cargar el checklist SEO local y el Audit GEO de un comercio.",
    pasos: [
      "Checklist SEO local: qué mira cada ítem",
      "Audit GEO: pegar la pregunta en ChatGPT/Claude/Perplexity",
      "Registrar si aparece y qué competidores menciona",
      "Cómo leerlo con el cliente en la reunión mensual",
    ],
  },
];

export default function TutorialesPage() {
  return (
    <div>
      <PageHeader
        title="Tutoriales"
        subtitle="Manuales de uso interno del equipo"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {GUIAS.map((g) => (
          <Card key={g.slug} id={g.slug} className="scroll-mt-4">
            <h2 className="text-sm font-semibold text-slate-900">{g.titulo}</h2>
            <p className="mt-1 text-xs text-slate-500">{g.resumen}</p>
            <ol className="mt-3 space-y-1.5 text-sm text-slate-600">
              {g.pasos.map((paso, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-medium text-slate-400 tabular-nums">
                    {i + 1}.
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              Guía en preparación — el contenido detallado se carga acá.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
