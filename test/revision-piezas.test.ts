import { describe, it, expect } from "vitest";
import { hayQueAvisar, leerRevision, siguienteRevision } from "@/lib/revision-piezas-core";

// La revisión semanal avisa cuando una pieza lleva a una ficha de Google
// cerrada o borrada. Avisar de más es spam a los dueños todas las semanas;
// de menos, piezas rotas que nadie arregla.

const lunes = new Date("2026-11-02T12:00:00Z");
const otroLunes = new Date("2026-11-09T12:00:00Z");

describe("cuándo avisar", () => {
  it("avisa la primera vez que la ficha aparece cerrada o borrada", () => {
    expect(hayQueAvisar(null, "cerrada")).toBe(true);
    expect(hayQueAvisar(null, "no_encontrada")).toBe(true);
    expect(hayQueAvisar(siguienteRevision(null, "ok", lunes), "cerrada_temporal")).toBe(true);
  });
  it("no repite el aviso todas las semanas por el mismo problema", () => {
    const antes = siguienteRevision(null, "cerrada", lunes);
    expect(hayQueAvisar(antes, "cerrada")).toBe(false);
  });
  it("avisa de nuevo si el problema cambia (cerrada temporal → cerrada)", () => {
    expect(hayQueAvisar(siguienteRevision(null, "cerrada_temporal", lunes), "cerrada")).toBe(true);
  });
  it("nunca avisa cuando está bien", () => {
    expect(hayQueAvisar(null, "ok")).toBe(false);
    expect(hayQueAvisar(siguienteRevision(null, "cerrada", lunes), "ok")).toBe(false);
  });
});

describe("lo que se guarda", () => {
  it("conserva desde cuándo está así si no cambió", () => {
    const a = siguienteRevision(null, "cerrada", lunes);
    const b = siguienteRevision(a, "cerrada", otroLunes);
    expect(b.desde).toBe(lunes.toISOString());
    expect(b.revisado).toBe(otroLunes.toISOString());
  });
  it("reinicia la fecha cuando cambia el estado", () => {
    const a = siguienteRevision(null, "cerrada", lunes);
    expect(siguienteRevision(a, "ok", otroLunes).desde).toBe(otroLunes.toISOString());
  });
  it("lee lo guardado y descarta basura sin romper", () => {
    const a = siguienteRevision(null, "no_encontrada", lunes);
    expect(leerRevision(JSON.stringify(a))).toEqual(a);
    for (const malo of [null, "", "{", '{"estado":"inventado"}', "[]"]) expect(leerRevision(malo)).toBeNull();
  });
});
