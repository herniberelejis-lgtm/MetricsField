import { RATING_COLORS } from "@/lib/palette";
import { contarSemaforo, type ResenaParaSemaforo } from "@/lib/semaforo";

// Semáforo de reseñas: cuántas buenas (4–5★), medias (3★) y malas (1–2★),
// cada reseña como un punto de color, y un aviso si hay alguna mala para
// responder. Rojo→verde a propósito (mismo criterio que el mapa por hora):
// el número viaja siempre en texto también, nunca solo en el color.
//
// Con fuente "google" NO hay semáforo: las 5 reseñas que da Places las elige
// Google por "relevancia" (suelen ser viejas y buenas), así que un 100%
// buenas sobre ellas no dice cómo vienen las reseñas — decía "5 buenas,
// 100%" aunque el mes viniera con malas. En ese caso la tarjeta muestra lo
// que esas 5 sí son: lo primero que ve un cliente al abrir la ficha.

const VERDE = RATING_COLORS[5];
const AMARILLO = RATING_COLORS[3];
const ROJO = RATING_COLORS[1];

function colorDe(estrellas: number): string {
  return estrellas >= 4 ? VERDE : estrellas === 3 ? AMARILLO : ROJO;
}

export default function SemaforoResenas({
  resenas,
  fuente,
}: {
  /** De la más nueva a la más vieja. */
  resenas: ResenaParaSemaforo[];
  /** "google": las públicas que muestra la ficha (hasta 5); "todas": las completas. */
  fuente: "google" | "todas";
}) {
  const s = contarSemaforo(resenas);
  if (s.total === 0) return null;
  if (fuente === "google") return <PrimeraImpresion resenas={resenas} />;
  const pct = (n: number) => Math.round((n / s.total) * 100);
  const malaReciente = resenas.find((r) => r.estrellas <= 2);
  const filas = [
    { etiqueta: "Buenas", detalle: "4–5★", n: s.buenas, color: VERDE },
    { etiqueta: "Medias", detalle: "3★", n: s.medias, color: AMARILLO },
    { etiqueta: "Malas", detalle: "1–2★", n: s.malas, color: ROJO },
  ];

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Cómo vienen tus reseñas</p>
        <p className="text-xs text-slate-500">
          sobre tus {s.total} reseñas
        </p>
      </div>

      {/* Barra apilada: la proporción de un vistazo. */}
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {filas.map((f) =>
          f.n > 0 ? <div key={f.etiqueta} style={{ width: `${pct(f.n)}%`, backgroundColor: f.color }} /> : null,
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {filas.map((f) => (
          <div key={f.etiqueta} className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.color }} aria-hidden />
              <span className="text-xs font-medium text-slate-600">
                {f.etiqueta} <span className="text-slate-400">{f.detalle}</span>
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{f.n}</div>
            <div className="text-xs tabular-nums text-slate-500">{pct(f.n)}%</div>
          </div>
        ))}
      </div>

      {/* Cada reseña como un punto, de la más nueva a la más vieja (las
          últimas 20: con todas las reseñas podrían ser cientos). */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {resenas.slice(0, 20).map((r, i) => (
          <span
            key={i}
            title={`${r.estrellas}★${r.cuando ? ` · ${r.cuando}` : ""}`}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDe(r.estrellas) }} aria-hidden />
            {r.estrellas}★{r.cuando ? ` · ${r.cuando}` : ""}
          </span>
        ))}
      </div>

      {malaReciente && (
        <a
          href="#resenas"
          className="mt-4 block rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: ROJO }}
        >
          Tenés una reseña de {malaReciente.estrellas}★{malaReciente.cuando ? ` (${malaReciente.cuando})` : ""}.
          Respondela: una respuesta a tiempo es lo que más ven los próximos clientes →
        </a>
      )}
    </div>
  );
}

const CARD =
  "rounded-3xl border border-white/60 bg-white/65 p-6 shadow-[0_8px_30px_-14px_rgba(17,17,17,0.14)] backdrop-blur-xl";

function Chip({ r }: { r: ResenaParaSemaforo }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDe(r.estrellas) }} aria-hidden />
      {r.estrellas}★{r.cuando ? ` · ${r.cuando}` : ""}
    </span>
  );
}

/** Sin todas las reseñas: las que Google muestra primero en la ficha. */
function PrimeraImpresion({ resenas }: { resenas: ResenaParaSemaforo[] }) {
  const s = contarSemaforo(resenas);
  const flojas = resenas.filter((r) => r.estrellas <= 3);
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold text-slate-800">Lo primero que ve un cliente en tu ficha</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Las {s.total} reseñas que Google muestra primero. Las elige Google por relevancia: no son las más
        nuevas.
      </p>
      <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">
        {s.buenas} de {s.total}
        <span className="ml-2 text-sm font-medium text-slate-500">con 4–5★</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {resenas.map((r, i) => (
          <Chip key={i} r={r} />
        ))}
      </div>
      {flojas.length > 0 ? (
        <a
          href="#resenas"
          className="mt-4 block rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: flojas.some((r) => r.estrellas <= 2) ? ROJO : AMARILLO }}
        >
          {flojas.length === 1
            ? "Una de ellas es de 3★ o menos y la ve todo el que entra a tu ficha. Respondela: tu respuesta aparece justo debajo →"
            : `${flojas.length} de ellas son de 3★ o menos y las ve todo el que entra a tu ficha. Respondelas: tu respuesta aparece justo debajo →`}
        </a>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Buena primera impresión. Cuántas buenas, medias y malas tenés en total aparece acá cuando se active la
          lectura completa de tus reseñas.
        </p>
      )}
    </div>
  );
}

