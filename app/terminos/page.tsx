import { permanentRedirect } from "next/navigation";

// Ruta vieja (español) — se mantiene como redirect permanente (308) a
// /terms para no romper ningún link que haya quedado apuntando acá —
// redirect() manda un 307 (temporal), permanentRedirect() es el que
// corresponde acá (ver el mismo comentario en privacidad/page.tsx).
export default function TerminosRedirect() {
  permanentRedirect("/terms");
}
