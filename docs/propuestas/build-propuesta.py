#!/usr/bin/env python3
"""
Compila la propuesta corporativa de Pizzería Popular en un HTML autocontenido.

Toma la plantilla, embebe la tipografía Montserrat, los logos de MetricsField y
las cuatro fotos de producto como data URIs, y escribe un único archivo que se
abre sin conexión y se puede enviar por mail o imprimir a PDF.

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
PLANTILLA = ASSETS / "plantilla.html"
SALIDA = BASE / "propuesta-pizzeria-popular.html"

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


def main() -> int:
    if not PLANTILLA.exists():
        print(f"ERROR: falta la plantilla en {PLANTILLA}", file=sys.stderr)
        return 1

    html = PLANTILLA.read_text(encoding="utf-8")

    # Tipografía y logos: obligatorios, viven en assets/
    html = html.replace("__FONT_CSS__", (ASSETS / "montserrat-inline.css").read_text())
    for token, archivo in (
        ("__LOGO_BLANCO__", "logo-blanco.png"),
        ("__LOGO_NEGRO__", "logo-negro.png"),
        ("__ISO_NEGRO__", "iso-negro.png"),
        ("__ISO_BLANCO__", "iso-blanco.png"),
    ):
        if token in html:
            html = html.replace(token, data_uri(ASSETS / archivo))

    faltantes = []
    for token, (nombre, descripcion) in FOTOS.items():
        ruta = buscar_foto(nombre)
        if ruta:
            html = html.replace(token, data_uri(ruta))
            print(f"  ok  {token} -> img/{ruta.name} ({ruta.stat().st_size // 1024} KB)")
        else:
            html = html.replace(token, marcador(descripcion))
            faltantes.append(f"{nombre}{EXTENSIONES[0]}  ({descripcion})")

    SALIDA.write_text(html, encoding="utf-8")
    print(f"\nEscrito: {SALIDA.relative_to(BASE.parent.parent)}  "
          f"({SALIDA.stat().st_size // 1024} KB, autocontenido)")

    if faltantes:
        print("\nFaltan estas fotos en docs/propuestas/img/ :")
        for f in faltantes:
            print(f"  - {f}")
        print("Copialas ahí y volvé a correr el script para cerrar el archivo final.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
