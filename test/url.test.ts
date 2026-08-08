import { describe, it, expect } from "vitest";
import { urlSegura } from "@/lib/url";

// urlSegura es la única barrera entre lo que escribe un humano y lo que
// termina en location.replace()/<a href> de RedireccionSuave, en el mismo
// origen que la cookie de sesión de /admin. Cada caso de acá abajo que se
// ponga en verde de más es un XSS almacenado.

describe("esquemas peligrosos", () => {
  it("rechaza javascript: en todas sus formas", () => {
    for (const malo of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "  javascript:alert(1)  ",
      // control chars intercalados: se limpian y NO deben reconstruir un esquema válido
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\x00script:alert(1)",
    ]) {
      expect(urlSegura(malo), malo).toBeNull();
    }
  });

  it("rechaza data:, vbscript:, file: y otros esquemas", () => {
    for (const malo of [
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://algo/",
      "chrome://settings",
      "blob:https://x/abc",
      "mailto:a@b.com",
      "tel:+5493510000000",
    ]) {
      expect(urlSegura(malo), malo).toBeNull();
    }
  });
});

describe("URLs legítimas", () => {
  it("acepta http y https", () => {
    expect(urlSegura("https://g.page/r/CX_abc/review")).toBe("https://g.page/r/CX_abc/review");
    expect(urlSegura("http://mi-negocio.com.ar")).toBe("http://mi-negocio.com.ar");
  });

  it("acepta las URLs de reseña de Google que se usan de verdad", () => {
    for (const buena of [
      "https://search.google.com/local/writereview?placeid=ChIJabc123",
      "https://www.google.com/maps/place/?q=place_id:ChIJabc123",
      "https://g.page/r/CXyZ/review",
      "https://menu.ejemplo.com/carta?mesa=4&x=1",
    ]) {
      expect(urlSegura(buena), buena).toBe(buena);
    }
  });

  it("recorta espacios y limpia caracteres de control", () => {
    expect(urlSegura("  https://ejemplo.com  ")).toBe("https://ejemplo.com");
    expect(urlSegura("https://ejemplo.com\n")).toBe("https://ejemplo.com");
  });
});

describe("entradas vacías o rotas", () => {
  it("devuelve null sin explotar", () => {
    for (const malo of ["", "   ", "\n", "no-es-una-url", "http://", "://x", "https:/"]) {
      expect(urlSegura(malo), JSON.stringify(malo)).toBeNull();
    }
  });
});
