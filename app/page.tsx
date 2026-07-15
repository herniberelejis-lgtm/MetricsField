import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import "./landing.css";

export const metadata: Metadata = {
  title: "MetricsField — Aparecé primero en Google y en la IA",
  description:
    "Tarjetas NFC de reseñas Google + posicionamiento en ChatGPT, Copilot y Google Maps para pymes de Córdoba. El gancho físico que convierte visitas en clientes.",
};

export default function Home() {
  return <LandingPage />;
}
