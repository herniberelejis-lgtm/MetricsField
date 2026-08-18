export default function Privacy() {
  return (
    <div className="legal-page">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: July 2026 · <a href="/terminos">Español</a></p>

      <section>
        <h2>What MetricsField is</h2>
        <p>
          MetricsField helps local businesses in Córdoba, Argentina manage their Google
          reputation. Merchants connect their own Google Business Profile from a private
          portal to view performance metrics.
        </p>
      </section>

      <section>
        <h2>Google user data</h2>
        <p>
          We access Google Business Profile data only after the merchant authorizes their own
          Google account. Data is used solely to display insights in that merchant&apos;s portal.
          We comply with the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>{" "}
          including Limited Use requirements.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions: contact the agency via WhatsApp from{" "}
          <a href="https://metricsfield.com">metricsfield.com</a>.
        </p>
      </section>

      <p className="muted">
        <a href="/">Home</a> · <a href="/terms">Terms</a>
      </p>
    </div>
  );
}
