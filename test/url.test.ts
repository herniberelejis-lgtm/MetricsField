import { describe, it, expect } from "vitest";
import { urlResenaGoogle, urlSegura } from "@/lib/url";

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

// Piezas autogestionadas (Mercado Libre): el comprador es anónimo, así que
// el destino solo puede ser Google — si no, /t/<id> sirve de redireccionador
// a cualquier sitio con nuestro dominio adelante.
describe("urlResenaGoogle", () => {
  it("acepta los links de reseña de Google", () => {
    for (const buena of [
      "https://g.page/r/CXyZ/review",
      "https://search.google.com/local/writereview?placeid=ChIJabc123",
      "https://www.google.com/maps/place/?q=place_id:ChIJabc123",
      "https://www.google.com.ar/search?q=mi+negocio",
      "https://maps.app.goo.gl/AbC123",
    ]) {
      expect(urlResenaGoogle(buena), buena).toBe(buena);
    }
  });

  it("rechaza cualquier otro sitio, aunque se parezca a Google", () => {
    for (const malo of [
      "https://phishing.example/login",
      "https://google.com.phishing.example/",
      "https://notgoogle.com/",
      "https://g.page.example/r/x",
      "https://google.com@phishing.example/",
      "https://usuario:clave@g.page/r/x",
      "http://g.page/r/x",
      "javascript:alert(1)",
      "",
    ]) {
      expect(urlResenaGoogle(malo), malo).toBeNull();
    }
  });
});

describe("urlResenaGoogle: páginas de Google que arma cualquiera", () => {
  it("rechaza sitios, formularios, scripts y redirecciones alojados en Google", () => {
    for (const malo of [
      "https://sites.google.com/view/pagina-falsa-banco",
      "https://docs.google.com/forms/d/e/xxx/viewform",
      "https://script.google.com/macros/s/xxx/exec",
      "https://www.google.com/url?q=https://malo.example&sa=D",
      "https://www.google.com/amp/s/malo.example/login",
      "https://translate.google.com/translate?u=https://malo.example",
      "https://drive.google.com/file/d/xxx/view",
      "https://goo.gl/abc123",
      "https://www.google.com/mapsfalso",
      "https://www.google.com:8443/maps/place/x",
    ]) {
      expect(urlResenaGoogle(malo), malo).toBeNull();
    }
  });

  it("sigue aceptando los links de reseña y de ficha reales", () => {
    for (const buena of [
      "https://g.page/r/CXyZ/review",
      "https://search.google.com/local/writereview?placeid=ChIJabc123",
      "https://www.google.com/maps/place/Mi+Negocio/@-31.4,-64.2,17z",
      "https://maps.google.com/?cid=1234567890",
      "https://goo.gl/maps/AbC123",
      "https://maps.app.goo.gl/AbC123",
      "https://www.google.com/search?q=mi+negocio#lrd=0x123:0x456,3",
    ]) {
      expect(urlResenaGoogle(buena), buena).toBe(buena);
    }
  });
});
