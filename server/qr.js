const QRCode = require("qrcode");

async function generarQrPng(url) {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#10131a", light: "#ffffff" },
  });
}

function urlPublicaDeTap(slug, fallbackOrigin) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || fallbackOrigin).replace(/\/+$/, "");
  return `${base}/t/${slug}`;
}

module.exports = { generarQrPng, urlPublicaDeTap };
