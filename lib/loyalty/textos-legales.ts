import crypto from "node:crypto";

// ⚠️ BORRADOR SIN VALIDAR POR UN ABOGADO — ver
// docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §9. Cubre lo que exige el
// art. 6 de la Ley 25.326 (finalidad, identidad del responsable, carácter
// voluntario, transferencia internacional, derechos) para que el
// formulario sea funcional desde el día uno, pero NO se lanza el piloto
// con consumidores reales hasta que un abogado revise el texto exacto y
// el anexo de tratamiento de datos con cada comercio.
//
// `VERSION_CONSENTIMIENTO_LOYALTY` viaja a loyalty.consentimientos.version
// en cada alta. Si el texto cambia de verdad (no un typo), esta constante
// TIENE que cambiar también — es lo que permite probar después qué
// versión exacta aceptó cada persona.

// CONEXIONES
//   Depende de:  nada.
//   Lo usan:     app/(loyalty)/l/[codigo]/actions.ts (hashTextoLegal +
//                textoLegalCompleto, para armar loyalty.consentimientos)
//                · components/loyalty/FormularioAlta.tsx (los textos que
//                se le muestran a la persona — copiados ahí a mano para
//                no importar un módulo server-only desde un componente
//                cliente; si el texto cambia, cambialo en LOS DOS lugares
//                y subí VERSION_CONSENTIMIENTO_LOYALTY).

export const VERSION_CONSENTIMIENTO_LOYALTY = "borrador-2026-09-19";

export function textoConsentimientoDatos(nombreComercio: string): string {
  return (
    `${nombreComercio} trata tus datos (nombre, teléfono y, si querés, email) ` +
    "para administrar tu tarjeta de puntos. Responder es voluntario, pero sin " +
    "nombre y teléfono no podemos emitirte la tarjeta. Tus datos se almacenan " +
    "en servidores fuera de la Argentina (Estados Unidos) y se comparten con " +
    "Google y Apple para emitir el pase en tu billetera digital. Podés acceder, " +
    "rectificar y suprimir tus datos gratuitamente desde tu tarjeta o escribiendo " +
    "a privacidad@metricsfield.com. La Agencia de Acceso a la Información Pública, " +
    "órgano de control de la Ley 25.326, puede atender tus reclamos."
  );
}

export const TEXTO_CONSENTIMIENTO_WALLET =
  "Vamos a emitirte un pase de fidelización a tu nombre en Google Wallet o Apple Wallet.";

export const TEXTO_CONSENTIMIENTO_MARKETING =
  "Quiero recibir novedades y promociones de este comercio (opcional, podés darte de baja cuando quieras).";

export const TEXTO_DECLARACION_EDAD = "Declaro que tengo 16 años o más.";

/** El texto legal EXACTO que se le mostró a la persona, concatenado en un
 * orden fijo. Su hash es lo que se guarda en
 * loyalty.consentimientos.texto_hash — sin esto no se puede probar qué
 * aceptó alguien si el texto cambió después. */
export function textoLegalCompleto(nombreComercio: string): string {
  return [
    textoConsentimientoDatos(nombreComercio),
    TEXTO_CONSENTIMIENTO_WALLET,
    TEXTO_CONSENTIMIENTO_MARKETING,
    TEXTO_DECLARACION_EDAD,
  ].join("\n");
}

export function hashTextoLegal(texto: string): Buffer {
  return crypto.createHash("sha256").update(texto, "utf8").digest();
}
