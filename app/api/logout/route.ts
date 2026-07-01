import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const jar = await cookies();
  jar.delete("admin_session");
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
