# Fotos de la propuesta

Copiá acá las cuatro fotos de producto con estos nombres exactos
(se acepta `.png`, `.jpg`, `.jpeg`, `.webp` o `.avif`):

| Archivo | Foto |
|---|---|
| `01-expositor` | Expositor acrílico "Thanks for visiting" con NFC + QR, junto al teléfono en la pantalla de reseña de Google |
| `02-mesa-salon` | Placas NFC de reseña y de menú sobre la mesa de un salón |
| `03-mozo-tarjeta` | Mozo acercando la tarjeta PVC al teléfono de una clienta |
| `04-mesa-tendida` | Mesa tendida con los discos NFC de reseña y de menú |

Después correr, desde la raíz del repo:

```bash
python3 docs/propuestas/build-propuesta.py
```

El script reescribe `docs/propuestas/propuesta-pizzeria-popular.html` con las
fotos embebidas en base64. El HTML queda autocontenido: se abre sin conexión,
se manda por mail y se imprime a PDF (26 páginas A4) sin depender de nada externo.

Mientras falte alguna foto, el script inserta un marcador gris en su lugar y
avisa por consola cuáles faltan.
