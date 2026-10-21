import { describe, expect, it } from "vitest";
import { firmarUrl, urlMapaEstatico } from "@/lib/mapa";

describe("mapa de la zona (Maps Static API)", () => {
  it("firma la URL como lo documenta Google", () => {
    // Ejemplo de la documentación de firma de URLs de Google Maps Platform.
    expect(firmarUrl("/maps/api/geocode/json?address=New+York&client=clientID", "vNIXE0xscrmjlyV-12Nj_BvUPaw=")).toBe(
      "chaRF2hTJKOScPr-RQCEhZbSzIE=",
    );
  });

  it("marca al comercio en lavanda y a cada competidor con su número", () => {
    const url = new URL(
      urlMapaEstatico(
        [
          { lat: -31.42, lng: -64.18, propio: true },
          { lat: -31.421234567, lng: -64.19, etiqueta: "1" },
          { lat: -31.43, lng: -64.2, etiqueta: "Café" }, // etiqueta inválida: va sin etiqueta
        ],
        { key: "CLAVE" },
      ),
    );
    expect(url.origin + url.pathname).toBe("https://maps.googleapis.com/maps/api/staticmap");
    expect(url.searchParams.getAll("markers")).toEqual([
      "color:0x9B86DB|-31.420000,-64.180000",
      "color:0x6F9BCF|label:1|-31.421235,-64.190000",
      "color:0x6F9BCF|-31.430000,-64.200000",
    ]);
    expect(url.searchParams.get("key")).toBe("CLAVE");
    expect(url.searchParams.get("center")).toBeNull();
    expect(url.searchParams.get("signature")).toBeNull();
  });

  it("con un solo punto se centra en él; con secreto, la firma va al final", () => {
    const texto = urlMapaEstatico([{ lat: -31.42, lng: -64.18, propio: true }], { key: "CLAVE", secreto: "vNIXE0xscrmjlyV-12Nj_BvUPaw=" });
    const url = new URL(texto);
    expect(url.searchParams.get("center")).toBe("-31.420000,-64.180000");
    expect(url.searchParams.get("zoom")).toBe("15");
    const [sinFirma, firma] = texto.split("&signature=");
    expect(firma).toBe(firmarUrl(sinFirma.replace("https://maps.googleapis.com", ""), "vNIXE0xscrmjlyV-12Nj_BvUPaw="));
  });
});
