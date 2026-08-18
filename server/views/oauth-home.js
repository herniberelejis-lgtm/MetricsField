function oauthHomeHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MetricsField — Online reputation for local businesses</title>
<meta name="description" content="MetricsField helps local businesses in Córdoba, Argentina manage their Google reputation with NFC stands and a client portal.">
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#0f172a;line-height:1.6}
h1{font-size:1.5rem;margin:0 0 .5rem}
.brand{color:#2563eb;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.05em}
.muted{color:#64748b;font-size:.9rem}
a{color:#2563eb}
ul{padding-left:1.25rem}
</style>
</head>
<body>
<p class="brand">MetricsField</p>
<h1>Online reputation management for local businesses</h1>
<p class="muted">Córdoba, Argentina · metricsfield.com</p>

<p><strong>MetricsField</strong> (also shown as "Metrics Field" in some Google Console settings) is a platform that helps local merchants get more Google reviews and track their Business Profile performance.</p>

<h2>What the app does</h2>
<ul>
<li>NFC/QR stands send customers directly to the merchant's public Google review link</li>
<li>Merchants access a <strong>read-only private portal</strong> with their metrics (reviews, scans, rating)</li>
<li>Agency staff use an <strong>internal admin panel</strong> to manage clients</li>
</ul>

<h2>Google user data</h2>
<p>When a merchant connects their own Google account from the portal, MetricsField requests access to <strong>Google Business Profile</strong> data (profile performance metrics and, when approved, reviews) solely to display insights in that merchant's portal. We do not sell or use this data for advertising. See our <a href="/privacy">Privacy Policy</a>.</p>

<h2>Access</h2>
<p>Agency login: <a href="/login">/login</a> · Merchant portal: private link via WhatsApp (no public signup).</p>

<p class="muted" style="margin-top:2rem"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
</body>
</html>`;
}

module.exports = { oauthHomeHtml };
