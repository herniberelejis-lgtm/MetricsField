import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente, getResenas } from "@/lib/db";
import {
  accionActualizarResena,
  accionCrearResena,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader, Stars, btnSecondary } from "@/components/ui";
import { generarRespuestaSugerida } from "@/lib/respuestas";
import { asegurarAdminPagina } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await asegurarAdminPagina();
  const c = await getCliente((await params).id);
  return { title: c ? `CRM · ${c.nombre}` : "CRM" };
}

const ESTADOS_RESENA = ["nueva", "respondida", "escalada", "resuelta"] as const;

const COLOR_ESTADO_RESENA: Record<string, string> = {
  nueva: "bg-[#EEF4FB] text-[#1F4E80]",
  respondida: "bg-[#EAF7F0] text-[#0B5E40]",
  escalada: "bg-[#FFF4E8] text-[#8A3F00]",
  resuelta: "bg-slate-100 text-slate-600",
};

function fechaCorta(v: string): string {
  return new Date(v).toLocaleDateString("es-AR");
}

// Con cientos de reseñas la página medía más de 100.000 px: de a 20, con
// filtro por estado (los links llevan el estado y la página en la URL).
const POR_PAGINA = 20;

export default async function CRMPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  await asegurarAdminPagina();
  const { id } = await params;
  const { estado: estadoParam, pagina: paginaParam } = await searchParams;
  const estado = ESTADOS_RESENA.find((e) => e === estadoParam) ?? null;
  const pagina = Math.max(1, Math.min(1000, Number(paginaParam) || 1));
  const [c, resenas] = await Promise.all([
    getCliente(id),
    getResenas(id),
  ]);
  if (!c) notFound();
  const filtradas = estado ? resenas.filter((r) => r.estado === estado) : resenas;

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/clientes/${c.id}`} className="text-slate-600 hover:text-[#1F4E80]">
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
          <h2 className="mb-3 mt-8 text-[15px] font-bold text-slate-900">Reseñas</h2>
          <div role="group" aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
            {[null, ...ESTADOS_RESENA].map((e) => {
              const n = e ? resenas.filter((r) => r.estado === e).length : resenas.length;
              const activo = e === estado;
              return (
                <Link
                  key={e ?? "todas"}
                  href={`/admin/clientes/${c.id}/crm${e ? `?estado=${e}` : ""}`}
                  aria-current={activo ? "true" : undefined}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium capitalize transition ${
                    activo
                      ? "bg-[#EEF4FB] font-semibold text-[#1F4E80] ring-1 ring-[#A9C5E6]"
                      : "bg-white text-slate-700 ring-1 ring-[#E4E6EA] hover:bg-[#F7F9FC]"
                  }`}
                >
                  {e ?? "Todas"}
                  <span className="tabular-nums text-slate-600">{n}</span>
                </Link>
              );
            })}
          </div>
          <div className="space-y-3">
            {filtradas.slice(0, pagina * POR_PAGINA).map((r) => {
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
                      <p className="mt-1 text-xs text-slate-600">
                        {r.plataforma} · {fechaCorta(r.fecha)}
                      </p>
                    </div>
                  </div>

                  <form action={accionActualizarResena} className="mt-3 space-y-3 border-t border-[#EEF0F3] pt-3">
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
          {filtradas.length > pagina * POR_PAGINA && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <Link
                href={`/admin/clientes/${c.id}/crm?${estado ? `estado=${estado}&` : ""}pagina=${pagina + 1}`}
                scroll={false}
                className={btnSecondary}
              >
                Ver {Math.min(POR_PAGINA, filtradas.length - pagina * POR_PAGINA)} más
              </Link>
              <span className="text-xs tabular-nums text-slate-600">
                Mostrando {pagina * POR_PAGINA} de {filtradas.length}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
