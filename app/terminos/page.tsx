import type { Metadata } from "next";
import LangSwitch from "@/components/legal/LangSwitch";

export const metadata: Metadata = {
  title: "Términos de servicio — MetricsField",
  description: "Condiciones de uso de la plataforma y el hardware de MetricsField.",
};

// Página requerida por la verificación OAuth de Google (junto con
// /privacidad): pública en el dominio de la app y linkeada desde la home.
// Bilingüe (toggle ES/EN, ver LangSwitch) por el mismo motivo que
// /privacidad — misma URL pública, pero mostrable en inglés para el video
// de verificación.
export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <LangSwitch
        es={
          <>
            <h1 className="text-2xl font-semibold text-slate-900">Términos de servicio</h1>
            <p className="mt-2 text-sm text-slate-500">Última actualización: julio de 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className="text-base font-semibold text-slate-900">1. El servicio</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) ofrece a comercios locales: (a)
                  hardware físico con tecnología NFC y/o códigos QR que dirige a sus
                  clientes a dejar una reseña pública en Google; y (b) una
                  plataforma de software con un panel privado donde el comercio ve
                  la actividad de su cartel, sus reseñas y métricas de su ficha de
                  Google Business Profile. Al
                  contratar o usar cualquiera de los dos, aceptás estos términos.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">2. Acceso al portal</h2>
                <p className="mt-2">
                  El acceso al portal del comercio es mediante un link con código
                  privado. El comercio es responsable de no compartir ese link con
                  personas ajenas a su negocio; puede pedir su regeneración en
                  cualquier momento. Las piezas de hardware autogestionadas se
                  configuran con un PIN elegido por el comprador, quien es
                  responsable de conservarlo.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">3. Reseñas: qué hacemos y qué no</h2>
                <p className="mt-2">
                  MetricsField facilita que los clientes reales de un comercio dejen
                  reseñas genuinas. No escribimos, compramos ni fabricamos reseñas:
                  el cartel dirige a todos los clientes por igual, sin importar su
                  calificación, al mismo formulario público de reseñas de Google.
                  El comercio se compromete a no usar el servicio para prácticas
                  contrarias a las políticas de contenido de Google.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">4. Hardware</h2>
                <p className="mt-2">
                  El hardware vendido (standees, tarjetas, stickers) queda en
                  propiedad del comercio desde su compra. El destino al que dirige
                  cada pieza es configurable por software sin necesidad de
                  reimprimirla. La garantía cubre defectos de fabricación; no cubre
                  daño físico, pérdida o robo.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">5. Suscripción y pagos</h2>
                <p className="mt-2">
                  El software se ofrece por suscripción mensual, con el período de
                  prueba y precio comunicados al momento de contratar. La falta de
                  pago puede derivar en la suspensión del acceso al panel; el
                  hardware ya comprado sigue siendo del comercio y sigue
                  funcionando como redirección básica.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">6. Datos</h2>
                <p className="mt-2">
                  El tratamiento de datos personales y de los datos obtenidos de
                  las APIs de Google está descripto en nuestra{" "}
                  <a href="/privacidad" className="text-brand-fg underline underline-offset-2">
                    Política de privacidad
                  </a>
                  . El comercio puede revocar el acceso a su cuenta de Google y
                  pedir la eliminación de sus datos en cualquier momento.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">7. Responsabilidad</h2>
                <p className="mt-2">
                  MetricsField no controla ni garantiza el comportamiento de
                  plataformas de terceros (Google, Meta, etc.), incluidos cambios en
                  sus políticas, APIs o el tratamiento que hagan de la ficha del
                  comercio. El servicio se presta &ldquo;como está&rdquo;, con el
                  mejor esfuerzo razonable de disponibilidad y soporte. Nuestra
                  responsabilidad total frente al comercio se limita a los montos
                  abonados por el servicio en los últimos 3 meses.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">8. Cambios y contacto</h2>
                <p className="mt-2">
                  Podemos actualizar estos términos; los cambios relevantes se
                  comunican por los canales habituales del servicio. Estos términos
                  se rigen por las leyes de la República Argentina, con jurisdicción
                  en los tribunales ordinarios de la ciudad de Córdoba. Consultas:{" "}
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
            <h1 className="text-2xl font-semibold text-slate-900">Terms of Service</h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className="text-base font-semibold text-slate-900">1. The service</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) provides local businesses with:
                  (a) physical hardware using NFC technology and/or QR codes that
                  directs their customers to leave a public review on Google; and
                  (b) a software platform with a private dashboard where the
                  business can see their sign&rsquo;s activity, their reviews, and
                  their Google Business Profile metrics. By purchasing or using
                  either, you accept these terms.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">2. Portal access</h2>
                <p className="mt-2">
                  Access to the business portal is via a link with a private code.
                  The business is responsible for not sharing that link with anyone
                  outside their business, and may request it be regenerated at any
                  time. Self-managed hardware pieces are set up with a PIN chosen by
                  the buyer, who is responsible for keeping it safe.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">3. Reviews: what we do and don&rsquo;t do</h2>
                <p className="mt-2">
                  MetricsField helps a business&rsquo;s real customers leave genuine
                  reviews. We do not write, buy, or fabricate reviews: the sign
                  directs every customer equally, regardless of their rating, to
                  the same public Google review form. The business agrees not to
                  use the service for practices that violate Google&rsquo;s content
                  policies.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">4. Hardware</h2>
                <p className="mt-2">
                  Purchased hardware (standees, cards, stickers) becomes the
                  property of the business at the time of purchase. Each piece&rsquo;s
                  destination is configurable via software without needing to
                  reprint it. The warranty covers manufacturing defects; it does
                  not cover physical damage, loss, or theft.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">5. Subscription and payments</h2>
                <p className="mt-2">
                  The software is offered as a monthly subscription, with the
                  trial period and price communicated at signup. Non-payment may
                  result in suspension of dashboard access; already-purchased
                  hardware remains the business&rsquo;s property and keeps working as a
                  basic redirect.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">6. Data</h2>
                <p className="mt-2">
                  Handling of personal data, and of data obtained from Google
                  APIs, is described in our{" "}
                  <a href="/privacidad" className="text-brand-fg underline underline-offset-2">
                    Privacy Policy
                  </a>
                  . The business may revoke access to their Google account and
                  request deletion of their data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">7. Liability</h2>
                <p className="mt-2">
                  MetricsField does not control or guarantee the behavior of
                  third-party platforms (Google, Meta, etc.), including changes to
                  their policies, APIs, or how they handle the business&rsquo;s
                  listing. The service is provided &ldquo;as is,&rdquo; with
                  reasonable best-effort availability and support. Our total
                  liability to the business is limited to amounts paid for the
                  service in the last 3 months.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">8. Changes and contact</h2>
                <p className="mt-2">
                  We may update these terms; material changes are communicated
                  through the service&rsquo;s usual channels. These terms are governed
                  by the laws of the Argentine Republic, with jurisdiction in the
                  ordinary courts of the city of Córdoba. Inquiries:{" "}
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
