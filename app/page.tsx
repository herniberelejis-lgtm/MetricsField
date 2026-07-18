import { redirect } from "next/navigation";

// La landing pública vive aparte (metricsfield.com, fuera de este repo) —
// este subdominio es solo el software, así que la raíz manda directo al
// panel en vez de duplicar una landing acá.
export default function Home() {
  redirect("/admin");
}
