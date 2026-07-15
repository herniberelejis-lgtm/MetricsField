import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad — MetricsField",
  description: "Cómo MetricsField usa los datos de Google Business Profile de sus clientes.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="text-2xl font-semibold text-slate-900">Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: julio de 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-slate-900">Qué es MetricsField</h2>
          <p className="mt-2">
            MetricsField es un panel de gestión de reputación online para comercios
            locales de Córdoba, Argentina. Ayudamos a nuestros clientes a
            conseguir reseñas en Google y a hacer seguimiento del
            rendimiento de su ficha de Google Business Profile.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Qué datos accedemos y por qué
          </h2>
          <p className="mt-2">
            Con autorización explícita del comercio (a través del inicio de
            sesión de Google, OAuth), accedemos únicamente a:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>El rating y la cantidad de reseñas públicas de su ficha de Google.</li>
            <li>
              Métricas de rendimiento de su ficha (visitas al perfil, llamadas,
              solicitudes de "cómo llegar"), a través de la Business Profile
              Performance API de Google.
            </li>
          </ul>
          <p className="mt-2">
            No accedemos a datos personales de terceros, no leemos correos, y
            no publicamos ni modificamos nada en la ficha de Google del
            comercio sin su intervención directa.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Cómo usamos estos datos
          </h2>
          <p className="mt-2">
            Los datos se muestran únicamente al comercio dueño de la ficha, en
            su panel privado dentro de MetricsField, y a nuestro equipo interno para
            poder prestarle el servicio de gestión contratado. No vendemos ni
            compartimos estos datos con terceros.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Cómo revocar el acceso
          </h2>
          <p className="mt-2">
            Cualquier comercio puede revocar el acceso de MetricsField a su cuenta de
            Google en cualquier momento desde{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-brand-fg underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900">Contacto</h2>
          <p className="mt-2">
            Para consultas sobre esta política o para solicitar la
            eliminación de tus datos, escribinos a{" "}
            <a href="mailto:taplycba@gmail.com" className="text-brand-fg underline underline-offset-2">
              taplycba@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
