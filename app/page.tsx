import Link from "next/link";
import type { Metadata } from "next";
import { Card, IconWave, IconChat, IconZap, btnSecondary, btnGhost } from "@/components/ui";
import BrandMark from "@/components/BrandMark";

// Home page pública — sirve tanto metricsfield.com como app.metricsfield.com
// (mismo proyecto de Vercel, mismo deploy). Es la "Application home page"
// registrada ante Google para la verificación OAuth: tiene que describir el
// producto y linkear a /privacy. Un redirect directo a un login vacío es
// motivo de rechazo — así arrancó este archivo, antes era `redirect("/admin")`.
// Título y OpenGraph en inglés a propósito: es el <title> que ve el
// revisor de la verificación OAuth de Google, no un cliente. El contenido
// visible de la página (lo que ve un dueño de comercio) sigue en español.
export const metadata: Metadata = {
  title: "MetricsField - Reputation Management Platform",
  description:
    "MetricsField is a reputation management platform for local businesses. Helps businesses get Google reviews and track their Google Business Profile performance.",
  openGraph: {
    title: "MetricsField - Reputation Management Platform",
    siteName: "MetricsField",
    description:
      "MetricsField is a reputation management platform for local businesses.",
    url: "https://metricsfield.com",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-lg font-bold tracking-tight">METRICSFIELD</span>
        </div>
        <Link href="/login" className={btnGhost}>
          Ingresar
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center">
          <BrandMark size={72} className="mx-auto mb-8 text-slate-900" />
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Inteligencia de datos
            <br />
            para el mundo físico.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            MetricsField convierte cada interacción de tus clientes en un local —un tap, una
            reseña— en información clara y accionable. Ayudamos a comercios locales de Córdoba a
            conseguir reseñas en Google y a entender el rendimiento real de su presencia online.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <IconWave size={22} className="text-slate-900" />
              <h2 className="mt-3 text-sm font-semibold text-slate-900">Un cartel, un tap</h2>
              <p className="mt-2 text-sm text-slate-600">
                Un cartel NFC/QR en el local lleva al cliente directo a dejar reseña en Google —
                sin pantallas intermedias, el mismo camino para todos.
              </p>
            </Card>
            <Card>
              <IconChat size={22} className="text-slate-900" />
              <h2 className="mt-3 text-sm font-semibold text-slate-900">Reseñas, en un solo lugar</h2>
              <p className="mt-2 text-sm text-slate-600">
                Rating, reseñas nuevas y quejas frecuentes centralizados, con respuestas
                sugeridas para no dejar ninguna sin contestar.
              </p>
            </Card>
            <Card>
              <IconZap size={22} className="text-slate-900" />
              <h2 className="mt-3 text-sm font-semibold text-slate-900">Rendimiento real</h2>
              <p className="mt-2 text-sm text-slate-600">
                Con la cuenta de Google del propio comercio, sincronizamos visitas al perfil,
                llamadas y clics en &ldquo;cómo llegar&rdquo; — solo visible para su dueño.
              </p>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 pb-24 text-center">
          <Link href="/login" className={btnSecondary}>
            Acceder al panel del equipo
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>MetricsField — Córdoba, Argentina</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-800">
              Política de privacidad
            </Link>
            <Link href="/terms" className="hover:text-slate-800">
              Términos
            </Link>
            <a href="mailto:info@metricsfield.com" className="hover:text-slate-800">
              info@metricsfield.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
