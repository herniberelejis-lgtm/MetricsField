"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerEnlaceAdmin, configurarPiezaAdmin } from "@/app/admin/hardware/buscador-actions";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { urlResenaGoogle } from "@/lib/url";

type Lugar = { placeId: string; nombre: string; direccion: string };

export default function BuscadorResenasAdmin({ piezas, clientes }: {
  piezas: { id: string }[];
  clientes: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [elegido, setElegido] = useState<{ nombre: string; link: string } | null>(null);
  const [pieza, setPieza] = useState("");
  const [cliente, setCliente] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [urlManual, setUrlManual] = useState("");
  const cls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  async function buscar(event: React.FormEvent) {
    event.preventDefault();
    setPendiente(true); setMensaje(""); setElegido(null); setLugares([]);
    try {
      const r = await fetch(`/api/places-search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo buscar.");
      setLugares(data.resultados);
      if (!data.resultados.length) setMensaje("Sin resultados. Agregá ciudad o dirección.");
    } catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo buscar."); }
    finally { setPendiente(false); }
  }

  async function elegir(lugar: Lugar) {
    setPendiente(true); setMensaje("");
    try {
      const r = await obtenerEnlaceAdmin(lugar.placeId);
      if (r.ok) { setElegido({ nombre: lugar.nombre, link: r.link }); setLugares([]); }
      else setMensaje(r.error);
    } catch { setMensaje("No pudimos obtener el enlace."); }
    finally { setPendiente(false); }
  }

  async function guardar() {
    if (!elegido) return;
    setPendiente(true); setMensaje("");
    try {
      const r = await configurarPiezaAdmin({ pieza, cliente, url: elegido.link });
      if (r.ok) { setMensaje("Pieza configurada. El NFC y el QR ya apuntan al negocio elegido."); setPieza(""); router.refresh(); }
      else setMensaje(r.error || "No se pudo configurar.");
    } catch { setMensaje("No pudimos confirmar el guardado. Actualizá la página antes de reintentar."); }
    finally { setPendiente(false); }
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="buscador-resenas">
    <h2 id="buscador-resenas" className="font-semibold text-slate-900">Buscar reseña y configurar pieza</h2>
    <p className="mt-1 text-sm text-slate-600">Buscá el negocio y confirmá la dirección. Podés copiar el enlace o asignarlo a una pieza libre.</p>
    <form onSubmit={buscar} className="mt-4 flex flex-wrap gap-2">
      <label className="min-w-48 flex-1"><span className="sr-only">Nombre, ciudad o dirección del negocio</span><input className={cls} value={query} onChange={e => setQuery(e.target.value)} minLength={3} maxLength={120} required placeholder="Nombre del negocio, ciudad o dirección" /></label>
      <button className={btnPrimary} disabled={pendiente || query.trim().length < 3}>Buscar negocio</button>
    </form>
    <details className="mt-4 rounded-lg border border-slate-200 p-3" open>
      <summary className="cursor-pointer text-sm font-medium">Configurar con un enlace existente (sin consultar la API)</summary>
      <label className="mt-3 block text-sm">Enlace de reseña de Google<input type="url" maxLength={2048} className={cls} value={urlManual} onChange={e => setUrlManual(e.target.value)} placeholder="https://g.page/r/…/review" /></label>
      <button type="button" className={`${btnSecondary} mt-2`} disabled={pendiente || !urlManual.trim()} onClick={() => {
        const link = urlResenaGoogle(urlManual);
        if (!link) { setMensaje("Pegá un enlace HTTPS válido de Google."); return; }
        setElegido({ nombre: "Enlace de Google ingresado manualmente", link }); setLugares([]); setMensaje("");
      }}>Usar este enlace</button>
    </details>
    {lugares.length > 0 && <ul className="mt-3 divide-y">{lugares.map(l => <li key={l.placeId}><button type="button" disabled={pendiente} onClick={() => elegir(l)} className="w-full py-3 text-left text-sm disabled:opacity-50"><strong>{l.nombre}</strong><span className="block text-slate-600">{l.direccion}</span><span className="text-blue-800">Elegir este negocio</span></button></li>)}</ul>}
    {elegido && <div className="mt-4 space-y-3">
      <strong className="block text-sm">{elegido.nombre}</strong>
      <a href={elegido.link} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-blue-800 underline">Probar enlace de reseña</a>
      <button type="button" className={btnSecondary} onClick={async () => { try { await navigator.clipboard.writeText(elegido.link); setMensaje("Enlace copiado."); } catch { setMensaje("Copiá la dirección del enlace manualmente."); } }}>Copiar enlace</button>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Cliente<select className={cls} value={cliente} onChange={e => setCliente(e.target.value)}><option value="">Elegir cliente…</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        <label className="text-sm">Pieza libre<select className={cls} value={pieza} onChange={e => setPieza(e.target.value)}><option value="">Elegir pieza…</option>{piezas.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}</select></label>
      </div>
      <button type="button" className={btnPrimary} disabled={pendiente || !cliente || !pieza} onClick={guardar}>{pendiente ? "Procesando…" : "Asignar y configurar NFC / QR"}</button>
      <p className="text-xs text-slate-600">La pieza debe tener grabado o impreso su enlace MetricsField /t/código. Guardar actualiza el destino; grabar un chip físico requiere NFC compatible.</p>
    </div>}
    <p className="mt-3 text-sm" role="status" aria-live="polite">{mensaje || (pendiente ? "Procesando…" : "")}</p>
    <p className="mt-2 text-xs text-slate-500">Datos de Google Maps. Búsquedas sujetas a cupo.</p>
  </section>;
}
