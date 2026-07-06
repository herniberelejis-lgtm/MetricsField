"use server";

import { revalidatePath } from "next/cache";
import { getClientePorCodigo, getResenas, actualizarResena } from "@/lib/db";

// Server actions públicas del portal: no hay sesión de admin, el código de
// acceso privado ES la credencial. Toda acción vuelve a resolver el
// comercio por el código Y confirma que la reseña que se quiere tocar es
// de ESE comercio — nunca confiar en el id que manda el formulario solo.

async function reseñaDelComercio(codigo: string, resenaId: number) {
  const cliente = await getClientePorCodigo(codigo);
  if (!cliente) throw new Error("Portal inválido.");
  const resenas = await getResenas(cliente.id);
  const resena = resenas.find((r) => r.id === resenaId);
  if (!resena) throw new Error("Esa reseña no pertenece a este portal.");
  return { cliente, resena };
}

export async function accionAprobarResenaPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const id = Number(fd.get("id"));
  const respuesta = String(fd.get("respuesta") ?? "").trim().slice(0, 2000);
  await reseñaDelComercio(codigo, id);
  if (!respuesta) throw new Error("La respuesta no puede quedar vacía.");

  await actualizarResena(id, {
    respuestaSugerida: respuesta,
    respuestaPublicada: true,
    estado: "respondida",
  });
  revalidatePath(`/portal/${codigo}`);
}

export async function accionDescartarResenaPortal(fd: FormData): Promise<void> {
  const codigo = String(fd.get("codigo") ?? "");
  const id = Number(fd.get("id"));
  await reseñaDelComercio(codigo, id);

  await actualizarResena(id, { estado: "escalada" });
  revalidatePath(`/portal/${codigo}`);
}
