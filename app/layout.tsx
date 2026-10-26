import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Tipografía de marca (ver Manual de Marca): Montserrat en toda la app,
// títulos en semibold, cuerpo en regular. Va servida desde el repo (la
// variable latina, pesos 100–900) y no con next/font/google: esa descarga
// la fuente de Google en cada build y, cuando Google Fonts responde mal, el
// build entero se cae ("Cannot read properties of null (reading '1')" en
// next/font) — pasó dos veces el 26/10, en Vercel y en el CI.
const montserrat = localFont({
  src: "./fonts/montserrat-variable-latin.woff2",
  weight: "100 900",
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  // Sin esto, las URLs relativas de metadata (openGraph.images, etc.) se
  // resuelven contra localhost en producción — rompe la miniatura de
  // cualquier link compartido por WhatsApp/Telegram/etc. (ver /t/[slug]).
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://app.metricsfield.com"),
  title: "MetricsField — Panel de clientes",
  description:
    "Dashboard de presencia digital para pymes de Córdoba: reseñas de Google, visitas y llamadas a tu ficha, y citaciones en IA (GEO).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
