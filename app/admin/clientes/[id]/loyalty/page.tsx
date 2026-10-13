import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCliente } from "@/lib/db";
import {
  contarTarjetasConError,
  getBeneficios,
  getComercioLoyalty,
  getMetricasLoyalty,
  getMisiones,
  getProgramaLoyalty,
} from "@/lib/db/loyalty";
import { loyaltyHabilitado, origenLoyalty, walletGoogleConfigurado } from "@/lib/loyalty";
import {
  accionCrearBeneficioLoyalty,
  accionCrearMisionLoyalty,
  accionGuardarLoyalty,
  accionLiberarTelefonoLoyalty,
  accionToggleBeneficioLoyalty,
  accionToggleMisionLoyalty,
} from "@/app/actions";
import { Field, inputCls, SubmitButton } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { asegurarAdminPagina } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MENSAJES: Record<string, { texto: string; tono: "ok" | "error" }> = {
  ok: { texto: "Guardado. La tarjeta de Google Wallet del comercio quedó actualizada.", tono: "ok" },
  google: {
    texto:
      "Se guardó en la base, pero Google Wallet rechazó la clase del comercio. Probá de nuevo desde /admin/wallet-prueba para ver el error exacto.",
    tono: "error",
  },
  beneficio: { texto: "El beneficio necesita un nombre.", tono: "error" },
  mision: { texto: "Elegí un tipo de misión válido.", tono: "error" },
  "mision-url": { texto: '"Seguir en redes" necesita el link completo (https://instagram.com/...).', tono: "error" },
  telefono: { texto: "Ese teléfono no es válido. Escribilo con característica, por ejemplo 351 555 1234.", tono: "error" },
  "telefono-libre": { texto: "Ese teléfono no tenía ninguna tarjeta: ya se puede registrar.", tono: "ok" },
  "ok-telefono": { texto: "Teléfono liberado: se borró esa tarjeta (en todos los locales) y la persona ya se puede registrar.", tono: "ok" },
};

const NOMBRE_MISION = {
  resena_google: "Opinar en Google (autodeclarada)",
  seguir_redes: "Seguir en redes (autodeclarada)",
  referido: "Invitar a un amigo (automática)",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await asegurarAdminPagina();
  const { id } = await params;
  const c = await getCliente(id);
  return { title: c ? `Club de beneficios · ${c.nombre}` : "Club de beneficios" };
}

function Estado({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? "text-emerald-600" : "text-amber-600"} aria-hidden>
        {ok ? "✓" : "!"}
      </span>
      <span className="text-slate-700">{texto}</span>
    </li>
  );
}

export default async function LoyaltyClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await asegurarAdminPagina();
  const { id } = await params;
  const sp = await searchParams;
  const c = await getCliente(id);
  if (!c) notFound();

  // Sin las tablas de Loyalty (migraciones 012 y 016 sin correr en esta
  // base) las consultas fallan: avisarlo en vez de un error 500.
  const datos = await Promise.all([
    getComercioLoyalty(id),
    getProgramaLoyalty(id),
    getBeneficios(id),
    getMisiones(id),
    getMetricasLoyalty(id),
    contarTarjetasConError(id),
  ]).catch((e: unknown) => {
    console.error("Loyalty admin:", e instanceof Error ? e.message : e);
    return null;
  });
  if (!datos) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Club de beneficios" />
        <Card>
          <p className="text-sm text-slate-700">
            Esta base todavía no tiene las tablas de Loyalty. Hay que correr a mano en el SQL Editor de Neon{" "}
            <code>db/migrations/012_loyalty_fundaciones.sql</code> y después <code>db/migrations/016_loyalty_google.sql</code>.
          </p>
        </Card>
      </div>
    );
  }
  const [comercio, programa, beneficios, misiones, metricas, conError] = datos;
  if (!comercio) notFound();
  const mensaje = sp.error ? MENSAJES[sp.error] : sp.ok === "telefono" ? MENSAJES["ok-telefono"] : sp.ok ? MENSAJES.ok : null;
  const linkLanding = `${await origenLoyalty()}/l/${encodeURIComponent(id)}`;
  const activoDeVerdad = loyaltyHabilitado() && comercio.tieneLoyalty && Boolean(programa?.activo);

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/clientes/${id}`} className="text-xs font-medium text-slate-500 hover:text-slate-800">
        ← {c.nombre}
      </Link>
      <PageHeader
        title="Club de beneficios"
        subtitle="Tarjeta de puntos en Google Wallet: se suma tocando el cartel, se canjea en caja desde el portal."
      />

      {mensaje && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${mensaje.tono === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}
        >
          {mensaje.texto}
        </p>
      )}

      <Card className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Estado</p>
        <ul className="mt-3 space-y-1.5">
          <Estado ok={loyaltyHabilitado()} texto="Módulo encendido en este ambiente (LOYALTY_ENABLED + LOYALTY_PII_KEY)" />
          <Estado ok={walletGoogleConfigurado()} texto="Google Wallet configurado" />
          <Estado ok={comercio.tieneLoyalty} texto="Este cliente tiene el club contratado" />
          <Estado ok={Boolean(programa?.googleClassId)} texto="Clase de Google Wallet creada" />
          <Estado ok={conError === 0} texto={conError === 0 ? "Todas las tarjetas emitidas" : `${conError} tarjetas con error de Google (se reintentan solas)`} />
        </ul>
        {activoDeVerdad ? (
          <p className="mt-4 text-sm text-slate-600">
            Link del club:{" "}
            <a href={linkLanding} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs text-brand-fg underline">
              {linkLanding}
            </a>
            <br />
            <span className="text-xs text-slate-500">
              Para que un cartel sume puntos, en{" "}
              <Link href={`/admin/clientes/${id}/links`} className="underline">
                Links NFC/QR
              </Link>{" "}
              elegí el destino &ldquo;Club de beneficios&rdquo;.
            </span>
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-500">El club no está abierto al público hasta que todo lo de arriba esté en verde.</p>
        )}
      </Card>

      <Card className="mb-4">
        <form action={accionGuardarLoyalty} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="tieneLoyalty" defaultChecked={comercio.tieneLoyalty} />
            Tiene el club de beneficios contratado
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="activo" defaultChecked={programa?.activo ?? true} />
            Programa activo (si lo pausás, nadie nuevo se registra ni suma puntos)
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Puntos de bienvenida" hint="Los que recibe al registrarse.">
              <input name="puntosBienvenida" type="number" min={0} max={10000} defaultValue={programa?.puntosBienvenida ?? 100} className={inputCls} />
            </Field>
            <Field label="Puntos por visita" hint="Máximo una visita cada 20 h por persona.">
              <input name="puntosPorVisita" type="number" min={0} max={10000} defaultValue={programa?.puntosPorVisita ?? 10} className={inputCls} />
            </Field>
          </div>
          <SubmitButton>Guardar y actualizar Google Wallet</SubmitButton>
        </form>
      </Card>

      <Card className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Beneficios (catálogo de canje)</p>
        {beneficios.length === 0 && <p className="mt-2 text-sm text-slate-500">Todavía no hay ninguno.</p>}
        <ul className="mt-2 divide-y divide-slate-100">
          {beneficios.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className={b.activo ? "text-slate-800" : "text-slate-400 line-through"}>
                {b.nombre} · {b.costoPuntos} puntos
              </span>
              <form action={accionToggleBeneficioLoyalty}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="beneficioId" value={b.id} />
                <input type="hidden" name="activo" value={b.activo ? "0" : "1"} />
                <button type="submit" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                  {b.activo ? "Pausar" : "Reactivar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={accionCrearBeneficioLoyalty} className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Nuevo beneficio">
            <input name="nombre" placeholder="Café gratis" maxLength={80} className={inputCls} />
          </Field>
          <Field label="Puntos">
            <input name="costoPuntos" type="number" min={1} defaultValue={100} className={inputCls} />
          </Field>
          <SubmitButton>Agregar</SubmitButton>
        </form>
      </Card>

      <Card className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Misiones (puntos extra, opcionales)</p>
        <p className="mt-0.5 text-xs text-slate-500">
          La de Google premia dejar una opinión, sea cual sea: nunca condicionar puntos a las estrellas.
        </p>
        <ul className="mt-2 divide-y divide-slate-100">
          {misiones.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className={m.activa ? "text-slate-800" : "text-slate-400 line-through"}>
                {NOMBRE_MISION[m.tipo]} · {m.puntos} puntos
                {m.url && <span className="ml-1 text-xs text-slate-400">→ {m.url}</span>}
              </span>
              <form action={accionToggleMisionLoyalty}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="misionId" value={m.id} />
                <input type="hidden" name="activa" value={m.activa ? "0" : "1"} />
                <button type="submit" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                  {m.activa ? "Pausar" : "Reactivar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={accionCrearMisionLoyalty} className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Nueva misión">
            <select name="tipo" className={inputCls} defaultValue="resena_google">
              <option value="resena_google">{NOMBRE_MISION.resena_google}</option>
              <option value="seguir_redes">{NOMBRE_MISION.seguir_redes}</option>
              <option value="referido">{NOMBRE_MISION.referido}</option>
            </select>
          </Field>
          <Field label="Puntos">
            <input name="puntos" type="number" min={1} defaultValue={20} className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Link (solo para &quot;Seguir en redes&quot;)">
              <input name="url" type="url" placeholder="https://instagram.com/..." className={inputCls} />
            </Field>
          </div>
          <div>
            <SubmitButton>Agregar misión</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-slate-900">Liberar un teléfono</p>
        <p className="mt-1 text-xs text-slate-500">
          Los teléfonos no se verifican: si alguien registró un número que no era suyo, el dueño real ve &ldquo;no
          pudimos crear una tarjeta con ese teléfono&rdquo;. Liberarlo borra esa tarjeta en todos los locales (puntos,
          canjes y datos) y queda en la auditoría.
        </p>
        <form action={accionLiberarTelefonoLoyalty} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Teléfono">
            <input name="telefono" inputMode="tel" placeholder="351 555 1234" required className={inputCls} />
          </Field>
          <div>
            <SubmitButton>Liberar</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-slate-900">Últimos 30 días</p>
        <p className="mt-2 text-sm text-slate-600">
          {metricas.tarjetas} socios ({metricas.nuevas30d} nuevos) · {metricas.visitas30d} visitas · {metricas.canjes30d} canjes ·{" "}
          {metricas.clicsWallet30d} de {metricas.registros30d} registros tocaron &ldquo;Guardar en Google Wallet&rdquo;.
        </p>
        <p className="mt-1 text-xs text-slate-500">El detalle por socio lo ve el comercio en su portal, pestaña &ldquo;Club de beneficios&rdquo;.</p>
      </Card>
    </div>
  );
}
