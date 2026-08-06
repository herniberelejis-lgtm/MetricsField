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
