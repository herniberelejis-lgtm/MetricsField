import "server-only";
import QRCode from "qrcode";

/** Genera el PNG de un QR real que codifica la URL dada — se usa para el
 * link NFC de cada cliente (/t/<slug>), listo para imprimir en el standee
 * físico o compartir por WhatsApp. */
export async function generarQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#10131a", light: "#ffffff" },
  });
}
