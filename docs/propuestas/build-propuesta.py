#!/usr/bin/env python3
"""
Compila las propuestas comerciales en HTML autocontenidos.

Toma cada plantilla de assets/, le inyecta la hoja de estilos de marca, la
tipografía Montserrat, los logos de MetricsField y las fotos de producto como
data URIs, y escribe un único archivo por documento que se abre sin conexión y
se puede enviar por mail o imprimir a PDF.

Documentos que compila:
    propuesta-pizzeria-popular.html   Cadena de franquicias Pizzería Popular
    propuesta-agencia-marketing.html  Alianza estratégica B2B con agencia

Uso:
    python3 docs/propuestas/build-propuesta.py

Las fotos se leen de docs/propuestas/img/ con estos nombres:
    01-expositor.png   Expositor acrílico "Thanks for visiting" + teléfono
    02-mesa-salon.png  Placas NFC de reseña y menú sobre la mesa del salón
    03-mozo-tarjeta.png  Mozo acercando la tarjeta PVC al teléfono del cliente
    04-mesa-tendida.png  Mesa tendida con los discos NFC de reseña y menú

Se acepta cualquier extensión (.png/.jpg/.jpeg/.webp). Si una foto falta, se
inserta un marcador neutro y el script avisa por consola: el HTML igual queda
completo y navegable.
"""

import base64
import mimetypes
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
ASSETS = BASE / "assets"
IMG = BASE / "img"
# (plantilla, salida) de cada documento que se compila
DOCUMENTOS = [
    ("plantilla-pizzeria.html", "propuesta-pizzeria-popular.html"),
    ("plantilla-agencia.html", "propuesta-agencia-marketing.html"),
]

FOTOS = {
    "__FOTO_1__": ("01-expositor", "Expositor acrílico Thanks for visiting"),
    "__FOTO_2__": ("02-mesa-salon", "Placas NFC sobre la mesa del salón"),
    "__FOTO_3__": ("03-mozo-tarjeta", "Mozo entregando la tarjeta PVC"),
    "__FOTO_4__": ("04-mesa-tendida", "Mesa tendida con discos NFC"),
}

EXTENSIONES = (".png", ".jpg", ".jpeg", ".webp", ".avif")


def data_uri(ruta: Path) -> str:
    tipo = mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
    return f"data:{tipo};base64,{base64.b64encode(ruta.read_bytes()).decode()}"


def marcador(texto: str) -> str:
    """SVG neutro en gris de marca, para cuando falta una foto."""
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">'
        '<rect width="1200" height="900" fill="#EAEAEA"/>'
        '<text x="600" y="440" text-anchor="middle" fill="#7A7A7A" '
        'font-family="Montserrat,sans-serif" font-size="30" '
        'letter-spacing="3">FOTOGRAFÍA PENDIENTE</text>'
        f'<text x="600" y="492" text-anchor="middle" fill="#9A9A9A" '
        f'font-family="Montserrat,sans-serif" font-size="24">{texto}</text>'
        "</svg>"
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


def buscar_foto(base_nombre: str) -> Path | None:
    for ext in EXTENSIONES:
        cand = IMG / f"{base_nombre}{ext}"
        if cand.exists():
            return cand
    return None


def compilar(plantilla: Path, salida: Path, faltantes: set) -> None:
    html = plantilla.read_text(encoding="utf-8")

    # Hoja de estilos de marca y tipografía: compartidas por todos los documentos
    css = (ASSETS / "marca.css").read_text(encoding="utf-8")
    css = css.replace("__FONT_CSS__", (ASSETS / "montserrat-inline.css").read_text())
    html = html.replace("__MARCA_CSS__", css)

    for token, archivo in (
        ("__LOGO_BLANCO__", "logo-blanco.png"),
        ("__LOGO_NEGRO__", "logo-negro.png"),
        ("__ISO_NEGRO__", "iso-negro.png"),
        ("__ISO_BLANCO__", "iso-blanco.png"),
    ):
        if token in html:
            html = html.replace(token, data_uri(ASSETS / archivo))

    for token, (nombre, descripcion) in FOTOS.items():
        if token not in html:
            continue
        ruta = buscar_foto(nombre)
        if ruta:
            html = html.replace(token, data_uri(ruta))
        else:
            html = html.replace(token, marcador(descripcion))
            faltantes.add(f"{nombre}{EXTENSIONES[0]}  ({descripcion})")

    salida.write_text(html, encoding="utf-8")
    print(f"  {salida.name}  ({salida.stat().st_size // 1024} KB, autocontenido)")


def main() -> int:
    faltantes: set = set()
    print("Compilando propuestas:")
    for nombre_plantilla, nombre_salida in DOCUMENTOS:
        plantilla = ASSETS / nombre_plantilla
        if not plantilla.exists():
            print(f"ERROR: falta la plantilla {plantilla}", file=sys.stderr)
            return 1
        compilar(plantilla, BASE / nombre_salida, faltantes)

    if faltantes:
        print("\nFaltan estas fotos en docs/propuestas/img/ :")
        for f in sorted(faltantes):
            print(f"  - {f}")
        print("Copialas ahí y volvé a correr el script para cerrar los archivos finales.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
