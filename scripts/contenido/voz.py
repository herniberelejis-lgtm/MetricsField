"""Genera la voz en off de un guion de contenido (contenido/voz/<nombre>.json).

Corre en GitHub Actions (.github/workflows/voz.yml): ahí hay salida a
internet para las voces neuronales argentinas (es-AR) que no hay en otros
entornos. Por cada voz del guion escribe una pista por línea (para
sincronizar cada escena) y sus duraciones en contenido/voz/<nombre>/.

Voces: "es-AR-TomasNeural" / "es-AR-ElenaNeural" (neuronales de Microsoft,
las más naturales) y "piper:es_AR-daniela-high" (Piper, libre, de respaldo).
Si una voz falla (el servicio la rechaza), se sigue con las demás y se avisa.

  python scripts/contenido/voz.py contenido/voz/reviews.json
"""

import asyncio
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import edge_tts

MODELOS_PIPER = Path("/tmp/piper-voces")


def duracion(archivo: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(archivo)],
        capture_output=True, text=True, check=True,
    )
    return round(float(salida.stdout.strip()), 3)


def piper(texto: str, modelo: str, archivo: Path) -> None:
    MODELOS_PIPER.mkdir(exist_ok=True)
    if not (MODELOS_PIPER / f"{modelo}.onnx").exists():
        # es_AR-daniela-high → es/es_AR/daniela/high/ en el repo de voces de Piper.
        idioma, nombre, calidad = modelo.split("-")
        base = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{idioma.split('_')[0]}/{idioma}/{nombre}/{calidad}/{modelo}"
        for ext in (".onnx", ".onnx.json"):
            urllib.request.urlretrieve(base + ext, MODELOS_PIPER / f"{modelo}{ext}")
    wav = archivo.with_suffix(".wav")
    subprocess.run(
        [sys.executable, "-m", "piper", "-m", str(MODELOS_PIPER / f"{modelo}.onnx"), "-f", str(wav), "--length-scale", "1.05", "--", texto],
        check=True,
    )
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-b:a", "160k", str(archivo)], check=True)
    wav.unlink()


async def una_linea(voz: str, linea: dict, guion: dict, archivo: Path) -> None:
    if voz.startswith("piper:"):
        piper(linea["texto"], voz.split(":", 1)[1], archivo)
        return
    com = edge_tts.Communicate(linea["texto"], voz, rate=guion.get("velocidad", "+0%"), pitch=guion.get("tono", "+0Hz"))
    await com.save(str(archivo))


async def generar(guion_path: str) -> None:
    guion = json.loads(Path(guion_path).read_text(encoding="utf-8"))
    destino = Path(guion_path).with_suffix("")
    destino.mkdir(parents=True, exist_ok=True)
    resumen = {"nombre": guion["nombre"], "voces": {}}
    for voz in guion["voces"]:
        carpeta = destino / voz.replace(":", "-")
        carpeta.mkdir(exist_ok=True)
        lineas = []
        try:
            for linea in guion["lineas"]:
                archivo = carpeta / f"{linea['id']}.mp3"
                await una_linea(voz, linea, guion, archivo)
                lineas.append({"id": linea["id"], "texto": linea["texto"], "archivo": str(archivo), "segundos": duracion(archivo)})
                print(f"{voz} · {linea['id']}: {lineas[-1]['segundos']} s")
        except Exception as e:  # noqa: BLE001 — una voz caída no frena a las otras
            print(f"AVISO: la voz {voz} falló: {e}")
            continue
        resumen["voces"][voz] = lineas
    (destino / "duraciones.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
    if not resumen["voces"]:
        sys.exit("Ninguna voz se pudo generar.")


if __name__ == "__main__":
    asyncio.run(generar(sys.argv[1]))
