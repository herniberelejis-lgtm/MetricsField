import type { Metadata } from "next";
import LangSwitch from "@/components/legal/LangSwitch";

export const metadata: Metadata = {
  title: "Términos de servicio — MetricsField",
  description: "Condiciones de uso de la plataforma y el hardware de MetricsField.",
};

// Página requerida por la verificación OAuth de Google (junto con
// /privacy): pública en el dominio de la app y linkeada desde la home.
// Bilingüe (toggle ES/EN, ver LangSwitch) por el mismo motivo que
// /privacy — misma URL pública, pero mostrable en inglés para el video
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
                  <a href="/privacy" className="text-brand-fg underline underline-offset-2">
                    Política de privacidad
                  </a>
                  . El comercio puede revocar el acceso a su cuenta de Google y
                  pedir la eliminación de sus datos en cualquier momento.
                </p>
                <p className="mt-2">
                  Al darse de baja, o a pedido del comercio, eliminamos de forma
                  permanente e irreversible la cuenta y todos los datos
                  asociados — reseñas, métricas mensuales, links y actividad de
                  hardware NFC, competidores, checklist SEO, audits GEO y el
                  acceso al portal — dentro de los 30 días. El hardware físico
                  ya entregado (standees, tarjetas, stickers) no se ve afectado:
                  sigue siendo propiedad del comercio.
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
                <h2 className="text-base font-semibold text-slate-900">1. The Service</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) provides local businesses with:
                  (a) physical hardware featuring NFC technology and/or QR codes
                  that direct customers to leave a public review on Google; and
                  (b) a software platform with a private dashboard where the
                  business can view its display activity, reviews, and metrics
                  from its Google Business Profile. By purchasing or using either
                  service, you accept these terms.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">2. Portal Access</h2>
                <p className="mt-2">
                  Access to the business portal is via a link with a private code.
                  The business is responsible for not sharing this link with
                  unauthorized persons; it may request a new link at any time.
                  Self-managed hardware units are configured with a PIN chosen by
                  the buyer, who is responsible for safeguarding it.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">3. Reviews: What We Do and What We Don&rsquo;t Do</h2>
                <p className="mt-2">
                  MetricsField helps real customers of a business leave genuine
                  reviews. We do not write, buy, or generate fake reviews: the
                  display directs all customers equally, regardless of their
                  rating, to the same public Google review form. The business
                  agrees not to use the service for practices contrary to
                  Google&rsquo;s content policies.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">4. Hardware</h2>
                <p className="mt-2">
                  Hardware sold (standees, cards, stickers) becomes the property
                  of the business upon purchase. The destination URL each piece
                  directs to is configurable via software without needing to
                  reprint. The warranty covers manufacturing defects; it does not
                  cover physical damage, loss, or theft.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">5. Subscription and Payments</h2>
                <p className="mt-2">
                  The software is provided on a monthly subscription basis, with
                  the trial period and pricing communicated at the time of
                  sign-up. Non-payment may result in suspension of access to the
                  dashboard; purchased hardware remains the property of the
                  business and continues to function as a basic redirect.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">6. Data</h2>
                <p className="mt-2">
                  The handling of personal data and data obtained from Google APIs
                  is described in our{" "}
                  <a href="/privacy" className="text-brand-fg underline underline-offset-2">
                    Privacy Policy
                  </a>
                  . The business may revoke access to its Google account and
                  request the deletion of its data at any time.
                </p>
                <p className="mt-2">
                  On cancellation, or at the business&rsquo;s request, we
                  permanently and irreversibly delete the account and all
                  associated data — reviews, monthly metrics, NFC hardware
                  links and activity, competitors, SEO checklist, GEO audits,
                  and portal access — within 30 days. Physical hardware already
                  delivered (standees, cards, stickers) is not affected: it
                  remains the business&rsquo;s property.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">7. Liability</h2>
                <p className="mt-2">
                  MetricsField does not control or guarantee the operation of
                  third-party platforms (Google, Meta, etc.), including changes to
                  their policies, APIs, or how they handle the business listing.
                  The service is provided &ldquo;as is&rdquo;, with best
                  reasonable effort regarding availability and support. Our total
                  liability to the business is limited to the amounts paid for the
                  service in the last 3 months.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-slate-900">8. Changes and Contact</h2>
                <p className="mt-2">
                  We may update these terms; relevant changes will be communicated
                  through the usual service channels. These terms are governed by
                  the laws of the Republic of Argentina, subject to the
                  jurisdiction of the ordinary courts of the city of Córdoba.
                  Inquiries:{" "}
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
