import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCliente,
  getResenas,
  getSucursales,
  getUsuariosPortal,
  getEstadosSyncGoogle,
  getResumenSemanal,
  type EstadoSyncGoogle,
} from "@/lib/db";
import { linkPortalDe } from "@/lib/alertas";
import { textoWhatsAppResumen, type ResumenSemanal } from "@/lib/resumen-semanal";
import { waUrl } from "@/lib/whatsapp";
import { oauthConfigurado, oauthVerificado } from "@/lib/google-oauth";
import {
  accionRegenerarCodigo,
  accionSincronizarGoogle,
  accionDesconectarGoogleComercio,
  accionAgregarUsuarioPortal,
  accionQuitarUsuarioPortal,
  accionProbarResumenSemanal,
} from "@/app/actions";
import {
  metricaActual,
  metricaAnterior,
  citasIA,
  ingresoNFC,
} from "@/lib/types";
import { fmtARS, fmtNum, fmtMes, delta, fmtDec } from "@/lib/format";
import {
  Card,
  Kpi,
  PageHeader,
  PlanBadge,
  EstadoBadge,
  Stars,
  Sparkline,
} from "@/components/ui";
import ResumenResenas, { calcularResumenResenas } from "@/components/ResumenResenas";
import AccionesClienteMenu from "@/components/AccionesClienteMenu";
import { asegurarAdminPagina, emailAdminActual } from "@/lib/auth";

export const dynamic = "force-dynamic";
// "Sincronizar ahora" corre acá: la primera vez trae toda la historia de
// Google (miles de reseñas y meses de métricas). El default de Vercel corta antes.
export const maxDuration = 60;

const ERRORES: Record<string, string> = {
  "sync-google-sin-clave":
    "No se pudo traer el rating: en este entorno no está cargada GOOGLE_PLACES_API_KEY. Si estás en una preview es normal (las claves de Google son solo de Production); en app.metricsfield.com sí funciona.",
  "sync-google":
    'No se pudo sincronizar con Google — revisá que el Place ID sea correcto (usá el buscador por nombre en "Editar suscripción" en vez de pegarlo a mano) y que GOOGLE_PLACES_API_KEY esté configurada en Vercel.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await asegurarAdminPagina();
  const c = await getCliente((await params).id);
  return { title: c?.nombre ?? "Cliente" };
}

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; mail?: string; detalle?: string }>;
}) {
  await asegurarAdminPagina();
  const { id } = await params;
  const { error, mail, detalle } = await searchParams;
  const [c, resenas, estadosGoogle] = await Promise.all([getCliente(id), getResenas(id), getEstadosSyncGoogle(id)]);
  if (!c) notFound();
  const resumenResenas = calcularResumenResenas(resenas);

  // Multi-sucursal: si esta fila es una cuenta, traemos sus sucursales para
  // listarlas acá. Si es una sucursal, traemos la cuenta raíz para el
  // breadcrumb y para no mostrarle código/facturación propios (viven en la
  // raíz — ver resolverCuenta en lib/db.ts).
  const [sucursales, cuentaRaiz, usuariosPortal] = await Promise.all([
    c.comercioPadreId ? Promise.resolve([]) : getSucursales(c.id),
    c.comercioPadreId ? getCliente(c.comercioPadreId) : Promise.resolve(undefined),
    c.comercioPadreId ? Promise.resolve([]) : getUsuariosPortal(c.id),
  ]);
  // El portal se abre siempre con el código de la cuenta raíz; una sucursal
  // se elige con ?sucursal=. El código propio de la sucursal no abre nada.
  const linkPortal = cuentaRaiz
    ? `/portal/${cuentaRaiz.codigoAcceso}?sucursal=${c.id}`
    : `/portal/${c.codigoAcceso}`;

  // Resumen del lunes: el mismo que llega por mail, listo para WhatsApp.
  const [resumenSemanal, linkPortalAbsoluto, emailAdmin] = await Promise.all([
    getResumenSemanal(c).catch(() => null),
    linkPortalDe(c, ""),
    emailAdminActual(),
  ]);
  const textoResumen = resumenSemanal ? textoWhatsAppResumen(resumenSemanal, linkPortalAbsoluto) : null;
  const telefonoCliente = c.contacto.replace(/\D/g, "");

  const gbpConfigurable = oauthConfigurado();
  const gbpConectado = Boolean(c.googleConectadoEn);
  const diasConectado = c.googleConectadoEn
    ? Math.floor((Date.now() - new Date(c.googleConectadoEn).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  // App todavía en modo Testing de Google: el permiso vence ~7 días
  // después de conectar y hay que reconectar. oauthVerificado() es el
  // flag a mano (GOOGLE_OAUTH_VERIFIED) que se prende el día que llegue esa
  // verificación — recién ahí el aviso deja de aplicar, sin importar
  // diasConectado.
  const gbpPorVencer = !oauthVerificado() && diasConectado !== null && diasConectado >= 6;

  const m = metricaActual(c);
  const prev = metricaAnterior(c);
  const esPremium = c.plan === "Premium";

  const dResenas = delta(m?.resenasNuevas ?? 0, prev?.resenasNuevas ?? 0);
  const dVisitas = delta(m?.visitasPerfil ?? 0, prev?.visitasPerfil ?? 0);
  const dCitas = delta(citasIA(m), citasIA(prev));

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-[#FFF4E8] px-3 py-2 text-sm text-[#8A3F00]">
          {ERRORES[error] ?? "No se pudo guardar — revisá los datos y probá de nuevo."}
        </div>
      )}
      <div className="mb-4 text-sm">
        {cuentaRaiz ? (
          <Link href={`/admin/clientes/${cuentaRaiz.id}`} className="text-slate-600 hover:text-[#1F4E80]">
            ← {cuentaRaiz.nombre}
          </Link>
        ) : (
          <Link href="/admin/clientes" className="text-slate-600 hover:text-[#1F4E80]">
            ← Clientes
          </Link>
        )}
      </div>

      {cuentaRaiz && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          Sucursal de {cuentaRaiz.nombre}
        </div>
      )}

      <PageHeader
        title={c.nombre}
        subtitle={`${c.rubro} · ${c.zona} · alta ${new Date(c.fechaAlta).toLocaleDateString("es-AR")}`}
        actions={
          <div className="flex items-center gap-2">
            <EstadoBadge estado={c.estado} />
            <PlanBadge plan={c.plan} />
          </div>
        }
      />

      {/* Acciones: "Cargar métricas" queda a la vista porque se usa todos
          los meses; el resto vive en el menú para no competir por atención. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/clientes/${c.id}/metricas`}
            className="inline-flex min-h-[36px] items-center rounded-full bg-[#1F4E80] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#183F68]"
          >
            + Cargar métricas
          </Link>
          <Link
            href={`/admin/clientes/${c.id}/loyalty`}
            className="inline-flex min-h-[36px] items-center rounded-full border border-[#D6D9DE] bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 hover:border-[#A9C5E6] hover:bg-[#F7F9FC]"
          >
            Club de beneficios
          </Link>
        </div>

        <AccionesClienteMenu id={c.id} nombre={c.nombre} />
      </div>

      {/* Acceso del cliente a su portal — vive en la cuenta raíz; una
          sucursal no tiene portal propio. */}
      {!c.comercioPadreId && (
        <div className="mb-4 rounded-2xl bg-[#F4F7FB] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[#1F4E80]">
                Portal del cliente
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Código de acceso:{" "}
                <code className="rounded bg-white px-2 py-0.5 font-mono text-sm font-semibold text-slate-900">
                  {c.codigoAcceso}
                </code>
                <span className="ml-3 text-slate-600">
                  Link:{" "}
                  <Link
                    href={`/portal/${c.codigoAcceso}`}
                    className="font-medium text-[#1F4E80] hover:underline"
                    target="_blank"
                  >
                    /portal/{c.codigoAcceso}
                  </Link>
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Compartile este link por WhatsApp: ve solo sus datos, su evolución
                y las recomendaciones del mes.
              </p>
            </div>
            <form action={accionRegenerarCodigo}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400"
              >
                Regenerar código
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Login con Google del portal — vive en la cuenta raíz, igual que el
          código de acceso. En cuanto hay un email cargado, el link deja de
          alcanzar solo: ese email tiene que loguearse con Google para ver
          el portal (ver lib/portal-auth.ts). */}
      {!c.comercioPadreId && (
        <div className="mb-4 rounded-xl border border-[#E4E6EA] bg-white p-4">
          <div className="text-xs font-medium text-slate-600">
            Login con Google del portal
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {usuariosPortal.length > 0
              ? "El portal exige loguearse con una de estas cuentas de Google además del link."
              : "Sin ningún email cargado, el portal sigue abriendo solo con el link (como siempre)."}
          </p>

          {usuariosPortal.length > 0 && (
            <ul className="mt-3 divide-y divide-[#EEF0F3] rounded-lg border border-[#EEF0F3]">
              {usuariosPortal.map((u) => (
                <li key={u.email} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    {u.email}
                    {u.nombre && <span className="ml-2 text-slate-600">({u.nombre})</span>}
                  </span>
                  <form action={accionQuitarUsuarioPortal}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="email" value={u.email} />
                    <button type="submit" className="text-xs text-[#8A3F00] hover:underline">
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={accionAgregarUsuarioPortal} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input
              type="email"
              name="email"
              required
              placeholder="email@delcliente.com"
              className="min-w-[220px] flex-1 rounded-lg border border-[#D6D9DE] px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              name="nombre"
              placeholder="Nombre (opcional)"
              className="w-40 rounded-lg border border-[#D6D9DE] px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-[36px] items-center rounded-full bg-[#1F4E80] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#183F68]"
            >
              Agregar
            </button>
          </form>
        </div>
      )}

      {/* Sucursales de esta cuenta */}
      {!c.comercioPadreId && (
        <div className="mb-4 rounded-xl border border-[#E4E6EA] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-600">
                Sucursales
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {sucursales.length === 0
                  ? "Todavía gestiona un solo local. Agregá una sucursal si abre otro."
                  : `${sucursales.length} local${sucursales.length === 1 ? "" : "es"}, cada uno con su propia ficha de Google.`}
              </p>
            </div>
            <Link
              href={`/admin/clientes/${c.id}/sucursales/nueva`}
              className="shrink-0 rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
            >
              + Agregar sucursal
            </Link>
          </div>
          {sucursales.length > 0 && (
            <div className="mt-3 divide-y divide-[#EEF0F3] border-t border-[#EEF0F3]">
              {sucursales.map((s) => {
                const sm = metricaActual(s);
                return (
                  <Link
                    key={s.id}
                    href={`/admin/clientes/${s.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800">{s.nombre}</div>
                      <div className="text-xs text-slate-600">{s.zona}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {sm ? <Stars rating={sm.ratingPromedio} /> : <span className="text-xs text-slate-600">sin datos</span>}
                      <EstadoBadge estado={s.estado} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ficha */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs font-medium text-slate-600">
            Contacto
          </div>
          <div className="mt-1 text-sm text-slate-800">{c.contacto}</div>
          <a
            href={c.googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-[#1F4E80] hover:underline"
          >
            Link de reseñas (NFC) ↗
          </a>
        </Card>
        <Card>
          <div className="text-xs font-medium text-slate-600">
            Búsqueda clave
          </div>
          <div className="mt-1 text-sm text-slate-800">“{c.busquedaClave}”</div>
          <p className="mt-2 text-xs text-slate-600">
            Cómo lo busca la gente en Google (rubro + zona).
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium text-slate-600">
            {c.comercioPadreId ? "Producto NFC vendido" : "Facturación"}
          </div>
          {c.comercioPadreId ? (
            <div className="mt-1 text-sm text-slate-800">{fmtARS(ingresoNFC(c))}</div>
          ) : (
            <>
              <div className="mt-1 text-sm text-slate-800">
                Abono mensual {fmtARS(c.fee)}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Producto NFC vendido: {fmtARS(ingresoNFC(c))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Sincronización automática con Google (Places API) */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-600">
              Rating y reseñas — automático (Google Places API)
            </div>
            {c.googlePlaceId ? (
              c.googleSyncEn ? (
                <div className="mt-1 text-sm text-slate-800">
                  {c.ratingGoogle != null ? fmtDec(c.ratingGoogle) : "—"}★ · {fmtNum(c.resenasGoogle ?? 0)} reseñas
                  <span className="ml-2 text-xs text-slate-600">
                    actualizado {new Date(c.googleSyncEn).toLocaleString("es-AR")}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-600">
                  Todavía no se sincronizó — tocá "Sincronizar ahora".
                </div>
              )
            ) : (
              <div className="mt-1 text-sm text-slate-600">
                Cargá el Google Place ID en "Editar suscripción" para activar esto.
              </div>
            )}
          </div>
          {c.googlePlaceId && (
            <form action={accionSincronizarGoogle}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                Sincronizar ahora
              </button>
            </form>
          )}
        </div>

        {/* Visitas y llamadas: el CLIENTE conecta su propia cuenta de Google
            desde su portal — el admin acá solo ve el estado, no dispara la
            conexión (no es cuenta del admin la que hace falta, es la del
            dueño de la ficha). */}
        <div className="mt-3 border-t border-[#EEF0F3] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-600">
              Visitas, llamadas y "cómo llegar" — automático (Business Profile)
            </div>
            {gbpConectado && (
              <form action={accionDesconectarGoogleComercio}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-slate-600 hover:text-[#8A3F00]"
                >
                  Desconectar
                </button>
              </form>
            )}
          </div>
          {!gbpConfigurable ? (
            <p className="mt-1 text-sm text-slate-600">
              Para activarlo hay que configurar el OAuth de Google
              (GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en Vercel).
            </p>
          ) : !gbpConectado ? (
            <p className="mt-1 text-sm text-slate-600">
              Todavía no conectó su cuenta de Google. Se conecta desde SU
              portal (
              <Link href={linkPortal} className="text-[#1F4E80] hover:underline" target="_blank">
                {linkPortal}
              </Link>
              ) — mandale el link y decile que toque "Conectar tu Google
              Business Profile".
            </p>
          ) : (
            <>
              <EstadoSync titulo="Visitas, llamadas y búsquedas" estado={estadosGoogle.rendimiento} />
              <EstadoSync titulo="Reseñas de Google" estado={estadosGoogle.resenas} />
              <p className="mt-1 text-sm text-slate-800">
                {c.googleLocation
                  ? `Ficha vinculada — visitas, llamadas y "cómo llegar" se actualizan solas cada día.`
                  : "Cuenta conectada — la ficha se vincula sola en la próxima sincronización."}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Conectado {diasConectado === 0 ? "hoy" : `hace ${diasConectado} día${diasConectado === 1 ? "" : "s"}`}.
              </p>
              {gbpPorVencer && (
                <p className="mt-2 rounded-lg bg-[#FFF4E8] px-3 py-2 text-xs text-[#8A3F00]">
                  Mientras MetricsField no esté verificada por Google, este permiso
                  vence a los 7 días. Pedile al cliente que vuelva a tocar
                  "Conectar" desde su portal esta semana.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      <ResumenDelLunes
        resumen={resumenSemanal}
        texto={textoResumen}
        whatsapp={textoResumen && telefonoCliente.length >= 8 ? waUrl(telefonoCliente, textoResumen) : null}
        email={c.emailNotificaciones}
        clienteId={c.id}
        emailAdmin={emailAdmin}
        prueba={mail === "ok" || mail === "error" ? { ok: mail === "ok", detalle: detalle ?? "" } : null}
      />

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Kpi
          label="Reseñas nuevas"
          value={fmtNum(m?.resenasNuevas ?? 0)}
          hint={`total ${m?.resenasTotal ?? 0}`}
          delta={{
            dir: dResenas.dir,
            text: `${dResenas.valor >= 0 ? "+" : ""}${dResenas.valor} vs mes previo`,
            good: dResenas.dir === "up",
          }}
        />
        <Kpi
          label="Visitas al perfil"
          value={fmtNum(m?.visitasPerfil ?? 0)}
          delta={{
            dir: dVisitas.dir,
            text:
              dVisitas.pct !== null
                ? `${dVisitas.valor >= 0 ? "+" : ""}${dVisitas.pct.toFixed(0)}%`
                : `${dVisitas.valor}`,
            good: dVisitas.dir === "up",
          }}
        />
        <Kpi
          label={esPremium ? "Citaciones en IA" : "Llamadas"}
          value={fmtNum(esPremium ? citasIA(m) : (m?.llamadas ?? 0))}
          delta={
            esPremium
              ? {
                  dir: dCitas.dir,
                  text: `${dCitas.valor >= 0 ? "+" : ""}${dCitas.valor} vs mes previo`,
                  good: dCitas.dir === "up",
                }
              : undefined
          }
          hint={esPremium ? "ChatGPT+Copilot+Perplexity" : "vía Google Maps"}
        />
      </div>

      {/* Reseñas: resumen de buenas y malas de un vistazo — reemplaza al
          viejo botón "CRM de reseñas" como pestaña aparte. Para responder
          una reseña puntual o cargar una a mano, ese detalle sigue en /crm. */}
      <h2 className="mb-3 mt-8 flex items-center justify-between text-sm font-semibold text-slate-900">
        Reseñas
        <Link href={`/admin/clientes/${c.id}/crm`} className="text-xs font-medium text-[#1F4E80] hover:underline">
          Gestionar todas las reseñas →
        </Link>
      </h2>
      <ResumenResenas data={resumenResenas} />

      {/* Evolución */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Evolución
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Reseñas acumuladas
            </span>
            <Stars rating={m?.ratingPromedio ?? 0} />
          </div>
          <Sparkline
            values={c.historico.map((h) => h.resenasTotal)}
            width={280}
            height={60}
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Visitas al perfil
            </span>
          </div>
          <Sparkline
            values={c.historico.map((h) => h.visitasPerfil)}
            width={280}
            height={60}
          />
        </Card>
      </div>

      {/* Tabla histórica */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">
        Detalle mensual
      </h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4E6EA] text-left text-xs text-slate-600">
              <th className="px-4 py-3 font-medium">Mes</th>
              <th className="px-4 py-3 font-medium">Reseñas nuevas</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Visitas</th>
              <th className="px-4 py-3 font-medium">Llamadas</th>
              {esPremium && <th className="px-4 py-3 font-medium">Citas IA</th>}
            </tr>
          </thead>
          <tbody>
            {[...c.historico].reverse().map((h) => (
              <tr
                key={h.mes}
                className="border-b border-[#EEF0F3] last:border-0"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  {fmtMes(h.mes)}
                </td>
                <td className="px-4 py-3">{fmtNum(h.resenasNuevas)}</td>
                <td className="px-4 py-3">{fmtNum(h.resenasTotal)}</td>
                <td className="px-4 py-3">{fmtDec(h.ratingPromedio)}</td>
                <td className="px-4 py-3">{fmtNum(h.visitasPerfil)}</td>
                <td className="px-4 py-3">{fmtNum(h.llamadas)}</td>
                {esPremium && (
                  <td className="px-4 py-3">{fmtNum(citasIA(h))}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// Resultado de la última sincronización con Business Profile (bien o mal, y
// por qué). Los logs de Vercel duran una hora: esto es lo que queda.
function EstadoSync({ titulo, estado }: { titulo: string; estado: EstadoSyncGoogle | null }) {
  if (!estado) {
    return (
      <p className="mt-2 text-xs text-slate-600">
        {titulo}: todavía no se sincronizó — tocá &quot;Sincronizar ahora&quot;.
      </p>
    );
  }
  return (
    <div
      className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
        estado.ok ? "bg-[#EAF7F0] text-[#0B5E40]" : "bg-[#FFF4E8] text-[#8A3F00]"
      }`}
    >
      <span className="font-semibold">
        {estado.ok ? "✓" : "✗"} {titulo}
      </span>{" "}
      <span className="text-[11px] opacity-70">({new Date(estado.fecha).toLocaleString("es-AR")})</span>
      <div className="mt-0.5">{estado.mensaje}</div>
    </div>
  );
}

// "Tu semana en Google": el resumen del lunes de este cliente. El mail sale
// solo los lunes 9:00 (cron); por WhatsApp se manda desde acá, a mano y
// gratis (un link wa.me con el texto ya escrito).
function ResumenDelLunes({
  resumen,
  texto,
  whatsapp,
  email,
  clienteId,
  emailAdmin,
  prueba,
}: {
  resumen: ResumenSemanal | null;
  texto: string | null;
  whatsapp: string | null;
  email: string;
  clienteId: string;
  emailAdmin: string | null;
  prueba: { ok: boolean; detalle: string } | null;
}) {
  return (
    <Card className="mb-4 scroll-mt-6" id="resumen-lunes">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-600">Resumen del lunes</div>
          <p className="mt-1 text-xs text-slate-600">
            {email
              ? `Sale solo por mail a ${email} cada lunes a las 9.`
              : "Sin mail de notificaciones cargado: por ahora solo se puede mandar por WhatsApp desde acá."}
          </p>
        </div>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#0B5E40] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#094A33]"
          >
            Mandar por WhatsApp
          </a>
        )}
      </div>
      {resumen && texto ? (
        <div className="mt-3 max-w-md rounded-2xl rounded-tl-sm bg-[#ECE5DD] p-3">
          <div className="whitespace-pre-line rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-800">
            {texto.replace(/\*/g, "")}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Esta semana no hay nada que contar todavía (sin reseñas, toques ni conclusiones): no se manda nada.
        </p>
      )}
      {!whatsapp && texto && (
        <p className="mt-2 text-xs text-slate-600">
          Para el botón de WhatsApp, cargá un teléfono en &quot;Contacto&quot; (Editar suscripción).
        </p>
      )}

      {/* Prueba del mail: confirma que el SMTP de Vercel anda y muestra el
          mail real, o dice exactamente qué corregir. */}
      <form action={accionProbarResumenSemanal} className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#EEF0F3] pt-4">
        <input type="hidden" name="id" value={clienteId} />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          Mandar una prueba de este mail a
          <input
            type="email"
            name="para"
            required
            defaultValue={emailAdmin ?? ""}
            placeholder="tu@mail.com"
            className="rounded-lg border border-[#D6D9DE] px-3 py-1.5 text-sm text-slate-800"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-[#D6D9DE] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
        >
          Probar mail
        </button>
      </form>
      {prueba && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${
            prueba.ok ? "bg-[#EAF7F0] text-[#0B5E40]" : "bg-[#FFF4E8] text-[#8A3F00]"
          }`}
        >
          <span className="font-semibold">{prueba.ok ? "✓ Mail enviado. " : "✗ No se pudo mandar. "}</span>
          {prueba.detalle}
        </p>
      )}
    </Card>
  );
}
