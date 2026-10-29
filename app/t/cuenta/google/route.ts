import type { NextRequest } from "next/server";
import { empezarLoginGoogle } from "@/lib/cuenta-piezas";

// "Guardar mis piezas en mi cuenta de Google" (ver lib/cuenta-piezas.ts).
export function GET(req: NextRequest) {
  return empezarLoginGoogle(req);
}
