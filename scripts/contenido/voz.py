"""Genera la voz en off de un guion de contenido (contenido/voz/<nombre>.json).

Corre en GitHub Actions (.github/workflows/voz.yml): ahí hay salida a
internet para las voces neuronales argentinas (es-AR) que no hay en otros
entornos. Por cada voz del guion escribe una pista por línea (para
sincronizar cada escena) y sus duraciones en contenido/voz/<nombre>/.

  python scripts/contenido/voz.py contenido/voz/reviews.json
"""

import asyncio
import json
import subprocess
import sys
from pathlib import Path

import edge_tts


def duracion(archivo: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(archivo)],
        capture_output=True, text=True, check=True,
    )
    return round(float(salida.stdout.strip()), 3)


async def generar(guion_path: str) -> None:
    guion = json.loads(Path(guion_path).read_text(encoding="utf-8"))
    destino = Path(guion_path).with_suffix("")
    destino.mkdir(parents=True, exist_ok=True)
    resumen = {"nombre": guion["nombre"], "voces": {}}
    for voz in guion["voces"]:
        carpeta = destino / voz
        carpeta.mkdir(exist_ok=True)
        lineas = []
        for linea in guion["lineas"]:
            archivo = carpeta / f"{linea['id']}.mp3"
            com = edge_tts.Communicate(
                linea["texto"], voz, rate=guion.get("velocidad", "+0%"), pitch=guion.get("tono", "+0Hz")
            )
            await com.save(str(archivo))
            lineas.append({"id": linea["id"], "texto": linea["texto"], "archivo": str(archivo), "segundos": duracion(archivo)})
            print(f"{voz} · {linea['id']}: {lineas[-1]['segundos']} s")
        resumen["voces"][voz] = lineas
    (destino / "duraciones.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(generar(sys.argv[1]))
