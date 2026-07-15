import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
