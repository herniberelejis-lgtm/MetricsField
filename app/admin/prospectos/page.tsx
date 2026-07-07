import type { Metadata } from "next";
import { getProspectos } from "@/lib/db";
import {
  accionActualizarProspecto,
  accionAgregarCapturas,
  accionCrearProspecto,
  accionEliminarCaptura,
  accionEliminarProspecto,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import type { EstadoProspecto } from "@/lib/types";

export const metadata: Metadata = { title: "Prospectos" };
export const dynamic = "force-dynamic";

const ESTADOS: { v: EstadoProspecto; l: string }[] = [
  { v: "a-contactar", l: "A contactar" },
  { v: "contactado", l: "Contactado — esperando respuesta" },
  { v: "en-conversacion", l: "En conversación" },
  { v: "visita-agendada", l: "Visita agendada" },
  { v: "vendido", l: "Cerrado — vendido" },
  { v: "rechazado", l: "Rechazado / no le interesó" },
];

const COLOR_ESTADO: Record<EstadoProspecto, string> = {
  "a-contactar": "bg-slate-100 text-slate-600",
  contactado: "bg-blue-50 text-blue-700",
  "en-conversacion": "bg-amber-50 text-amber-700",
  "visita-agendada": "bg-violet-50 text-violet-700",
  vendido: "bg-emerald-50 text-emerald-700",
  rechazado: "bg-rose-50 text-rose-700",
};

function waLink(contacto: string): string | null {
  const digits = contacto.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

export default async function ProspectosPage() {
  const prospectos = await getProspectos();
  const enCurso = prospectos.filter((p) =>
    ["contactado", "en-conversacion", "visita-agendada"].includes(p.estado),
  ).length;
  const vendidos = prospectos.filter((p) => p.estado === "vendido").length;

  return (
    <div>
      <PageHeader
        title="Prospectos"
        subtitle="Locales a los que se les está vendiendo. Todavía no son clientes — eso pasa recién en Clientes → Nuevo cliente."
        actions={
          <form action={accionCrearProspecto}>
            <SubmitButton>+ Agregar local</SubmitButton>
          </form>
        }
      />

      <div className="mb-6 flex flex-wrap gap-6">
        <div>
          <div className="text-xl font-semibold text-slate-900">{prospectos.length}</div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Locales</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-slate-900">{enCurso}</div>
          <div className="text-xs uppercase tracking-wide text-slate-400">En curso</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-slate-900">{vendidos}</div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Cerrados</div>
        </div>
      </div>

      {prospectos.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            Todavía no cargaste ningún prospecto. Tocá "+ Agregar local" para
            empezar.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {prospectos.map((p) => {
          const wa = waLink(p.contacto);
          return (
            <Card key={p.id}>
              <form action={accionActualizarProspecto} className="space-y-4">
                <input type="hidden" name="id" value={p.id} />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      name="local"
                      defaultValue={p.local}
                      placeholder="Nombre del local"
                      className="w-full border-0 border-b border-transparent bg-transparent p-0 text-lg font-semibold text-slate-900 hover:border-slate-200 focus:border-brand focus:outline-none"
                    />
                    <input
                      name="zona"
                      defaultValue={p.zona}
                      placeholder="Zona / dirección"
                      className="mt-1 w-full border-0 border-b border-transparent bg-transparent p-0 text-xs text-slate-500 hover:border-slate-200 focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        WhatsApp ↗
                      </a>
                    )}
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${COLOR_ESTADO[p.estado]}`}>
                      <select
                        name="estado"
                        defaultValue={p.estado}
                        className="bg-transparent text-[11px] font-medium focus:outline-none"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e.v} value={e.v}>
                            {e.l}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Contacto">
                    <input name="contacto" defaultValue={p.contacto} placeholder="Nombre y/o teléfono" className={inputCls} />
                  </Field>
                  <Field label="Redes">
                    <input name="redes" defaultValue={p.redes} placeholder="Instagram, Facebook…" className={inputCls} />
                  </Field>
                  <Field label="Página web">
                    <input name="web" type="url" defaultValue={p.web} placeholder="https://…" className={inputCls} />
                  </Field>
                  <Field label="Página de reseñas (Google)">
                    <input name="resenas" type="url" defaultValue={p.resenas} placeholder="Link para dejar reseña" className={inputCls} />
                  </Field>
                </div>

                <Field label="Producto ofrecido">
                  <textarea name="producto" defaultValue={p.producto} rows={2} placeholder="Qué le ofrecimos" className={inputCls} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Precio ofrecido">
                    <input name="precio" defaultValue={p.precio} placeholder="$35.000" className={inputCls} />
                  </Field>
                  <Field label="Próximo seguimiento">
                    <div className="flex gap-2">
                      <input name="segFecha" type="date" defaultValue={p.segFecha} className={`${inputCls} shrink-0 w-40`} />
                      <input name="segTexto" defaultValue={p.segTexto} placeholder="Qué hay que hacer" className={inputCls} />
                    </div>
                  </Field>
                </div>

                <Field label="Notas">
                  <textarea name="notas" defaultValue={p.notas} rows={2} placeholder="Cualquier otra cosa a recordar" className={inputCls} />
                </Field>

                <SubmitButton>Guardar cambios</SubmitButton>
              </form>

              {/* Capturas: formularios aparte, no anidados dentro del form de arriba */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Capturas de la conversación
                </span>
                <div className="flex flex-wrap gap-3">
                  {p.capturas.map((src, i) => (
                    <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Captura ${i + 1}`} className="h-full w-full object-cover" />
                      <form action={accionEliminarCaptura} className="absolute right-0.5 top-0.5">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="index" value={i} />
                        <button
                          type="submit"
                          aria-label="Quitar captura"
                          className="grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] text-white"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  ))}
                  <form
                    action={accionAgregarCapturas}
                    encType="multipart/form-data"
                    className="flex h-20 items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 px-2 text-[10px] text-slate-400"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input type="file" name="capturas" accept="image/*" multiple className="w-24 text-[10px]" />
                    <button type="submit" className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white">
                      Subir
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                <form action={accionEliminarProspecto}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-xs text-rose-500 hover:text-rose-700">
                    Eliminar local
                  </button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
