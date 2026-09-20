import { cookies } from "next/headers";
import { obtenerMembresiaPorTokenHash } from "@/lib/db/loyalty";
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
export default async function TarjetaPage() {
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

        <div className="mt-6 space-y-3">
          {linkGoogleWallet && (
            <a
              href={linkGoogleWallet}
              className="block w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
            >
              Agregar a Google Wallet
            </a>
          )}
          <a
            href="/tarjeta/pase.pkpass"
            className="block w-full rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
          >
            Agregar a Apple Wallet
          </a>
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
