export default function TapsMiniChart({ labels, nfcPorDia, qrPorDia, tieneSoporteQr }) {
  if (!labels?.length) {
    return <p className="muted small">Todavía no hay escaneos en los últimos 14 días.</p>;
  }

  const totales = labels.map((_, i) => (nfcPorDia[i] ?? 0) + (qrPorDia[i] ?? 0));
  const max = Math.max(1, ...totales);

  return (
    <div className="taps-mini">
      {labels.map((label, i) => {
        const total = totales[i];
        const nfc = nfcPorDia[i] ?? 0;
        const qr = qrPorDia[i] ?? 0;
        return (
          <div key={label} className="bar-row">
            <span className="bar-label">{label}</span>
            <div className="bar-track stacked">
              {tieneSoporteQr && qr > 0 && (
                <div className="bar-fill qr" style={{ width: `${(qr / max) * 100}%` }} title={`QR: ${qr}`} />
              )}
              {nfc > 0 && (
                <div className="bar-fill nfc" style={{ width: `${(nfc / max) * 100}%` }} title={`NFC: ${nfc}`} />
              )}
              {total === 0 && <div className="bar-fill empty" style={{ width: "2%" }} />}
            </div>
            <span className="bar-num">{total}</span>
          </div>
        );
      })}
      {tieneSoporteQr && (
        <p className="muted small chart-legend-inline">
          <span className="swatch nfc" /> NFC <span className="swatch qr" /> QR
        </p>
      )}
    </div>
  );
}
