import type { Metadata } from "next";
import { confirmarBaja } from "./actions";

export const metadata: Metadata = { title: "Darme de baja · MetricsField", robots: { index: false } };

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";

// Baja del aviso semanal gratis de las piezas (link al pie de cada mail).
export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; f?: string; estado?: string }>;
}) {
  const { e = "", f = "", estado } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: "#f8f9fa" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white px-7 py-8 text-center" style={{ boxShadow: "0 8px 24px rgba(0,0,0,.06)" }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#2563eb" }}>
          MetricsField
        </div>
        {estado === "listo" ? (
          <>
            <p className="mt-2 text-[17px] font-medium" style={{ color: INK }}>
              Listo, no te vamos a escribir más.
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: INK_SOFT }}>
              Tus piezas siguen funcionando igual.
            </p>
          </>
        ) : estado === "invalido" ? (
          <p className="mt-2 text-[15px]" style={{ color: INK }}>
            Este link de baja no es válido. Respondé el mail con la palabra BAJA y te sacamos a mano.
          </p>
        ) : (
          <form action={confirmarBaja}>
            <input type="hidden" name="e" value={e} />
            <input type="hidden" name="f" value={f} />
            <p className="mt-2 text-[17px] font-medium" style={{ color: INK }}>
              ¿Dejar de recibir el aviso semanal?
            </p>
            <p className="mt-1.5 break-all text-[13px]" style={{ color: INK_SOFT }}>
              {e}
            </p>
            <button type="submit" className="mt-5 w-full rounded-full px-6 py-3 text-[15px] font-medium text-white" style={{ background: "#2563eb" }}>
              Sí, darme de baja
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
