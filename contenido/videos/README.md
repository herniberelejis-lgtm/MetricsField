# Videos de la fábrica de contenido

Cada carpeta es un proyecto de [HyperFrames](https://hyperframes.heygen.com)
(HTML que se renderiza a MP4). Se editan textos y fotos en
`compositions/*.html` y se vuelve a exportar:

```bash
cd contenido/videos/reviews
npx hyperframes@0.8.225 check                       # valida
npx hyperframes@0.8.225 snapshot --at 0,5,10        # cuadros para revisar
npx hyperframes@0.8.225 render -q delivery -o renders/reel.mp4
# volumen para redes (-14 LUFS):
ffmpeg -i renders/reel.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=7" -c:a aac -b:a 192k reel-ig.mp4
```

**Voz en off sin grabar:** se escribe el guion en `contenido/voz/<nombre>.json`,
se pushea a una rama `contenido/**` y el workflow "Voz en off"
(`scripts/contenido/voz.py`, GitHub Actions) deja una pista por línea con voces
argentinas (Microsoft es-AR Tomás / Elena; Piper Daniela de respaldo). Las
pistas se recortan de silencios y van como `<audio>` por escena en `index.html`.
`SPEC.md` de cada proyecto tiene el guion de tomas.
