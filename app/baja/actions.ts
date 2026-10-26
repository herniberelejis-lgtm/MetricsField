"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { darDeBajaNovedades } from "@/lib/db";
import { bajaValida } from "@/lib/baja";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

// Baja del aviso semanal de las piezas: con botón (no al abrir el link),
// para que un antivirus o un previsualizador de mails que abre los links
// no dé de baja a nadie sin querer.
export async function confirmarBaja(fd: FormData): Promise<void> {
  const email = String(fd.get("e") ?? "").slice(0, 200);
  const firma = String(fd.get("f") ?? "").slice(0, 200);
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!(await permitir(`baja-novedades:${ip}`, 10, 60 * 60_000)) || !bajaValida(email, firma)) {
    redirect("/baja?estado=invalido");
  }
  await darDeBajaNovedades(email);
  redirect("/baja?estado=listo");
}
