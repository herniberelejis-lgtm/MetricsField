"use server";

import { revalidatePath } from "next/cache";
import * as db from "@/lib/db";
import { requireAdmin, emailAdminActual } from "@/lib/auth";

// Server actions de finanzas: registrar un cobro, marcarlo pagado/pendiente
// y borrarlo. Cada mutación exige sesión de admin y deja rastro en la
// auditoría, igual que el resto del panel.

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function num(fd: FormData, key: string): number {
  const v = Number(String(fd.get(key) ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

async function auditar(accion: string, detalle = ""): Promise<void> {
  const email = await emailAdminActual();
  await db.registrarAuditoria(email, accion, detalle);
}

export async function accionRegistrarCobro(fd: FormData): Promise<void> {
  await requireAdmin();
  const comercioId = str(fd, "comercioId");
  const periodo = str(fd, "periodo");
  if (!comercioId) throw new Error("Elegí un comercio.");
  if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error("El período debe ser un mes (YYYY-MM).");

  const pagado = str(fd, "pagado") === "on";
  const cobro = await db.crearCobro({
    comercioId,
    periodo,
    concepto: str(fd, "concepto") || "abono",
    monto: num(fd, "monto"),
    metodo: str(fd, "metodo"),
    venceEl: str(fd, "venceEl") || null,
    estado: pagado ? "pagado" : "pendiente",
    pagadoEl: pagado ? new Date().toISOString().slice(0, 10) : null,
    nota: str(fd, "nota"),
  });
  await auditar("registrar_cobro", `${comercioId} · ${periodo} · $${cobro.monto}`);
  revalidatePath("/admin/finanzas");
}

export async function accionMarcarPagado(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  const pagado = str(fd, "pagado") === "true";
  if (!Number.isFinite(id)) throw new Error("Cobro inválido.");
  await db.marcarCobroPagado(id, pagado);
  await auditar(pagado ? "marcar_cobro_pagado" : "marcar_cobro_pendiente", `cobro ${id}`);
  revalidatePath("/admin/finanzas");
}

export async function accionEliminarCobro(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(str(fd, "id"));
  if (!Number.isFinite(id)) throw new Error("Cobro inválido.");
  await db.eliminarCobro(id);
  await auditar("eliminar_cobro", `cobro ${id}`);
  revalidatePath("/admin/finanzas");
}
