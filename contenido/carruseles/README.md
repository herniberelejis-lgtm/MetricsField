# Carruseles de Instagram

Cada carrusel es un `.json` en `piezas/` y `generar.mjs` lo dibuja con el manual
de marca: solo Montserrat, blanco/negro, azul niebla `#C8D8E8` solo para el dato,
sin sombras ni degradés, misma grilla en todas las láminas. Sale en PNG de
1080×1350 (4:5, el formato que más pantalla ocupa en el feed).

```bash
node contenido/carruseles/generar.mjs        # todos
node contenido/carruseles/generar.mjs p04    # uno
```

Tipos de lámina: `cifra` (número gigante), `item` (01/02/03 + título + texto),
`comparativa` (dos fichas, la del dato en azul) y la común (título + texto +
acción). `"fondo": "negro"` para portada o cierre, `"pie"` para la firma con el
isotipo y `**palabra**` resalta.

## Captions

### P04 · Por qué 4,8 no cuenta toda la historia
Dos locales con 4,8. Uno está creciendo y el otro, en problemas. 👀
El puntaje es el resultado; lo que lo sostiene es el volumen, la actividad
reciente y cómo respondés. Deslizá y fijate en cuál de los dos estás.
👉 Comentá CHECK y te decimos qué mirar en tu perfil de Google.
📍 Córdoba, Argentina
#reseñasgoogle #comerciolocal #córdoba #marketinglocal #emprendedoresargentinos

### P01 · Qué es MetricsField
Tu negocio genera datos todos los días: reseñas, ventas, clientes que vuelven.
MetricsField los mide para que decidas mejor. Tres soluciones, una sola marca:
Reviews, Retail y Loyalty. 📍 Hecho en Córdoba.
👉 Comentá DEMO y te mostramos la que te sirve.
#comerciolocal #córdoba #métricas #emprendedoresargentinos #pymes
