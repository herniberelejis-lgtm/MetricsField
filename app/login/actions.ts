"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function sha256(texto: string): string {
  return crypto.createHash("sha256").update(texto).digest("hex");
}

export async function accionLogin(fd: FormData): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  const intento = String(fd.get("password") ?? "");

  if (!password || intento !== password) {
    redirect("/login?error=1");
  }

  const jar = await cookies();
  jar.set("admin_session", sha256(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: "/",
  });
  redirect("/admin");
}

export async function accionLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete("admin_session");
  redirect("/login");
}
