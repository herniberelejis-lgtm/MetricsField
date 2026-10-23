# Fotos de los productos

Las fotos que se suben acá se usan en el sitio público (metricsfield.com).
El nombre del archivo dice qué pieza muestra:

| Archivo | Dónde aparece |
|---|---|
| `standee.jpg` | Tienda: Standee de mostrador |
| `tarjeta.jpg` | Tienda: Tarjeta PVC |
| `sticker.jpg` | Tienda: Sticker NFC |
| `local.jpg` | Página de Reputación: el cartel en uso en un local |

Sirve `.jpg`, `.jpeg`, `.png` o `.webp`. Mejor si la pieza está centrada:
se recortan a 4:3 buscando la parte más importante de la imagen.

Después de subirlas:

```bash
node scripts/landing/fotos.mjs     # optimiza a WebP en public/landing/assets/img/productos/
node scripts/landing/generar.mjs   # regenera las páginas usando las fotos
```
