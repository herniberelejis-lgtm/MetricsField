import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getResenas } from "@/lib/db";
import {
  accionActualizarResena,
  accionCrearResena,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader, Stars } from "@/components/ui";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { waUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const c = await getCliente((await params).id);
  return { title: c ? `CRM · ${c.nombre}` : "CRM" };
}

const ESTADOS_RESENA = ["nueva", "respondida", "escalada", "resuelta"] as const;

const COLOR_ESTADO_RESENA: Record<string, string> = {
  nueva: "bg-blue-50 text-blue-700",
  respondida: "bg-emerald-50 text-emerald-700",
  escalada: "bg-amber-50 text-amber-700",
  resuelta: "bg-slate-100 text-slate-600",
};

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

export default async function CRMPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [c, resenas] = await Promise.all([
    getCliente(id),
    getResenas(id),
  ]);
  if (!c) notFound();

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${c.id}`} className="text-slate-500 hover:text-brand-fg">
          ← {c.nombre}
        </Link>
      </div>
      <PageHeader
        title="CRM de reseñas"
        subtitle={`${c.nombre} · ${resenas.length} reseñas cargadas`}
      />

      {/* Cargar reseña manual */}
      <h2 className="mb-3 text-sm font-semibold text-slate-900">
        Cargar reseña
      </h2>
      <Card>
        <form action={accionCrearResena} className="space-y-4">
          <input type="hidden" name="comercioId" value={c.id} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Autor">
              <input name="autor" required placeholder="Nombre del cliente" className={inputCls} />
            </Field>
            <Field label="Estrellas">
              <select name="estrellas" defaultValue="5" className={inputCls}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} estrella{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Texto de la reseña">
            <textarea name="texto" required rows={3} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plataforma">
              <select name="plataforma" defaultValue="google" className={inputCls}>
                <option value="google">Google</option>
                <option value="otra">Otra</option>
              </select>
            </Field>
            <Field label="Fecha">
              <input
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Hora" hint="Opcional — si no la sabés, dejala vacía.">
            <input name="hora" type="time" className={inputCls} />
          </Field>
          <SubmitButton>Cargar reseña</SubmitButton>
        </form>
      </Card>

      {/* Bandeja de reseñas */}
      {resenas.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
            Reseñas
          </h2>
          <div className="space-y-3">
            {resenas.map((r) => {
              const sugerencia =
                r.respuestaSugerida ??
                generarRespuestaSugerida(r.autor, r.estrellas, r.texto, c.tonoMarca);
              return (
                <Card key={r.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{r.autor}</span>
                        <Stars rating={r.estrellas} />
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_RESENA[r.estado]}`}
                        >
                          {r.estado}
                        </span>
                      </div>
                      <p className="mt-1 max-w-xl text-sm text-slate-700">{r.texto}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.plataforma} · {fechaCorta(r.fecha)}
                      </p>
                    </div>
                  </div>

                  <form action={accionActualizarResena} className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="comercioId" value={c.id} />
                    <Field
                      label="Respuesta sugerida"
                      hint="Generada por plantilla (sentimiento + tema + tono de marca) — editala antes de publicarla en Google."
                    >
                      <textarea
                        name="respuestaSugerida"
                        rows={3}
                        defaultValue={sugerencia}
                        className={inputCls}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Estado">
                        <select name="estado" defaultValue={r.estado} className={inputCls}>
                          {ESTADOS_RESENA.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Responsable">
                        <input
                          name="responsable"
                          defaultValue={r.responsable ?? ""}
                          placeholder="Quién la gestiona"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="respuestaPublicada"
                        value="1"
                        defaultChecked={r.respuestaPublicada}
                        className="rounded"
                      />
                      Ya publiqué esta respuesta en Google (copy-paste)
                    </label>
                    <SubmitButton>Guardar</SubmitButton>
                  </form>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
