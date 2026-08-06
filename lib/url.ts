// Valida que una URL cargada por un humano (admin o cliente) sea una URL
// bien formada antes de guardarla — evita que un typo quede pegado en un
// cartel NFC/QR ya impreso hasta que alguien lo note.
export function urlSegura(url: string): string | null {
  // eslint-disable-next-line no-control-regex
  const limpia = url.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!limpia) return null;
  try {
    new URL(limpia);
    return limpia;
  } catch {
    return null;
  }
}
