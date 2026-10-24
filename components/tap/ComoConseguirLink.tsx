// Cómo conseguir el link de reseña de Google, paso a paso y con capturas
// reales (los contactos de la hoja de compartir van tapados). Lo usan la
// activación de una pieza autogestionada y su edición. Es un <details>:
// funciona sin JavaScript y no ocupa lugar si el dueño ya sabe cómo.

const INK = "#1c2530";
const INK_SOFT = "#5f6b7a";

const PASOS: { texto: React.ReactNode; img?: { src: string; alt: string; w: number; h: number } }[] = [
  {
    texto: (
      <>
        Abrí Google con la cuenta que administra tu negocio y buscá <b>my business</b>.
      </>
    ),
  },
  {
    texto: (
      <>
        Arriba de todo aparece <b>“Administras este perfil”</b>: tocá tu negocio.
      </>
    ),
    img: { src: "/tap/instructivo/paso-2-perfil.webp", alt: "Resultado de Google con el perfil del negocio que administrás", w: 600, h: 228 },
  },
  {
    texto: (
      <>
        Tocá <b>Pedir una reseña</b>.
      </>
    ),
    img: { src: "/tap/instructivo/paso-3-pedir-resena.webp", alt: "Panel de tu negocio en Google con el botón Pedir una reseña", w: 600, h: 440 },
  },
  {
    texto: (
      <>
        Tocá <b>Copiar</b> y pegá el link en este campo. Empieza con <span className="font-mono">g.page/r/</span>.
      </>
    ),
    img: { src: "/tap/instructivo/paso-4-copiar.webp", alt: "Opciones para compartir el link, con el botón Copiar", w: 600, h: 779 },
  },
];

export default function ComoConseguirLink({ abierto = false }: { abierto?: boolean }) {
  return (
    <details open={abierto} className="mt-2 rounded-xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "#f1f5fb", color: INK_SOFT }}>
      <summary className="cursor-pointer font-medium" style={{ color: INK }}>
        ¿Cómo consigo el link?
      </summary>
      <ol className="mt-2.5 space-y-3">
        {PASOS.map((p, i) => (
          <li key={i}>
            <div className="flex gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: "#2563eb" }}
              >
                {i + 1}
              </span>
              <span className="leading-snug">{p.texto}</span>
            </div>
            {p.img && (
              // eslint-disable-next-line @next/next/no-img-element -- imagen estática chica, sin optimizador
              <img
                src={p.img.src}
                alt={p.img.alt}
                width={p.img.w}
                height={p.img.h}
                loading="lazy"
                className="mt-2 h-auto w-full rounded-lg"
              />
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11.5px]">
        ¿No aparece “Administras este perfil”? Revisá estar con la cuenta de Google que administra la ficha. En la
        compu, “Pedir una reseña” muestra el link con un botón para copiarlo.
      </p>
    </details>
  );
}
