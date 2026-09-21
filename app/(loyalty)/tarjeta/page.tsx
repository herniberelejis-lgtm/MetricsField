import { cookies } from "next/headers";
import {
  obtenerMembresiaPorTokenHash,
  listarBeneficios,
  obtenerCanjePendienteDeMembresia,
} from "@/lib/db/loyalty";
import { pedirCanjeAction } from "./actions";
import { hashToken, descifrar } from "@/lib/loyalty/identidad";
import { NOMBRE_COOKIE_MEMBRESIA, tokenConFormaValida } from "@/lib/loyalty/sesion";
import { generarLinkGuardar } from "@/lib/wallet/google";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// CONEXIONES
//   Sesión: lee la cookie loyalty_membresia (lib/loyalty/sesion.ts), la
//   hashea (lib/loyalty/identidad.ts::hashToken) y resuelve la membresía
//   con lib/db/loyalty.ts::obtenerMembresiaPorTokenHash — la ÚNICA forma
//   de "iniciar sesión" en Loyalty. Sin cookie válida no hay forma de ver
//   la tarjeta en el MVP (no hay recuperación por teléfono desde acá).
//   La escribe: app/(loyalty)/l/[codigo]/actions.ts, al registrarse.
//   Link a: /tarjeta/pase.pkpass (Route Handler, para iPhone).
const MENSAJES_CANJE: Record<string, string> = {
  pedido: "Listo. Mostrale esta pantalla al comercio: tenés 5 minutos.",
  saldo_insuficiente: "Todavía no te alcanzan los puntos para ese beneficio.",
  ya_pendiente: "Ya tenés un canje esperando en el comercio.",
  beneficio_invalido: "Ese beneficio ya no está disponible.",
  demasiados: "Hiciste demasiados intentos. Probá de nuevo en un rato.",
};

function horaLocal(fecha: Date): string {
  return fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function TarjetaPage({
  searchParams,
}: {
  searchParams: Promise<{ canje?: string }>;
}) {
  const { canje } = await searchParams;
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE_MEMBRESIA)?.value;

  if (!tokenConFormaValida(token)) {
    return <SinTarjeta />;
  }

  const membresia = await obtenerMembresiaPorTokenHash(hashToken(token));
  if (!membresia) {
    return <SinTarjeta />;
  }

  const nombreCliente = descifrar(membresia.nombreCifrado);
  const [beneficios, canjePendiente] = await Promise.all([
    listarBeneficios(membresia.programaId),
    obtenerCanjePendienteDeMembresia(membresia.id),
  ]);
  const mensajeCanje = canje ? MENSAJES_CANJE[canje] : undefined;

  // Nunca mostrar un botón que falla (plan L0/L4): el de Apple solo aparece
  // si las cinco credenciales del pase están cargadas — las mismas que
  // exige lib/wallet/apple.ts para poder firmarlo.
  const appleDisponible = Boolean(
    process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_PASS_CERT &&
      process.env.APPLE_PASS_KEY &&
      process.env.APPLE_WWDR_CERT,
  );

  let linkGoogleWallet: string | null = null;
  if (membresia.googleObjectId) {
    try {
      linkGoogleWallet = generarLinkGuardar({ objectId: membresia.googleObjectId });
    } catch {
      // Sin credenciales de Google configuradas todavía (ver L0) — la
      // tarjeta se sigue mostrando igual, solo sin ese botón.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6">
      <Card variant="glass" className="w-full max-w-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {membresia.nombreComercio} · Loyalty
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Hola, {nombreCliente}</h1>
        <p className="mt-4 text-4xl font-bold text-slate-900">{membresia.saldo}</p>
        <p className="text-sm text-slate-500">puntos</p>
        <p className="mt-3 text-xs text-slate-400">{membresia.visitas} visitas registradas</p>

        {mensajeCanje && (
          <p role="status" className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {mensajeCanje}
          </p>
        )}

        {canjePendiente ? (
          <div className="mt-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Canje en curso</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{canjePendiente.beneficioNombre}</p>
            <p className="mt-1 text-sm text-slate-600">
              Mostrale esta pantalla al comercio. Vence a las {horaLocal(canjePendiente.expiraEn)}.
            </p>
          </div>
        ) : (
          beneficios.length > 0 && (
            <div className="mt-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canjear puntos</p>
              <ul className="mt-2 space-y-2">
                {beneficios.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-800">
                      {b.nombre} · <span className="text-slate-500">{b.costoPuntos} pts</span>
                    </span>
                    <form action={pedirCanjeAction}>
                      <input type="hidden" name="beneficioId" value={b.id} />
                      <button
                        type="submit"
                        disabled={membresia.saldo < b.costoPuntos}
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white disabled:bg-slate-300"
                      >
                        Canjear
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        <div className="mt-6 space-y-3">
          {linkGoogleWallet && (
            <a
              href={linkGoogleWallet}
              className="block w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
            >
              Agregar a Google Wallet
            </a>
          )}
          {appleDisponible && (
            <a
              href="/tarjeta/pase.pkpass"
              className="block w-full rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
            >
              Agregar a Apple Wallet
            </a>
          )}
          {!linkGoogleWallet && !appleDisponible && (
            <p className="text-xs text-slate-500">
              Tu tarjeta ya está activa. Guardá esta página en favoritos para ver tu saldo cuando quieras.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function SinTarjeta() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6">
      <Card variant="glass" className="w-full max-w-sm text-center">
        <h1 className="text-lg font-bold text-slate-900">No encontramos tu tarjeta</h1>
        <p className="mt-3 text-sm text-slate-500">
          Puede que borraste las cookies o cambiaste de teléfono. Volvé a tocar el cartel del
          comercio para registrarte de nuevo — tu teléfono te va a devolver el mismo saldo.
        </p>
      </Card>
    </div>
  );
}
