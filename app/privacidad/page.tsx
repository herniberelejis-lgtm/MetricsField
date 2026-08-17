import { redirect } from "next/navigation";

// Ruta vieja (español) — se mantiene como redirect permanente a /privacy
// para no romper ningún link que haya quedado apuntando acá (incluida la
// URL que Google puede tener cacheada de un rastreo anterior).
export default function PrivacidadRedirect() {
  redirect("/privacy");
}
