"use server";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearCookiePassword, SESION_MAX_MS } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/db";
import { permitir, limpiarVencidos, ipDelRequest } from "@/lib/ratelimit";

export async function accionLogin(fd: FormData): Promise<void> {
  // Rate limit: la contraseña compartida protege todo el panel — sin esto
  // se puede probar por fuerza bruta sin límite.
  limpiarVencidos();
  const ip = ipDelRequest(await headers());
  if (!permitir(`login:${ip}`, 10, 15 * 60_000)) {
    redirect("/login?error=limite");
  }

  const password = process.env.ADMIN_PASSWORD;
  const intento = String(fd.get("password") ?? "");
  // Comparación en tiempo constante para no filtrar la contraseña por timing.
  const ok =
    !!password &&
    intento.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(intento), Buffer.from(password));
  if (!ok) {
    redirect("/login?error=1");
  }

  const jar = await cookies();
  jar.set("admin_session", await crearCookiePassword(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESION_MAX_MS / 1000,
    path: "/",
  });
  // Login por contraseña compartida: sin identidad de quién es, queda
  // igual registrado en la auditoría (como "equipo (sin identificar)").
  await registrarAuditoria(null, "login", "Inicio de sesión con contraseña compartida");
  redirect("/admin");
}

export async function accionLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete("admin_session");
  jar.delete("admin_google_session");
  redirect("/login");
}
