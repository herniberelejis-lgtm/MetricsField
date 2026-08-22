import { permanentRedirect } from "next/navigation";

// Ruta vieja (español) — se mantiene como redirect permanente (308) a
// /privacy para no romper ningún link que haya quedado apuntando acá,
// incluida la URL que Google puede tener cacheada de un rastreo anterior:
// redirect() de next/navigation manda un 307 (temporal), que no le indica
// al rastreador que actualice su índice — hace falta permanentRedirect().
export default function PrivacidadRedirect() {
  permanentRedirect("/privacy");
}
