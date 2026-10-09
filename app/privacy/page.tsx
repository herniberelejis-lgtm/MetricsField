import type { Metadata } from "next";
import type { ReactNode } from "react";
import LangSwitch from "@/components/legal/LangSwitch";

// Ver la nota en app/page.tsx: renderizado dinámico para que el nonce de la
// CSP (middleware.ts) coincida en cada visita.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de privacidad — MetricsField",
  description: "Cómo MetricsField usa los datos de Google Business Profile de sus clientes.",
  alternates: { canonical: "https://metricsfield.com/privacy" },
};

// Página requerida por la verificación OAuth de Google y por el pedido de
// acceso a las APIs de Business Profile: tiene que estar pública en el
// dominio de la app, linkeada desde la home, y declarar explícitamente el
// cumplimiento de la Google API Services User Data Policy (incluido
// "Limited Use"). No borrar esas secciones.
//
// Tiene que describir EXACTAMENTE lo que hace el código — Google la compara
// con lo que se declara en los formularios. Si cambia lo que la app hace con
// los datos de Google (lib/gbp.ts, lib/google-reviews.ts, lib/places.ts,
// lib/alertas.ts), se actualiza acá, en los dos idiomas.
//
// Bilingüe (toggle ES/EN, ver LangSwitch): el producto trabaja en español,
// pero esta es la URL pública que queda declarada en Google Cloud Console
// y la que se muestra en el video de verificación (grabado en inglés) — así
// que la misma URL tiene que poder mostrar el texto en inglés también, sin
// duplicar la política en una segunda URL.

const h2 = "text-base font-semibold text-slate-900";
const link = "text-brand-fg underline underline-offset-2";

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 text-[13px]">{children}</code>;
}

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <LangSwitch
        es={
          <>
            <h1 className="text-2xl font-semibold text-slate-900">Política de privacidad</h1>
            <p className="mt-2 text-sm text-slate-500">Última actualización: octubre de 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className={h2}>Qué es MetricsField</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) es una plataforma de gestión de
                  reputación online para comercios locales de Córdoba, Argentina.
                  Ayudamos a nuestros clientes a conseguir reseñas en Google, a
                  responderlas y a hacer seguimiento del rendimiento de su ficha de
                  Google Business Profile.
                </p>
              </section>

              <section>
                <h2 className={h2}>Por qué pedimos acceso a Google</h2>
                <p className="mt-2">
                  Cada comercio conecta su propia cuenta de Google Business Profile
                  desde su portal, con su autorización explícita (flujo OAuth de
                  Google, scope <Code>business.manage</Code>). Usamos ese acceso
                  para mostrarle sus reseñas y métricas en un panel privado, y para
                  publicar en Google las respuestas a reseñas que el propio
                  comercio aprueba.
                </p>
              </section>

              <section>
                <h2 className={h2}>Qué datos de Google accedemos y para qué</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    <strong>Cuentas y ubicaciones</strong> de Business Profile: para
                    identificar y vincular la ficha del comercio.
                  </li>
                  <li>
                    <strong>Reseñas</strong> de su ficha (nombre del autor,
                    estrellas, texto y fecha): para mostrárselas en su panel,
                    sugerirle una respuesta y avisarle por email cuando llega una
                    reseña que necesita respuesta.
                  </li>
                  <li>
                    <strong>Respuestas a reseñas:</strong> publicamos en Google solo
                    las respuestas que el comercio aprueba desde su panel, o las que
                    él mismo configuró para responder automáticamente a reseñas
                    positivas. Puede desactivar esa opción cuando quiera.
                  </li>
                  <li>
                    <strong>Métricas de rendimiento</strong> (visitas al perfil,
                    llamadas, solicitudes de &ldquo;cómo llegar&rdquo;): para
                    mostrarle su evolución mes a mes y enviarle un resumen mensual
                    por email.
                  </li>
                  <li>
                    <strong>Datos públicos de la ficha</strong> (calificación,
                    cantidad de reseñas y hasta 5 reseñas públicas), obtenidos de
                    Google Maps Platform: se muestran en vivo con la atribución de
                    Google y el texto de esas reseñas no se guarda.
                  </li>
                  <li>
                    Para el acceso del equipo interno de MetricsField a su propio
                    panel: la dirección de email y el nombre de la cuenta que inicia
                    sesión (scopes <Code>openid</Code>, <Code>email</Code>,{" "}
                    <Code>profile</Code>), solo para identificar quién realiza cada
                    acción.
                  </li>
                </ul>
                <p className="mt-2">
                  No modificamos los datos de la ficha (nombre, dirección, horarios,
                  fotos), no borramos reseñas y no filtramos ni desviamos reseñas
                  según su calificación: todos los clientes del comercio van al
                  mismo formulario público de Google. No accedemos a correos
                  electrónicos, contactos, archivos ni a ningún otro dato de la
                  cuenta de Google.
                </p>
              </section>

              <section>
                <h2 className={h2}>Cómo usamos y protegemos estos datos</h2>
                <p className="mt-2">
                  Los datos se muestran únicamente al comercio dueño de la ficha, en
                  su panel privado dentro de MetricsField, y a nuestro equipo interno
                  para prestarle el servicio contratado. Se transmiten cifrados
                  (HTTPS/TLS) y se almacenan en infraestructura de nube con acceso
                  restringido; el token de acceso a Google de cada comercio se
                  guarda cifrado. No vendemos estos datos, no los usamos para
                  publicidad y no los compartimos con terceros.
                </p>
              </section>

              <section>
                <h2 className={h2}>Personas que tocan el cartel</h2>
                <p className="mt-2">
                  Cuando alguien toca un cartel NFC o escanea un QR de MetricsField,
                  lo llevamos directo a dejar su reseña en Google. De esa visita
                  registramos solo la fecha y hora y el tipo de dispositivo
                  (navegador), para mostrarle al comercio cuántas veces se usó su
                  cartel. No guardamos en nuestra base su dirección IP ni datos
                  personales; la IP se usa solo de forma transitoria (minutos) para
                  frenar abusos. La reseña que
                  deje en Google se rige por la política de privacidad de Google.
                </p>
              </section>

              <section>
                <h2 className={h2}>Uso limitado (Limited Use) — datos de las APIs de Google</h2>
                <p className="mt-2">
                  El uso que MetricsField hace de la información recibida de las APIs
                  de Google se adhiere a la{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className={link}
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
                <h2 className={h2}>Retención y eliminación</h2>
                <p className="mt-2">
                  Conservamos los datos mientras el comercio mantenga su servicio
                  activo. Al darse de baja, o a pedido del comercio, eliminamos sus
                  datos de Google de nuestros sistemas dentro de los 30 días.
                  También podés pedir la eliminación en cualquier momento
                  escribiéndonos al contacto de abajo.
                </p>
              </section>

              <section>
                <h2 className={h2}>Cómo revocar el acceso</h2>
                <p className="mt-2">
                  Cualquier comercio puede revocar el acceso de MetricsField a su
                  cuenta de Google en cualquier momento desde{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    className={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    myaccount.google.com/permissions
                  </a>
                  , o desde el botón de desconexión de su propio portal.
                </p>
              </section>

              <section>
                <h2 className={h2}>Contacto</h2>
                <p className="mt-2">
                  Para consultas sobre esta política o para solicitar la
                  eliminación de tus datos, escribinos a{" "}
                  <a href="mailto:info@metricsfield.com" className={link}>
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
            <p className="mt-2 text-sm text-slate-500">Last updated: October 2026</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
              <section>
                <h2 className={h2}>What MetricsField Is</h2>
                <p className="mt-2">
                  MetricsField (metricsfield.com) is an online reputation
                  management platform for local businesses in Córdoba, Argentina.
                  We help our clients get Google reviews, reply to them, and track
                  the performance of their Google Business Profile listing.
                </p>
              </section>

              <section>
                <h2 className={h2}>Why MetricsField Requests Access to Google</h2>
                <p className="mt-2">
                  Each business connects its own Google Business Profile account
                  from its portal, with its explicit authorization (Google OAuth
                  flow, <Code>business.manage</Code> scope). We use that access to
                  show the business its reviews and metrics in a private
                  dashboard, and to publish on Google the review replies that the
                  business itself approves.
                </p>
              </section>

              <section>
                <h2 className={h2}>What Google Data We Access and Why</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    <strong>Business Profile accounts and locations:</strong> to
                    identify and link the business&rsquo;s listing.
                  </li>
                  <li>
                    <strong>Reviews</strong> on its listing (reviewer name, star
                    rating, text, and date): to display them in its dashboard,
                    suggest a reply, and notify the business by email when a review
                    needs a reply.
                  </li>
                  <li>
                    <strong>Review replies:</strong> we publish on Google only the
                    replies the business approves in its dashboard, or those it has
                    itself set up to send automatically to positive reviews. It can
                    turn that option off at any time.
                  </li>
                  <li>
                    <strong>Performance metrics</strong> (profile views, calls,
                    &ldquo;get directions&rdquo; requests): to show month-over-month
                    trends and send a monthly summary by email.
                  </li>
                  <li>
                    <strong>Public listing data</strong> (rating, review count, and
                    up to 5 public reviews) from Google Maps Platform: shown live
                    with Google attribution; the text of those reviews is not
                    stored.
                  </li>
                  <li>
                    For MetricsField internal team access to our admin panel: email
                    address and account name of the signing-in user (
                    <Code>openid</Code>, <Code>email</Code>, <Code>profile</Code>{" "}
                    scopes), solely to identify who performs each action.
                  </li>
                </ul>
                <p className="mt-2">
                  We do not edit listing information (name, address, hours,
                  photos), we do not delete reviews, and we do not filter or divert
                  reviews based on their rating: every customer of the business is
                  sent to the same public Google review form. We do not access
                  emails, contacts, files, or any other data in the Google account.
                </p>
              </section>

              <section>
                <h2 className={h2}>How We Use and Protect This Data</h2>
                <p className="mt-2">
                  Data is displayed solely to the business owning the listing,
                  within its private dashboard on MetricsField, and to our internal
                  team to provide the contracted service. Data is encrypted in
                  transit (HTTPS/TLS) and stored on restricted-access cloud
                  infrastructure; each business&rsquo;s Google access token is
                  stored encrypted. We do not sell this data, we do not use it for
                  advertising, and we do not share it with third parties.
                </p>
              </section>

              <section>
                <h2 className={h2}>People Who Tap the Display</h2>
                <p className="mt-2">
                  When someone taps a MetricsField NFC display or scans its QR code,
                  we send them straight to leave their review on Google. From that
                  visit we record only the date and time and the device type
                  (browser), to show the business how often its display is used. We
                  do not store their IP address or any personal data in our database;
                  the IP is used only transiently (minutes) to prevent abuse. The review they leave on Google
                  is governed by Google&rsquo;s privacy policy.
                </p>
              </section>

              <section>
                <h2 className={h2}>Limited Use — Google API Data</h2>
                <p className="mt-2">
                  MetricsField&rsquo;s use of information received from Google APIs
                  will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements. In particular: we only
                  use that data to provide and improve visible features on the
                  business dashboard; we do not transfer it to third parties except
                  to operate the service, as required by law, or with explicit
                  consent; we do not use it for advertising; and no human reads the
                  data unless consented, necessary for support, required for
                  security, or for legal compliance.
                </p>
              </section>

              <section>
                <h2 className={h2}>Retention and Deletion</h2>
                <p className="mt-2">
                  We retain data as long as the business maintains an active
                  service. Upon cancellation, or upon request, we delete its Google
                  data from our systems within 30 days. You may also request
                  deletion at any time by contacting us below.
                </p>
              </section>

              <section>
                <h2 className={h2}>How to Revoke Access</h2>
                <p className="mt-2">
                  Any business can revoke MetricsField&rsquo;s access to its Google
                  account at any time from{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    className={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    myaccount.google.com/permissions
                  </a>
                  , or using the disconnect button in its own portal.
                </p>
              </section>

              <section>
                <h2 className={h2}>Contact</h2>
                <p className="mt-2">
                  For inquiries regarding this policy or to request the deletion of
                  your data, write to us at{" "}
                  <a href="mailto:info@metricsfield.com" className={link}>
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
