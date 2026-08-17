import { redirect } from "next/navigation";

// Ruta vieja (español) — se mantiene como redirect permanente a /terms
// para no romper ningún link que haya quedado apuntando acá.
export default function TerminosRedirect() {
  redirect("/terms");
}
