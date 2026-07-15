"use client";

import { useRef, useState, type FormEvent } from "react";
import { motion, useScroll, useTransform, useSpring, type Variants } from "motion/react";

// Landing pública de MetricsField (ex Taply) — portada desde el proyecto de diseño (Lovable).
// Las imágenes "lifestyle" (mesa, salón, vidriera, tap, pack) son fotos
// reales; los 3 chips del hero y las 4 fotos de producto todavía no tienen
// foto real subida al repo, así que usan una placa con el ícono de marca —
// reemplazar cuando haya fotos: poner el archivo en public/landing/products/
// y usar <img> en vez de <IconTile>.

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5493513480773";
function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const reveal: Variants = {
  hidden: { opacity: 0, y: 60, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1, ease: [0.22, 1, 0.36, 1] as const } },
};

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left"
      style={{ scaleX, background: "linear-gradient(90deg, var(--brand), oklch(0.55 0.24 300))" }}
    />
  );
}

function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-baseline mr-[0.22em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[color-mix(in_oklab,var(--background)_75%,transparent)] border-b border-[var(--hairline)]">
      <div className="container-x flex h-14 items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight text-[15px]">
          <span className="inline-block w-6 h-6 rounded-md bg-[var(--ink)] text-white grid place-items-center text-[11px]">◉</span>
          MetricsField
        </a>
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-[var(--ink-soft)]">
          <a href="#producto" className="hover:text-[var(--ink)] transition">Producto</a>
          <a href="#en-vivo" className="hover:text-[var(--ink)] transition">En acción</a>
          <a href="#servicios" className="hover:text-[var(--ink)] transition">Servicios</a>
          <a href="#geo" className="hover:text-[var(--ink)] transition">GEO</a>
          <a href="#proceso" className="hover:text-[var(--ink)] transition">Proceso</a>
        </nav>
        <a href="#contacto" className="rounded-full bg-[var(--ink)] text-white text-[13px] font-medium px-4 py-1.5 hover:opacity-90 transition">
          Pedí una demo
        </a>
      </div>
    </header>
  );
}

function IconTile({ icon, label, rotate = 0 }: { icon: string; label: string; rotate?: number }) {
  return (
    <div
      className="aspect-square w-full rounded-xl grid place-items-center text-white"
      style={{
        background: "linear-gradient(135deg, var(--brand), oklch(0.55 0.24 300))",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div className="text-center">
        <div className="text-2xl leading-none">{icon}</div>
        <div className="mt-1 text-[9px] uppercase tracking-wide text-white/80">{label}</div>
      </div>
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24"
      style={{ background: "var(--gradient-hero)" }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
        style={{ background: "radial-gradient(closest-side, oklch(0.62 0.19 255 / 0.18), transparent 70%)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="container-x text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-[13px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-5 inline-flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
          Agencia NFC · SEO · GEO — Córdoba, Argentina
        </motion.p>
        <h1 className="text-balance text-[44px] sm:text-6xl md:text-8xl leading-[1] font-semibold text-[var(--ink)] tracking-[-0.04em]">
          <WordReveal text="Aparecé primero." />
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--brand), oklch(0.55 0.24 300))" }}>
            <WordReveal text="En Google y en la IA." delay={0.25} />
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-[17px] md:text-xl leading-relaxed text-[var(--ink-soft)]"
        >
          Tarjetas NFC de reseñas Google + posicionamiento en ChatGPT, Copilot y Google Maps. El gancho físico que convierte visitas en clientes.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.05 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <a href="#contacto" className="group relative rounded-full bg-[var(--ink)] text-white text-[15px] font-medium px-6 py-3 overflow-hidden transition hover:scale-[1.02]">
            <span className="relative z-10">Reservá tu demo</span>
            <span className="absolute inset-0 bg-[var(--brand)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </a>
          <a href="#producto" className="rounded-full border border-[var(--hairline)] bg-white/60 backdrop-blur text-[var(--ink)] text-[15px] font-medium px-6 py-3 hover:bg-white transition">
            Ver el producto →
          </a>
        </motion.div>

        <motion.div style={{ y, scale, opacity }} className="relative mx-auto mt-16 md:mt-20 max-w-5xl">
          <div className="absolute inset-x-10 -bottom-6 h-24 rounded-full bg-black/20 blur-3xl" />
          <div className="relative rounded-[32px] overflow-hidden border border-[var(--hairline)] bg-white" style={{ boxShadow: "var(--shadow-float)" }}>
            <div className="grid md:grid-cols-[1.2fr_1fr]">
              <div className="relative aspect-[4/5] md:aspect-auto overflow-hidden">
                <motion.img
                  src="/landing/tap-phone.jpg"
                  alt="Cliente escaneando tarjeta NFC de MetricsField para dejar reseña en Google"
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 mb-2">Tap &amp; Review</p>
                  <p className="text-lg font-medium leading-snug">El cliente apoya el celular. Se abre Google Reviews. Listo.</p>
                </div>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center gap-6 bg-[var(--surface)]">
                <div className="grid grid-cols-3 gap-3">
                  <IconTile icon="💳" label="Tarjeta" rotate={-6} />
                  <IconTile icon="🪧" label="Standee" rotate={0} />
                  <IconTile icon="👆" label="Tap" rotate={6} />
                </div>
                <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
                  Cards · Standees · Stickers. Personalizados con el logo del negocio y el link directo a su ficha de Google.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-[var(--hairline)] text-center bg-white">
              <Stat k="1 seg" v="para dejar reseña" />
              <Stat k="+527%" v="tráfico desde IA (2025)" />
              <Stat k="85%" v="celulares compatibles" />
            </div>
          </div>
        </motion.div>
      </div>

      <Marquee />
    </section>
  );
}

function Marquee() {
  const items = ["NFC", "Google Reviews", "GEO · Generative Engine Optimization", "Local SEO", "ChatGPT · Copilot · Perplexity", "Google Maps", "Schema.org", "Bing Indexnow"];
  const loop = [...items, ...items];
  return (
    <div className="mt-24 border-y border-[var(--hairline)] overflow-hidden py-5 bg-white/40 backdrop-blur">
      <div className="marquee-track gap-12 text-[13px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
        {loop.map((t, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap">
            {t}
            <span className="w-1 h-1 rounded-full bg-[var(--brand)]" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--ink)]">{k}</div>
      <div className="text-[12px] md:text-[13px] text-[var(--muted-foreground)] mt-1">{v}</div>
    </div>
  );
}

function Section({ id, eyebrow, title, kicker, children, dark = false }: {
  id?: string; eyebrow?: string; title: React.ReactNode; kicker?: string; children: React.ReactNode; dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 ${dark ? "text-white" : ""}`}
      style={dark ? { background: "var(--gradient-ink)" } : undefined}
    >
      <div className="container-x">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-3xl mb-12 md:mb-16"
        >
          {eyebrow && (
            <p className={`text-[12px] uppercase tracking-[0.2em] mb-4 ${dark ? "text-white/60" : "text-[var(--muted-foreground)]"}`}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-balance text-4xl md:text-6xl leading-[1.05] font-semibold">
            {title}
          </h2>
          {kicker && (
            <p className={`mt-5 text-lg md:text-xl leading-relaxed text-balance ${dark ? "text-white/70" : "text-[var(--ink-soft)]"}`}>
              {kicker}
            </p>
          )}
        </motion.div>
        {children}
      </div>
    </section>
  );
}

function InSitu() {
  const items = [
    {
      tag: "En tu mesa",
      title: "Restaurantes · Bares · Cafés",
      copy: "La tarjeta descansa junto a la cuenta. El cliente termina de comer, apoya el celular, deja la reseña en 10 segundos. Sin fricción.",
      img: "/landing/mesa-restaurante.jpg",
    },
    {
      tag: "En tu recepción",
      title: "Salones · Clínicas · Estudios",
      copy: "Un standee elegante que se integra al mostrador. El equipo lo señala al despedir al cliente y las reseñas empiezan a fluir esa misma semana.",
      img: "/landing/recepcion-salon.jpg",
    },
    {
      tag: "En tu vidriera",
      title: "Locales · Comercios · Servicios",
      copy: "Sticker discreto en la puerta o mostrador. Funciona 24/7, incluso con el local cerrado. Perfil de Google siempre activo.",
      img: "/landing/vidriera-cafe.jpg",
    },
  ];
  return (
    <section id="en-vivo" className="py-24 md:py-32 bg-[var(--surface)]">
      <div className="container-x">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-24"
        >
          <p className="text-[12px] uppercase tracking-[0.2em] mb-4 text-[var(--muted-foreground)]">
            El producto, en acción
          </p>
          <h2 className="text-balance text-4xl md:text-6xl leading-[1.05] font-semibold">
            Se integra donde{" "}
            <em className="not-italic bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--brand), oklch(0.55 0.24 300))" }}>
              ya está tu cliente
            </em>
            .
          </h2>
        </motion.div>

        <div className="space-y-24 md:space-y-40">
          {items.map((it, i) => (
            <InSituRow key={it.title} item={it} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function InSituRow({ item, reverse }: { item: { tag: string; title: string; copy: string; img: string }; reverse: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <div ref={ref} className={`grid md:grid-cols-12 gap-8 md:gap-16 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
      <motion.div
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="md:col-span-7 relative rounded-[28px] overflow-hidden aspect-[4/5] md:aspect-[5/6]"
        style={{ boxShadow: "var(--shadow-float)" }}
      >
        <motion.img
          src={item.img}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover"
          style={{ scale: imgScale }}
        />
      </motion.div>
      <motion.div style={{ y }} className="md:col-span-5">
        <p className="text-[12px] uppercase tracking-[0.24em] text-[var(--brand)] mb-4">{item.tag}</p>
        <h3 className="text-3xl md:text-5xl leading-[1.05] font-semibold text-balance">{item.title}</h3>
        <p className="mt-5 text-[17px] md:text-lg leading-relaxed text-[var(--ink-soft)]">{item.copy}</p>
        <div className="mt-8 flex items-center gap-4 text-[13px] text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" /> Compatible con iPhone + Android
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function Problem() {
  const items = [
    { n: "83%", t: "de las personas eligen negocios locales según sus reseñas de Google." },
    { n: "97%", t: "de los clientes abandonan antes de terminar de escribir una reseña." },
    { n: "5–30", t: "reseñas viejas es lo que tiene la mayoría de las pymes cordobesas." },
    { n: "0", t: "agencias en Córdoba están ofreciendo GEO todavía. Ventana: 3–6 meses." },
  ];
  return (
    <Section
      id="problema"
      eyebrow="El problema"
      title={<>El momento de intención dura minutos. <span className="text-[var(--muted-foreground)]">Después, se perdió.</span></>}
      kicker="El cliente sale contento. Llega a su casa con 40 notificaciones. Nunca encuentra tu ficha. Tu competencia sí aparece."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group rounded-2xl border border-[var(--hairline)] bg-white p-6 hover:-translate-y-1 transition-all duration-500 hover:border-[var(--brand)]/40"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-5xl font-semibold tracking-tight text-[var(--brand)] group-hover:scale-105 transition-transform origin-left duration-500">{it.n}</div>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">{it.t}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const products = [
  { name: "Sticker NFC", icon: "🏷️", use: "Cada mesa, vidriera, mostrador.", price: "$8.000 – $10.000" },
  { name: "Tarjeta PVC", icon: "💳", use: "Mozos y recepcionistas, mesa por mesa.", price: "$12.000 – $15.000" },
  { name: "Standee de recepción", icon: "🪧", use: "Clínicas, peluquerías, talleres.", price: "$20.000 – $25.000" },
  { name: "Pack completo", icon: "📦", use: "Los 3 formatos, cobertura total.", price: "$35.000 – $40.000" },
];

function Product() {
  return (
    <Section
      id="producto"
      eyebrow="El producto físico"
      title={<>Un tap. Una reseña. <span className="text-[var(--muted-foreground)]">Diez segundos.</span></>}
      kicker="Tarjetas, stickers y standees con chip NFC que abren directo la ficha de Google Reviews del negocio. Sin apps, sin buscar, sin fricción."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p, i) => (
          <motion.article
            key={p.name}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="group rounded-3xl border border-[var(--hairline)] bg-white overflow-hidden hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div
              className="relative aspect-square overflow-hidden grid place-items-center text-white"
              style={{ background: "linear-gradient(135deg, var(--brand), oklch(0.55 0.24 300))" }}
            >
              <div className="text-5xl group-hover:scale-110 transition-transform duration-500">{p.icon}</div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-[14px] text-[var(--muted-foreground)] leading-relaxed">{p.use}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[15px] font-medium text-[var(--ink)]">{p.price}</p>
                <span className="text-[var(--brand)] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300">→</span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <ComboShowcase />
    </Section>
  );
}

function ComboShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  return (
    <motion.div
      ref={ref}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mt-16 md:mt-24 relative rounded-[32px] overflow-hidden bg-[var(--ink)] text-white"
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      <div className="grid md:grid-cols-2">
        <div className="p-8 md:p-14 flex flex-col justify-center order-2 md:order-1">
          <p className="text-[12px] uppercase tracking-[0.24em] text-[var(--brand)] mb-4">Pack completo</p>
          <h3 className="text-4xl md:text-5xl leading-[1.05] font-semibold tracking-tight text-balance">
            Todo lo que necesita tu local, en una caja.
          </h3>
          <p className="mt-5 text-white/70 text-[17px] leading-relaxed">
            3 tarjetas PVC, 5 stickers y 1 standee de recepción. Diseño personalizado con tu logo, programación NFC y guía de instalación incluidos.
          </p>
          <ul className="mt-8 space-y-3 text-[15px]">
            {["Diseño gráfico premium incluido", "Programación NFC lista para usar", "Envío a todo Córdoba en 48hs", "Reposición sin costo el primer año"].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                <span className="text-white/85">{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Pack</p>
              <p className="text-3xl font-semibold">$35.000 – $40.000</p>
            </div>
            <a href="#contacto" className="rounded-full bg-white text-[var(--ink)] px-5 py-2.5 text-[14px] font-medium hover:bg-white/90 transition">Lo quiero →</a>
          </div>
        </div>
        <div className="relative overflow-hidden order-1 md:order-2 aspect-[4/5] md:aspect-auto">
          <motion.img
            src="/landing/pack-completo.jpg"
            alt="Pack completo MetricsField — cards, stickers y standee"
            loading="lazy"
            className="w-full h-full object-cover"
            style={{ y }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Services() {
  const base = [
    "Google Business Profile optimizado y actualizado",
    "Respuesta mensual a todas las reseñas",
    "1 post mensual en Google Business",
    "Google Analytics 4 + Search Console configurados",
    "Schema markup LocalBusiness / Organization",
    "Reporte PDF mensual con métricas clave",
  ];
  const premium = [
    "Todo lo del plan Base, más:",
    "Bing Webmaster Tools + IndexNow (indexación instantánea)",
    "FAQPage schema — el contenido que la IA cita",
    "2 piezas de contenido IA-first por mes",
    "Monitoreo mensual de citaciones en ChatGPT, Copilot y Perplexity",
    "Reporte exclusivo “tu negocio en la IA este mes”",
  ];
  return (
    <Section
      id="servicios"
      eyebrow="Los servicios"
      title={<>La tarjeta es el gancho. <span className="text-[var(--muted-foreground)]">El servicio es el negocio.</span></>}
      kicker="Consultoría mensual recurrente para que tu negocio aparezca cuando alguien busca tu rubro en tu barrio — en Google Maps y en la IA."
    >
      <div className="grid md:grid-cols-2 gap-5">
        <PlanCard
          tag="Plan Base"
          title="Presencia Local Optimizada"
          price="$45.000 – $65.000"
          suffix="/ mes"
          desc="Aparecer en el Local Pack de Google Maps del rubro en tu zona, en 30–60 días."
          items={base}
        />
        <PlanCard
          tag="Plan Premium"
          title="Dominancia en IA"
          price="$90.000 – $150.000"
          suffix="/ mes"
          desc="Ser recomendado por ChatGPT, Copilot y Google AI cuando alguien pregunta por tu rubro."
          items={premium}
          featured
        />
      </div>
    </Section>
  );
}

function PlanCard({ tag, title, price, suffix, desc, items, featured }: {
  tag: string; title: string; price: string; suffix: string; desc: string; items: string[]; featured?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className={`relative rounded-3xl p-8 md:p-10 border ${featured ? "border-transparent text-white" : "border-[var(--hairline)] bg-white"}`}
      style={featured
        ? { background: "var(--gradient-ink)", boxShadow: "var(--shadow-float)" }
        : { boxShadow: "var(--shadow-card)" }}
    >
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${featured ? "bg-white/10 text-white/80" : "bg-[var(--surface)] text-[var(--muted-foreground)]"}`}>
        {featured && <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />} {tag}
      </div>
      <h3 className="mt-5 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h3>
      <p className={`mt-3 text-[15px] leading-relaxed ${featured ? "text-white/70" : "text-[var(--ink-soft)]"}`}>{desc}</p>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl md:text-5xl font-semibold tracking-tight">{price}</span>
        <span className={featured ? "text-white/60" : "text-[var(--muted-foreground)]"}>{suffix}</span>
      </div>
      <ul className="mt-8 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${featured ? "bg-[var(--brand)]" : "bg-[var(--ink)]"}`} />
            <span className={featured ? "text-white/85" : "text-[var(--ink-soft)]"}>{i}</span>
          </li>
        ))}
      </ul>
      <a href="#contacto" className={`mt-10 inline-flex rounded-full px-5 py-2.5 text-[14px] font-medium transition ${featured ? "bg-white text-[var(--ink)] hover:bg-white/90" : "bg-[var(--ink)] text-white hover:opacity-90"}`}>
        Empezar con este plan →
      </a>
    </motion.div>
  );
}

function GEO() {
  const rows = [
    ["Objetivo", "Rankear en Google", "Ser citado por la IA"],
    ["Usuario", "Hace click en un link", "Recibe una respuesta directa"],
    ["Métricas", "Posición, CTR, tráfico", "Citaciones, menciones, share of voice"],
    ["Competencia", "10 resultados por página", "2–7 fuentes citadas por respuesta"],
    ["Autoridad", "Backlinks", "Trust embedding — credibilidad para la IA"],
  ];
  return (
    <Section
      id="geo"
      dark
      eyebrow="GEO — Generative Engine Optimization"
      title={<>Optimizar para <span className="text-[var(--brand)]">ChatGPT</span>, no para Google.</>}
      kicker="El 58% ya reemplazó los buscadores con IA. El 87% de las citaciones de ChatGPT vienen del índice de Bing. Nadie en Córdoba lo está ejecutando todavía."
    >
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.03] backdrop-blur"
      >
        <div className="grid grid-cols-3 text-[13px] uppercase tracking-[0.16em] text-white/50 px-6 py-4 border-b border-white/10">
          <span>Dimensión</span>
          <span>SEO tradicional</span>
          <span>GEO</span>
        </div>
        {rows.map(([a, b, c], i) => (
          <div key={i} className="grid grid-cols-3 gap-4 px-6 py-5 border-b border-white/5 last:border-0 text-[15px]">
            <span className="text-white/60">{a}</span>
            <span className="text-white/85">{b}</span>
            <span className="font-medium">{c}</span>
          </div>
        ))}
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 mt-10">
        {[
          ["Google Business Perfecto", "La IA lee directo la ficha de Maps. Categorías, fotos y descripciones al día."],
          ["Schema específico", "LocalBusiness, FAQPage, HowTo. Le decimos a la IA qué sos, dónde estás y qué cobrás."],
          ["Reseñas como contenido", "La IA no cuenta estrellas, lee el texto. La tarjeta NFC alimenta esta capa directo."],
        ].map(([t, d], i) => (
          <motion.div
            key={t}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h4 className="text-lg font-semibold">{t}</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-white/65">{d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function Process() {
  const steps = [
    ["01", "Demo en 30 segundos", "Llegamos con la tarjeta demo, el dueño la apoya en el celular y ve el flujo real. Sin slides."],
    ["02", "Programamos en el acto", "Si cierra, dejamos la tarjeta lista con el link de Google Reviews del negocio ahí mismo."],
    ["03", "Setup técnico", "Google Business, Analytics, Search Console, Bing y schema. En la primera semana."],
    ["04", "Ejecución mensual", "Reseñas respondidas, contenido, monitoreo de IA. Reporte de 2 páginas cada mes."],
  ];
  return (
    <Section
      id="proceso"
      eyebrow="Cómo trabajamos"
      title={<>Sin humo. <span className="text-[var(--muted-foreground)]">Con evidencia.</span></>}
      kicker="Un reporte mensual honesto, con 3 métricas que se entienden sin conocimiento técnico, y una recomendación concreta para el mes siguiente."
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map(([n, t, d], i) => (
          <motion.div
            key={n}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-[var(--hairline)] bg-white p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-[13px] font-mono text-[var(--brand)]">{n}</div>
            <h4 className="mt-3 text-xl font-semibold">{t}</h4>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">{d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

function Quote() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-x">
        <motion.blockquote
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center text-balance text-3xl md:text-5xl font-semibold tracking-tight leading-[1.15]"
        >
          &ldquo;La mayoría de las agencias te venden alcance. Nosotros te posicionamos para que{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, var(--brand), oklch(0.6 0.22 320))" }}>
            cuando alguien le pregunte a ChatGPT
          </span>{" "}
          cuál es el mejor de tu rubro en tu barrio — la respuesta seas vos.&rdquo;
        </motion.blockquote>
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [plan, setPlan] = useState("Plan Base");
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    const business = String(fd.get("business") || "");
    const phone = String(fd.get("phone") || "");
    const zone = String(fd.get("zone") || "");
    const detail = String(fd.get("detail") || "");
    const selectedPlan = String(fd.get("plan") || plan);
    const msg =
      `Hola MetricsField! Quiero reservar una demo.\n\n` +
      `• Plan de interés: ${selectedPlan}\n` +
      `• Nombre: ${name}\n` +
      `• Negocio: ${business}\n` +
      `• WhatsApp: ${phone}\n` +
      `• Zona: ${zone}\n` +
      `• Detalle: ${detail}`;
    window.open(whatsappUrl(msg), "_blank", "noopener,noreferrer");
    setSent(true);
  }
  return (
    <Section
      id="contacto"
      eyebrow="Empezar"
      title={<>Agenda una demo <span className="text-[var(--muted-foreground)]">de 15 minutos.</span></>}
      kicker="Te llevamos la tarjeta al local. La probás. Si te sirve, arrancamos ese mismo día."
    >
      <motion.form
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-3xl border border-[var(--hairline)] bg-white p-6 md:p-10"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" name="name" placeholder="Cómo te llamás" />
          <Field label="Negocio" name="business" placeholder="Nombre y rubro" />
          <Field label="WhatsApp" name="phone" placeholder="+54 351..." />
          <Field label="Zona en Córdoba" name="zone" placeholder="Nueva Córdoba, Güemes..." />
        </div>
        <div className="mt-4">
          <label className="block text-[13px] text-[var(--muted-foreground)] mb-1.5">Plan que te interesa</label>
          <select
            name="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]"
          >
            <option>Sticker NFC ($8.000 – $10.000)</option>
            <option>Tarjeta PVC ($12.000 – $15.000)</option>
            <option>Standee de recepción ($20.000 – $25.000)</option>
            <option>Pack completo ($35.000 – $40.000)</option>
            <option>Plan Base — Presencia Local ($45.000 – $65.000/mes)</option>
            <option>Plan Premium — Dominancia en IA ($90.000 – $150.000/mes)</option>
            <option>Todavía no sé, quiero asesoramiento</option>
          </select>
        </div>
        <div className="mt-4">
          <label className="block text-[13px] text-[var(--muted-foreground)] mb-1.5">Contame en 1 línea qué necesitás</label>
          <textarea name="detail" rows={3} className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]" placeholder="Quiero más reseñas, quiero aparecer en ChatGPT..." />
        </div>
        <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-6 py-3 text-[15px] font-medium hover:opacity-90 transition">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 15 3.5 13.5 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z" /></svg>
          {sent ? "¡Abriendo WhatsApp!" : "Reservar demo por WhatsApp"}
        </button>
      </motion.form>
    </Section>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-[13px] text-[var(--muted-foreground)] mb-1.5">{label}</label>
      <input id={name} name={name} placeholder={placeholder} className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--hairline)] py-10 text-[13px] text-[var(--muted-foreground)]">
      <div className="container-x flex flex-col md:flex-row items-center justify-between gap-3">
        <span>© {new Date().getFullYear()} MetricsField · Córdoba, Argentina</span>
        {/* Links legales: Google exige que privacidad y términos sean
            alcanzables desde la home para verificar la app OAuth. */}
        <span className="flex items-center gap-4">
          <a href="/privacidad" className="hover:underline underline-offset-2">Privacidad</a>
          <a href="/terminos" className="hover:underline underline-offset-2">Términos</a>
        </span>
        <span>NFC · SEO · GEO — hecho para pymes que quieren aparecer.</span>
      </div>
    </footer>
  );
}

function WhatsAppFloat() {
  const msg = "Hola MetricsField! Quiero comunicarme para más info sobre las tarjetas NFC + SEO/GEO.";
  return (
    <a
      href={whatsappUrl(msg)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Comunicarse por WhatsApp"
      className="fixed bottom-5 right-5 z-[70] group inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white pl-3 pr-4 py-3 shadow-[0_20px_40px_-10px_rgba(37,211,102,0.5)] hover:scale-[1.03] transition"
    >
      <span className="grid place-items-center w-8 h-8 rounded-full bg-white/15">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 15 3.5 13.5 3.5 12 3.5 7.3 7.3 3.5 12 3.5S20.5 7.3 20.5 12 16.7 20 12 20z" /></svg>
      </span>
      <span className="text-[14px] font-medium">Comunicarse</span>
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-theme">
      <main className="min-h-screen">
        <ScrollProgress />
        <Nav />
        <Hero />
        <Problem />
        <InSitu />
        <Product />
        <Services />
        <GEO />
        <Process />
        <Quote />
        <Contact />
        <Footer />
        <WhatsAppFloat />
      </main>
    </div>
  );
}
