import type { Metadata } from "next";
import LangSwitch from "@/components/legal/LangSwitch";

export const metadata: Metadata = {
  title: "Política de privacidad — MetricsField",
  description: "Cómo MetricsField usa los datos de Google Business Profile de sus clientes.",
};

// Página requerida por la verificación OAuth de Google: tiene que estar
// pública en el dominio de la app, linkeada desde la home, y declarar
// explícitamente el cumplimiento de la Google API Services User Data
// Policy (incluido "Limited Use"). No borrar esas secciones.
//
// Bilingüe (toggle ES/EN, ver LangSwitch): el producto trabaja en español,
// pero esta es la URL pública que queda declarada en Google Cloud Console
// y la que se muestra en el video de verificación (grabado en inglés) — así
// que la misma URL tiene que poder mostrar el texto en inglés también, sin
// duplicar la política en una segunda URL.
export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <LangSwitch
        es={
          <>
            <h1 className="text-2xl font-semibold text-slate-900">Política de privacidad</h1>
            <p className="mt-2 text-sm text-slate-500">Última actualización: julio de 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className="text-base font-semibold text-slate-900">Qué es MetricsField</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) es una plataforma de gestión de
                  reputación online para comercios locales de Córdoba, Argentina.
                  Ayudamos a nuestros clientes a conseguir reseñas en Google y a
                  hacer seguimiento del rendimiento de su ficha de Google Business
                  Profile.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Qué datos de Google accedemos y por qué
                </h2>
                <p className="mt-2">
                  Con autorización explícita del comercio (mediante el flujo OAuth
                  de Google), accedemos únicamente a:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Datos de su ficha de Google Business Profile: rating, cantidad de
                    reseñas públicas, y métricas de rendimiento (visitas al perfil,
                    llamadas, solicitudes de &ldquo;cómo llegar&rdquo;) — scope{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">business.manage</code>.
                  </li>
                  <li>
                    Para el acceso del equipo interno de MetricsField a su propio
                    panel: la dirección de email y el nombre de la cuenta que inicia
                    sesión (scopes <code className="rounded bg-slate-100 px-1 text-[13px]">openid</code>,{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">email</code>,{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">profile</code>) —
                    solo para identificar quién realiza cada acción.
                  </li>
                </ul>
                <p className="mt-2">
                  No accedemos a correos electrónicos, contactos, archivos ni a
                  ningún otro dato de la cuenta de Google. No publicamos ni
                  modificamos contenido en la ficha del comercio sin su
                  configuración o intervención directa.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Cómo usamos y protegemos estos datos
                </h2>
                <p className="mt-2">
                  Los datos se muestran únicamente al comercio dueño de la ficha, en
                  su panel privado dentro de MetricsField, y a nuestro equipo interno
                  para prestarle el servicio contratado. Se almacenan cifrados en
                  tránsito (HTTPS/TLS) y en reposo, en infraestructura de nube con
                  acceso restringido. No vendemos estos datos, no los usamos para
                  publicidad y no los compartimos con terceros.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Uso limitado (Limited Use) — datos de las APIs de Google
                </h2>
                <p className="mt-2">
                  El uso que MetricsField hace de la información recibida de las APIs
                  de Google se adhiere a la{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className="text-brand-fg underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Política de datos de usuario de los servicios de API de Google
                  </a>
                  , incluidos los requisitos de Uso Limitado (Limited Use). En
                  particular: solo usamos esos datos para proveer y mejorar las
                  funciones visibles del panel del comercio; no los transferimos a
                  terceros salvo para operar el servicio, por requerimiento legal o
                  con consentimiento explícito; no los usamos para publicidad; y
                  ninguna persona los lee salvo consentimiento, necesidad de
                  soporte, seguridad o cumplimiento legal.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Retención y eliminación
                </h2>
                <p className="mt-2">
                  Conservamos los datos mientras el comercio mantenga su servicio
                  activo. Al darse de baja, o a pedido del comercio, eliminamos sus
                  datos de Google de nuestros sistemas dentro de los 30 días.
                  También podés pedir la eliminación en cualquier momento
                  escribiéndonos al contacto de abajo.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Cómo revocar el acceso
                </h2>
                <p className="mt-2">
                  Cualquier comercio puede revocar el acceso de MetricsField a su
                  cuenta de Google en cualquier momento desde{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    className="text-brand-fg underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    myaccount.google.com/permissions
                  </a>
                  , o desde el botón de desconexión de su propio portal.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">Contacto</h2>
                <p className="mt-2">
                  Para consultas sobre esta política o para solicitar la
                  eliminación de tus datos, escribinos a{" "}
                  <a href="mailto:info@metricsfield.com" className="text-brand-fg underline underline-offset-2">
                    info@metricsfield.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </>
        }
        en={
          <>
            <h1 className="text-2xl font-semibold text-slate-900">Privacy Policy</h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className="text-base font-semibold text-slate-900">What is MetricsField</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) is an online reputation
                  management platform for local businesses in Córdoba, Argentina.
                  We help our clients earn reviews on Google and track the
                  performance of their Google Business Profile listing.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  What Google data we access, and why
                </h2>
                <p className="mt-2">
                  With the business&rsquo;s explicit authorization, through Google&rsquo;s
                  OAuth flow, we access only:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Their Google Business Profile listing data: rating, public
                    review count, and performance metrics (profile views, calls,
                    &ldquo;get directions&rdquo; requests) — scope{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">business.manage</code>.
                  </li>
                  <li>
                    For the MetricsField team&rsquo;s own access to the dashboard: the
                    email address and account name of whoever signs in (scopes{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">openid</code>,{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">email</code>,{" "}
                    <code className="rounded bg-slate-100 px-1 text-[13px]">profile</code>) —
                    solely to identify who performed each action.
                  </li>
                </ul>
                <p className="mt-2">
                  We do not access emails, contacts, files, or any other data from
                  the Google account. We do not publish or modify content on the
                  business&rsquo;s listing without their configuration or direct action.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  How we use and protect this data
                </h2>
                <p className="mt-2">
                  Data is shown only to the business that owns the listing, inside
                  their private MetricsField dashboard, and to our internal team in
                  order to deliver the contracted service. It is encrypted in
                  transit (HTTPS/TLS) and at rest, on cloud infrastructure with
                  restricted access. We do not sell this data, do not use it for
                  advertising, and do not share it with third parties.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Limited Use — Google API data
                </h2>
                <p className="mt-2">
                  MetricsField&rsquo;s use of information received from Google APIs
                  adheres to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className="text-brand-fg underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements. Specifically: we use
                  this data only to provide and improve the user-facing features of
                  the business dashboard; we do not transfer it to third parties
                  except to operate the service, comply with a legal requirement,
                  or with explicit consent; we do not use it for advertising; and
                  no person reads it except with consent, for support needs,
                  security, or legal compliance.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  Retention and deletion
                </h2>
                <p className="mt-2">
                  We retain data for as long as the business keeps its service
                  active. On cancellation, or at the business&rsquo;s request, we delete
                  their Google data from our systems within 30 days. Deletion can
                  also be requested at any time by writing to the contact below.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  How to revoke access
                </h2>
                <p className="mt-2">
                  Any business can revoke MetricsField&rsquo;s access to their Google
                  account at any time from{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    className="text-brand-fg underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    myaccount.google.com/permissions
                  </a>
                  , or from the disconnect button inside their own portal.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">Contact</h2>
                <p className="mt-2">
                  For questions about this policy, or to request deletion of your
                  data, write to{" "}
                  <a href="mailto:info@metricsfield.com" className="text-brand-fg underline underline-offset-2">
                    info@metricsfield.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </>
        }
      />
    </div>
  );
}
