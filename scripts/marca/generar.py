"""Genera los archivos de la marca MetricsField a partir de la geometría.

El isotipo son seis hexágonos de esquinas redondeadas, entrelazados como
eslabones: cada uno pasa por arriba de su vecino en un cruce y por abajo en
el otro. Acá se calcula como figuras rellenas (sin máscaras ni trazos), así
el mismo dibujo sirve para el favicon, un <img>, el SVG inline de la app y
la impresión. El logotipo es "METRICSFIELD" en Montserrat Bold convertido a
curvas, para que no dependa de tener la fuente instalada.

    pip install shapely fonttools brotli
    python3 scripts/marca/generar.py

Escribe public/brand/*.svg, app/icon.svg y lib/marca.ts. Los PNG, el
favicon.ico y la imagen para compartir los arma scripts/marca/rasterizar.mjs
a partir de estos SVG.
"""

import json
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from shapely import affinity
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

RAIZ = Path(__file__).resolve().parents[2]
TINTA = "#111111"

# ---- isotipo (unidades: las del dibujo original, ~800 de ancho) ----
R_ANILLO = 246  # centro del dibujo → centro de cada hexágono
R_HEX = 185  # radio de la línea media de cada hexágono (punta arriba)
ANCHO = 56  # grosor del trazo
RADIO_ESQUINA = 52  # redondeo de la línea media en cada vértice
SEPARACION = 7  # aire entre el eslabón de arriba y el de abajo


def hexagono(cx, cy):
    pts = [
        (cx + R_HEX * math.cos(math.radians(-90 + 60 * j)), cy + R_HEX * math.sin(math.radians(-90 + 60 * j)))
        for j in range(6)
    ]
    redondeado = Polygon(pts).buffer(-RADIO_ESQUINA, join_style="mitre").buffer(RADIO_ESQUINA, quad_segs=24)
    return redondeado.buffer(ANCHO / 2, quad_segs=24).difference(redondeado.buffer(-ANCHO / 2, quad_segs=24))


def isotipo():
    centros = [
        (R_ANILLO * math.cos(math.radians(-90 + 60 * i)), R_ANILLO * math.sin(math.radians(-90 + 60 * i))) for i in range(6)
    ]
    bandas = [hexagono(x, y) for x, y in centros]
    finales = list(bandas)
    for i in range(6):
        j = (i + 1) % 6
        cruces = bandas[i].intersection(bandas[j])
        partes = sorted(getattr(cruces, "geoms", [cruces]), key=lambda g: g.area, reverse=True)[:2]
        if len(partes) != 2:
            raise SystemExit(f"Esperaba dos cruces entre {i} y {j}, hay {len(partes)}")
        # Eslabones: en el cruce de afuera pasa por arriba el vecino (el
        # siguiente en sentido horario); en el de adentro, i. Así está en el
        # logo original.
        interno, externo = sorted(partes, key=lambda g: g.centroid.distance(Point(0, 0)))
        for zona, arriba, abajo in ((externo, j, i), (interno, i, j)):
            corte = bandas[arriba].buffer(SEPARACION, quad_segs=12).intersection(zona.buffer(ANCHO * 0.75))
            finales[abajo] = finales[abajo].difference(corte)
    # Simplificar a ~0,3 unidades (invisible a cualquier tamaño) achica el trazo.
    forma = unary_union(finales).simplify(0.3)
    minx, miny, maxx, maxy = forma.bounds
    return affinity.translate(forma, -minx, -miny), maxx - minx, maxy - miny


def a_path(geom, dec=1):
    """Polígonos de shapely → atributo d de SVG (huecos incluidos, evenodd)."""
    partes = []
    for poly in getattr(geom, "geoms", [geom]):
        for anillo in [poly.exterior, *poly.interiors]:
            c = list(anillo.coords)[:-1]
            partes.append("M" + "L".join(f"{x:.{dec}f} {y:.{dec}f}" for x, y in c) + "Z")
    return "".join(partes)


# ---- logotipo ----
def logotipo(texto="METRICSFIELD", tracking=0.035, peso=700):
    # El archivo es la Montserrat variable (arranca en peso 100): fijarle el peso.
    fuente = instancer.instantiateVariableFont(TTFont(RAIZ / "public/landing/assets/fonts/montserrat-700-latin.woff2"), {"wght": peso})
    glifos = fuente.getGlyphSet()
    cmap = fuente.getBestCmap()
    upm = fuente["head"].unitsPerEm
    alto_mayus = fuente["OS/2"].sCapHeight
    pen = SVGPathPen(glifos)
    x = 0
    for ch in texto:
        nombre = cmap[ord(ch)]
        # y hacia abajo y la línea de base en y = alto de mayúscula.
        glifos[nombre].draw(TransformPen(pen, (1, 0, 0, -1, x, alto_mayus)))
        x += glifos[nombre].width + tracking * upm
    ancho = x - tracking * upm
    return pen.getCommands(), ancho, alto_mayus


def svg(view_w, view_h, cuerpo, titulo, color=TINTA, estilo=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w:.0f} {view_h:.0f}" role="img" aria-label="{titulo}">'
        f"<title>{titulo}</title>{estilo}<g fill=\"{color}\" fill-rule=\"evenodd\">{cuerpo}</g></svg>\n"
    )


def main():
    forma, iw, ih = isotipo()
    d_iso = a_path(forma)
    d_txt, tw, th = logotipo()

    salida = RAIZ / "public/brand"
    salida.mkdir(parents=True, exist_ok=True)
    pad = 40

    # Isotipo solo.
    iso = f'<path transform="translate({pad} {pad})" d="{d_iso}"/>'
    for nombre, color in (("isotipo", TINTA), ("isotipo-blanco", "#ffffff")):
        (salida / f"{nombre}.svg").write_text(svg(iw + 2 * pad, ih + 2 * pad, iso, "MetricsField", color))

    # Logo vertical: isotipo arriba, palabra abajo (proporciones del original:
    # la palabra mide ~2,2 veces el ancho del isotipo).
    escala_txt = (iw * 2.2) / tw
    ancho_v = tw * escala_txt
    alto_txt = th * escala_txt
    sep = ih * 0.13
    W = ancho_v + 2 * pad
    H = ih + sep + alto_txt + 2 * pad
    cuerpo_v = (
        f'<path transform="translate({(W - iw) / 2:.1f} {pad})" d="{d_iso}"/>'
        f'<path fill-rule="nonzero" transform="translate({pad} {pad + ih + sep:.1f}) scale({escala_txt:.5f})" d="{d_txt}"/>'
    )
    for nombre, color in (("logo", TINTA), ("logo-blanco", "#ffffff")):
        (salida / f"{nombre}.svg").write_text(svg(W, H, cuerpo_v, "MetricsField", color))

    # Logo horizontal (navegación, documentos): palabra a la derecha, con la
    # altura de mayúscula en ~38% del alto del isotipo.
    escala_h = (ih * 0.38) / th
    gap = ih * 0.22
    Wh = iw + gap + tw * escala_h + 2 * pad
    Hh = ih + 2 * pad
    cuerpo_h = (
        f'<path transform="translate({pad} {pad})" d="{d_iso}"/>'
        f'<path fill-rule="nonzero" transform="translate({pad + iw + gap:.1f} {pad + (ih - th * escala_h) / 2:.1f}) scale({escala_h:.5f})" d="{d_txt}"/>'
    )
    for nombre, color in (("logo-horizontal", TINTA), ("logo-horizontal-blanco", "#ffffff")):
        (salida / f"{nombre}.svg").write_text(svg(Wh, Hh, cuerpo_h, "MetricsField", color))

    # Favicon: negro sobre claro y blanco cuando el navegador está en modo oscuro.
    estilo = f"<style>g{{fill:{TINTA}}}@media (prefers-color-scheme:dark){{g{{fill:#fff}}}}</style>"
    (RAIZ / "app/icon.svg").write_text(svg(iw + 2 * pad, ih + 2 * pad, iso, "MetricsField", TINTA, estilo))
    (RAIZ / "public/landing/assets/img/isotipo.svg").write_text(svg(iw + 2 * pad, ih + 2 * pad, iso, "MetricsField", TINTA, estilo))

    # Miniatura genérica de WhatsApp para el link de un cartel (la usa
    # app/api/og-resena cuando el comercio no tiene logo cargado).
    t1, w1, h1 = logotipo("¿Cómo te fue?", 0, 700)
    t2, w2, h2 = logotipo("Contanos en tu reseña de Google, te toma dos minutos", 0, 500)
    e1, e2 = 56 / h1 * 0.72 * 1.0, 26 / h2 * 0.72
    alto_iso = 150
    e_iso = alto_iso / ih
    og = (
        f'<rect width="1200" height="630" fill="#ffffff"/>'
        f'<path transform="translate({600 - iw * e_iso / 2:.1f} 118) scale({e_iso:.5f})" d="{d_iso}"/>'
        f'<path fill-rule="nonzero" transform="translate({600 - w1 * e1 / 2:.1f} 338) scale({e1:.5f})" d="{t1}"/>'
        f'<path fill-rule="nonzero" fill="#5e5e5e" transform="translate({600 - w2 * e2 / 2:.1f} 412) scale({e2:.5f})" d="{t2}"/>'
    )
    (salida / "og-resena.svg").write_text(svg(1200, 630, og, "¿Cómo te fue?"))

    # Para el componente de React (components/BrandMark.tsx).
    (RAIZ / "lib/marca.ts").write_text(
        "// Generado por scripts/marca/generar.py — no editar a mano.\n"
        "// Isotipo de MetricsField: seis hexágonos entrelazados, como figura rellena.\n"
        f"export const ISOTIPO_VIEWBOX = {json.dumps(f'0 0 {iw:.0f} {ih:.0f}')};\n"
        f"export const ISOTIPO_D = {json.dumps(d_iso)};\n"
        f"export const ISOTIPO_PROPORCION = {iw / ih:.4f}; // ancho / alto\n"
    )
    print(f"isotipo {iw:.0f}×{ih:.0f} · logotipo {tw:.0f}×{th:.0f} · {len(d_iso) // 1024} KB de trazo")


if __name__ == "__main__":
    main()
