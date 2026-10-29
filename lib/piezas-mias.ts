// Piezas autogestionadas que se activaron o editaron desde este celular.
// Cuando su dueño (o el revendedor que las configura para cada local) vuelve
// a escanear una, en vez de saltar directo a Google le ofrecemos cambiar a
// dónde lleva: sin esto, el link "Editar" de la pantalla de redirección dura
// una fracción de segundo y nadie llega a tocarlo. Es solo una comodidad del
// navegador: cambiar algo sigue pidiendo el PIN.

const CLAVE = "mf-piezas-mias";
const MAXIMO = 300;

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function guardar(lista: string[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(-MAXIMO)));
  } catch {
    // Sin almacenamiento local (modo privado): al escanear va directo a Google.
  }
}

export function recordarPiezaMia(slug: string): void {
  guardar([...leer().filter((s) => s !== slug), slug]);
}

export function olvidarPiezaMia(slug: string): void {
  guardar(leer().filter((s) => s !== slug));
}

export function esPiezaMia(slug: string): boolean {
  return leer().includes(slug);
}
