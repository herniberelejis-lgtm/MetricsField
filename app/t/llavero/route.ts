import { NextResponse, type NextRequest } from "next/server";
import { salPinAutogestion, vincularPiezasACuenta } from "@/lib/db";
import { cuentaActual } from "@/lib/cuenta-piezas";
import {
  codigoDelTicket,
  empezarModoSumar,
  guardarEnLlavero,
  modoSumarActivo,
  quitarDelLlavero,
  ticketVigente,
} from "@/lib/llavero";
import { ipDelRequest, limpiarVencidos, permitir } from "@/lib/ratelimit";

// Escribe el llavero de piezas sin redibujar la página (ver el ticket en
// lib/llavero-core.ts): una cookie puesta desde una server action hace que
// Next vuelva a dibujar la pantalla donde está el usuario, y al activar o
// entregar eso le borraba el PIN que tenía que anotar.
//
// - "sumar-ticket": suma la pieza recién activada (el ticket lo firmó la
//   action de activar, vale 5 minutos y solo con el PIN de ese momento).
// - "quitar": saca una pieza de ESTE navegador (no toca la pieza).
export async function POST(req: NextRequest) {
  // Solo desde nuestras propias páginas (un formulario de otro sitio no
  // puede tocar el llavero de nadie: la cookie igual no viajaría, SameSite).
  const origen = req.headers.get("origin");
  if (origen) {
    let host = "";
    try {
      host = new URL(origen).host; // "null" (iframe aislado, etc.) no es una URL
    } catch {
      // queda vacío: no coincide
    }
    if (host !== req.headers.get("host")) return NextResponse.json({ ok: false }, { status: 403 });
  }
  limpiarVencidos();
  if (!(await permitir(`llavero:${ipDelRequest(req.headers)}`, 120, 10 * 60_000))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let cuerpo: { op?: string; ticket?: string; codigo?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (cuerpo.op === "sumar-ticket") {
    const ticket = String(cuerpo.ticket ?? "").slice(0, 200);
    const codigo = codigoDelTicket(ticket);
    const sal = codigo ? await salPinAutogestion(codigo) : null;
    if (!codigo || !ticketVigente(ticket, sal)) return NextResponse.json({ ok: false }, { status: 400 });
    await guardarEnLlavero(codigo, sal);
    const email = await cuentaActual();
    if (email) await vincularPiezasACuenta([codigo], email);
    // Si estaba sumando piezas, la espera sigue abierta para la próxima.
    if (await modoSumarActivo()) await empezarModoSumar();
    return NextResponse.json({ ok: true });
  }

  if (cuerpo.op === "quitar") {
    const codigo = String(cuerpo.codigo ?? "").slice(0, 80);
    if (!/^[a-z0-9-]{1,80}$/.test(codigo)) return NextResponse.json({ ok: false }, { status: 400 });
    await quitarDelLlavero(codigo);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
