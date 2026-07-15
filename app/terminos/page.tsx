import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de servicio — MetricsField",
  description: "Condiciones de uso de la plataforma y el hardware de MetricsField.",
};

// Página requerida por la verificación OAuth de Google (junto con
// /privacidad): pública en el dominio de la app y linkeada desde la home.
export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
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
            la actividad de su cartel, sus reseñas, el feedback privado de sus
            clientes y métricas de su ficha de Google Business Profile. Al
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
            reseñas genuinas. No escribimos, compramos ni fabricamos reseñas,
            y el acceso a dejar una reseña pública en Google está siempre
            disponible para cualquier cliente, sin importar su calificación —
            el formulario de feedback privado es una opción adicional, nunca
            un reemplazo. El comercio se compromete a no usar el servicio
            para prácticas contrarias a las políticas de contenido de Google.
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
            <a href="mailto:hola@metricsfield.com" className="text-brand-fg underline underline-offset-2">
              hola@metricsfield.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
