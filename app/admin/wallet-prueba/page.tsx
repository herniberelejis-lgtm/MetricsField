import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { asegurarAdminPagina } from "@/lib/auth";
import PaseDemo from "./PaseDemo";

export const metadata: Metadata = { title: "Prueba de Google Wallet" };
export const dynamic = "force-dynamic";

// Solo dice SI cada variable está cargada, nunca su valor.
const VARIABLES = [
  "GOOGLE_WALLET_ISSUER_ID",
  "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_WALLET_SERVICE_ACCOUNT_KEY",
] as const;

export default async function WalletPruebaPage() {
  await asegurarAdminPagina();
  const estado = VARIABLES.map((nombre) => ({ nombre, cargada: Boolean(process.env[nombre]) }));
  const todas = estado.every((v) => v.cargada);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Prueba de Google Wallet"
        subtitle="Crea una tarjeta de fidelización de prueba y te da el botón para guardarla en tu celular."
      />

      <Card className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Configuración en este ambiente</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {estado.map((v) => (
            <li key={v.nombre} className="flex items-center gap-2">
              <span className={v.cargada ? "text-emerald-600" : "text-rose-600"} aria-hidden>
                {v.cargada ? "✓" : "✕"}
              </span>
              <code className="text-xs text-slate-700">{v.nombre}</code>
              <span className="text-xs text-slate-400">{v.cargada ? "cargada" : "falta"}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        {todas ? (
          <PaseDemo />
        ) : (
          <p className="text-sm text-slate-500">
            Faltan variables en este ambiente. En Vercel están cargadas solo para Preview: abrí esta
            página desde la preview de la rama, no desde producción.
          </p>
        )}
      </Card>
    </div>
  );
}
