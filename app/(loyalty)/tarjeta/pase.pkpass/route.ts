import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";
import { obtenerMembresiaPorTokenHash } from "@/lib/db/loyalty";
import { hashToken, descifrar } from "@/lib/loyalty/identidad";
import { NOMBRE_COOKIE_MEMBRESIA, tokenConFormaValida } from "@/lib/loyalty/sesion";
import { generarPkpass } from "@/lib/wallet/apple";

// CONEXIONES
//   Sesión: misma resolución que app/(loyalty)/tarjeta/page.tsx (cookie
//   → hashToken → obtenerMembresiaPorTokenHash) — es un Route Handler y
//   no un Server Component porque Apple Wallet necesita un GET que
//   devuelva el binario .pkpass con su Content-Type exacto para que el
//   sistema operativo lo intercepte y ofrezca "Agregar a Wallet"; una
//   Server Action no puede devolver eso.
//   Se conecta a: lib/wallet/apple.ts (genera el .pkpass) — necesita un
//   icon.png real en ASSETS_DIR, que hoy NO EXISTE en el repo (ver
//   docs/LOYALTY-PRODUCTO-COMPLETO.md §12, "de dónde salen los assets de
//   marca" — gap de producto, no de código). Sin ese archivo, este route
//   devuelve 503 con un mensaje claro en vez de fabricar un ícono falso.
export const dynamic = "force-dynamic";

const ASSETS_DIR = path.join(process.cwd(), "public", "loyalty");

async function leerAssetOpcional(nombre: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(ASSETS_DIR, nombre));
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE_MEMBRESIA)?.value;
  if (!tokenConFormaValida(token)) {
    return NextResponse.json({ error: "No hay una tarjeta activa en esta sesión." }, { status: 401 });
  }

  const membresia = await obtenerMembresiaPorTokenHash(hashToken(token));
  if (!membresia) {
    return NextResponse.json({ error: "No hay una tarjeta activa en esta sesión." }, { status: 401 });
  }

  const icon = await leerAssetOpcional("icon.png");
  if (!icon) {
    return NextResponse.json(
      {
        error:
          "Todavía no se puede emitir a Apple Wallet: falta el ícono de marca " +
          "(public/loyalty/icon.png). Ver docs/LOYALTY-PRODUCTO-COMPLETO.md §12.",
      },
      { status: 503 },
    );
  }

  const assets: Record<string, Buffer> = { "icon.png": icon };
  const icon2x = await leerAssetOpcional("icon@2x.png");
  if (icon2x) assets["icon@2x.png"] = icon2x;
  const logo = await leerAssetOpcional("logo.png");
  if (logo) assets["logo.png"] = logo;
  const logo2x = await leerAssetOpcional("logo@2x.png");
  if (logo2x) assets["logo@2x.png"] = logo2x;

  const origen = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.metricsfield.com";

  let pkpass: Buffer;
  try {
    pkpass = await generarPkpass(
      {
        serialNumber: membresia.id,
        nombreComercio: membresia.nombreComercio,
        nombreCliente: descifrar(membresia.nombreCifrado),
        urlTarjeta: `${origen}/tarjeta`,
      },
      assets,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo generar el pase de Apple Wallet." },
      { status: 503 },
    );
  }

  return new NextResponse(new Uint8Array(pkpass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="tarjeta.pkpass"',
      "Cache-Control": "no-store",
    },
  });
}
