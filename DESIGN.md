# DESIGN.md — Portal y tablero de MetricsField

Cómo se ve y cómo se construye la interfaz del portal del cliente
(`/portal/[codigo]`) y en especial su tablero (`components/portal/Tablero.tsx`,
`components/portal/GraficoMetricas.tsx`). Leelo antes de tocar cualquier
pantalla del portal: lo que está acá es el criterio, no una sugerencia.

Armado siguiendo cuatro guías de diseño de interfaces de trabajo: *taste-skill*
(estudio de 23 pantallas reales de producto), *Impeccable* (modo "Operate" y su
piso de calidad), *UI UX Pro Max* (texto resistente y accesibilidad) y el formato
de *awesome-design-md*.

## 1. Atmósfera

El portal es una herramienta que el dueño de un comercio abre para **entender y
decidir**, casi siempre desde el celular. Tranquilo, claro, confiable: el
protagonista es el dato del propio comercio, no el decorado. Tonos pastel,
superficies planas, una sola tipografía.

## 2. Color: cada color significa una sola cosa

| Rol | Valor | Dónde |
|---|---|---|
| Fondo | `#F4F5F7` / `slate-50` | El fondo de la página |
| Superficie | `#FFFFFF` | Tarjetas |
| Borde de tarjeta | `#E4E6EA` | 1px, sin sombra |
| Línea de fila | `#EEF0F3` | Separadores de tablas y listas |
| Texto | `#1A1A1A` (`slate-900`) | Títulos y cifras |
| Texto secundario | `#666666` (`slate-600`) | Subtítulos, etiquetas, ejes. **Nunca más claro**: `slate-500` (#8A8A8A) no llega a 4,5:1 |
| **Dato (el color del tablero)** | `#6F9BCF` línea · `#7FA7D3` barras · `#A9C5E6` medio · `#D9E6F4` suave | El dato principal de cada gráfico |
| Período anterior | `#B8BEC8` punteado | Comparación en el gráfico |
| Neutro de datos | `#D3D9E2` | Lo que no es el protagonista ("por su cuenta", competidores) |
| **"Vos"** | `#9B86DB` lavanda | Solo el propio comercio en el mapa. No se usa para nada más |
| Bien | texto `#0B5E40`, barra `#8FD1AE`, fondo `#EAF7F0` | Cambios para bien, elogios, respondidas |
| Para mejorar | texto `#8A3F00`, barra `#F4B886`, fondo `#FFF4E8` | Cambios para mal, quejas, sin responder |
| Enlaces y acción principal | `#1F4E80` | Links de texto y el botón principal (`btnPortal` en `components/ui.tsx`) |
| Elegido | fondo `#EEF4FB`, texto `#1F4E80` | Filtro, local o pestaña elegida (con anillo `#A9C5E6`) |
| Foco | `#4F7AA8`, contorno de 2px | `:focus-visible` en links y botones |

Reglas:

- **El color va en los datos, no en el decorado.** Nada de fondos de color en
  pestañas, botones o títulos. La pestaña elegida se marca con una línea de 2px.
- **Un gráfico, un tono.** Los colores de estado (verde, durazno) son solo para
  bien o mal. Nunca más de cuatro tonos en la pantalla.
- **El color dice bien o mal, no arriba o abajo.** Hoy todas las métricas mejoran
  al subir. Si se suma una que mejora al bajar, su ▼ va en verde.
- **Sin cambio o sin dato con qué comparar: guion gris (`—`).** Nunca "+100%"
  desde cero ni un 0 inventado. Si falta el dato, se dice qué falta.
- Las personas del equipo llevan un **tinte pálido propio** (identidad, no dato),
  separados unos 60° entre sí.
- **Calificación 1-5★** (única escala de varios tonos): de durazno a verde pastel,
  `RATING_PASTEL` en `lib/palette.ts`. Siempre con el número al lado o en el tooltip.
- En código, los colores de los gráficos salen de `PORTAL` en `lib/palette.ts`; no
  se escriben a mano.

## 3. Tipografía

- **Una sola familia: Montserrat** (la de la marca), en todo: títulos, cifras,
  etiquetas, ejes.
- **Cifras de ancho fijo** (`tabular-nums`) en todo el tablero, para que los
  números no bailen al cambiar el período.
- Tamaños: título de sección 15px/700 · cifra de métrica 26px/500 (600 la
  elegida) · cuerpo 13-14px · etiquetas y ejes 11-12px. Nada por debajo de 11px y
  ninguna cifra de 48px o más.
- Encabezados de tabla en **minúscula normal** (12px gris), no en MAYÚSCULAS
  espaciadas. Lo mismo para etiquetas de métricas y de secciones.
- Decimales con coma (`fmtDec` en `lib/format.ts`): "4,6 ★", nunca "4.6".

## 4. Componentes

- **Tarjeta:** blanca, borde de 1px `#E4E6EA`, radio de 16px (`rounded-2xl`),
  **sin sombra**. Una tarjeta nunca va dentro de otra.
- **Métricas (KPI):** una sola tarjeta dividida en celdas: etiqueta arriba,
  cifra abajo y el cambio contra el período anterior. **Sin íconos en círculos
  de color y sin mini-gráficos.** En el tablero cada métrica es una pestaña del
  gráfico; en el resto del portal se usa `components/portal/TiraMetricas.tsx`.
- **Gráficos SVG:** dibujan al ancho real de su tarjeta (`useAncho` en
  `components/charts/useAncho.ts`), así el texto de los ejes mide 11px de verdad
  también en el celular. Nunca un `viewBox` fijo que se achique.
- **Botones:** principal `btnPortal` (azul, sin sombra), secundario
  `btnPortalSec` (borde), terciario `btnPortalGhost`. 40px de alto como mínimo.
- **Listas largas** (reseñas): de a 10 con "Ver 10 más" y filtro arriba; nunca
  cientos de tarjetas de una vez.
- **Avisos:** lo que pide una acción va en "para mejorar" (fondo `#FFF4E8`, texto
  `#8A3F00`); lo que confirma, en "bien"; lo que informa, en nota. Nunca texto
  blanco sobre un fondo pastel.
- **Gráfico de línea:** línea recta de 2px, relleno del 8%, 3-4 líneas de
  grilla tenues, eje Y con cifras redondas desde 0, 4-6 fechas en el eje X sin
  rotar. Tooltip simple: fecha y valor.
- **Tortas:** anillo fino (3,5 sobre 42 de diámetro), total en el centro, sin
  etiquetas en las porciones. La leyenda es una lista con el % y el valor.
  Máximo tres porciones.
- **Barras:** fondo `#EEF0F3`, redondeadas, el largo es la proporción real.
- **Mapa de calor:** una escala de un solo tono, de `#F3F6FA` a `#8AAFD6`, con
  la referencia "Menos / Más".
- **Tablas:** filas separadas por una línea, sin franjas alternadas; números
  alineados a la derecha. En el celular, la tabla se desplaza dentro de su
  tarjeta y la página nunca se corre de costado.
- **Pastillas:** fondo pálido con texto oscuro del mismo tono, solo al lado de
  un valor.
- **Notas** (la lectura de un gráfico): fondo `#F4F7FB`, texto `slate-700`.

## 5. Layout

- Ancho del contenido: el que da el `PortalShell`. Separación entre tarjetas
  de 20px y relleno interno de 20px.
- Orden del tablero: período → métricas con gráfico → competencia y mapa |
  horarios y acciones → lo que dicen los clientes → tortas → conclusiones →
  reseñas | búsquedas y piezas → equipo.
- Las grillas siempre con `grid-cols-1` en el celular y `min-w-0` en las
  tarjetas, para que nada empuje el ancho de la página.

## 6. Profundidad

Plana. Sin sombras en lo que está quieto; la separación es una línea de 1px o un
cambio de tono. Sombra solo en lo que flota (menús, tooltips, la barra inferior
del celular). Nada de vidrio esmerilado (`backdrop-blur`) ni manchas de fondo.

Las secciones se arman con un encabezado suelto (título de 15px y una línea de
texto) y sus tarjetas debajo: **nunca una tarjeta dentro de otra**.

## 7. Sí y no

| Sí | No |
|---|---|
| El dato del propio comercio, con su número real | Ceros inventados, cifras de relleno |
| Decir qué falta ("Llega cuando conectes tu Google") | Ocultar un bloque sin explicación |
| "Desde que", "se asocia" | "Gracias a" (no podemos probar causa) |
| Una frase que lee el gráfico | Gráficos sin lectura |
| Grises de 4,5:1 o más | `slate-500` o más claro para texto |
| Un color = un significado | Lavanda para "vos" y además para "el cartel" |
| Íconos de línea, grises, solo donde ayudan | Íconos en círculos de color en cada tarjeta |
| Foco visible al navegar con teclado | Quitar el contorno de foco |
| Emoji: nunca | Emoji en títulos, etiquetas o estados vacíos |

## 8. Celular (390px)

- Métricas en grilla de 2 columnas.
- Todos los bloques a ancho completo, uno debajo del otro.
- Botones y links tocables de 44px de alto como mínimo.
- Verificar siempre a 390px que no haya scroll horizontal
  (`document.documentElement.scrollWidth` igual a 390).

## 9. Para quien lo toque (personas o agentes)

1. Colores y tamaños: de la tabla de arriba, no inventados.
2. Antes de subir: captura a 1440px y a 390px, y revisar contraste,
   desbordes y alineación.
3. Si una regla de acá molesta para algo nuevo, se cambia este archivo primero
   y después el código.
