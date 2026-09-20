import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Tipografía de marca (ver Manual de Marca): Montserrat en toda la app,
// títulos en semibold, cuerpo en regular.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
    "Dashboard de presencia digital para pymes de Córdoba: reseñas, posición en Google Maps y citaciones en IA (GEO).",
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
